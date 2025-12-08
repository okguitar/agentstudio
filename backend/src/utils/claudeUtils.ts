/**
 * Claude Utils - Shared utilities for Claude Code SDK integration
 * 
 * This module provides common functions for interacting with Claude Code SDK,
 * used by both the main agents API and Slack integration.
 */

import { Options } from '@anthropic-ai/claude-agent-sdk';
import { SystemPrompt, PresetSystemPrompt } from '../types/agents.js';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getDefaultVersionId, getAllVersionsInternal, getVersionByIdInternal } from '../services/claudeVersionStorage.js';
import { integrateA2AMcpServer } from '../services/a2a/a2aIntegration.js';
import { MCP_SERVER_CONFIG_FILE } from '../config/paths.js';

const execAsync = promisify(exec);

/**
 * Get the path to the Claude executable
 * Prefers global installation over local node_modules
 */
export async function getClaudeExecutablePath(): Promise<string | null> {
  try {
    const { stdout: claudePath } = await execAsync('which claude');
    if (!claudePath) return null;

    const cleanPath = claudePath.trim();

    // Skip local node_modules paths - we want global installation
    if (cleanPath.includes('node_modules/.bin')) {
      try {
        const { stdout: allClaudes } = await execAsync('which -a claude');
        const claudes = allClaudes.trim().split('\n');

        // Find the first non-local installation
        for (const claudePathOption of claudes) {
          if (!claudePathOption.includes('node_modules/.bin')) {
            return claudePathOption.trim();
          }
        }
      } catch (error) {
        // Fallback to the first path found
      }
    }

    return cleanPath;
  } catch (error) {
    console.error('Failed to get claude executable path:', error);
    return null;
  }
}

/**
 * Read MCP (Model Context Protocol) configuration
 */
export function readMcpConfig(): { mcpServers: Record<string, any> } {
  if (fs.existsSync(MCP_SERVER_CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MCP_SERVER_CONFIG_FILE, 'utf-8'));
    } catch (error) {
      console.error('Failed to parse MCP configuration:', error);
      return { mcpServers: {} };
    }
  }
  return { mcpServers: {} };
}

/**
 * Get default Claude version environment variables
 */
export async function getDefaultClaudeVersionEnv(): Promise<Record<string, string> | null> {
  try {
    const defaultVersionId = await getDefaultVersionId();
    if (defaultVersionId) {
      console.log(`🔍 Found default Claude version: ${defaultVersionId}`);

      const allVersions = await getAllVersionsInternal();
      const defaultVersion = allVersions.find(v => v.id === defaultVersionId);

      if (defaultVersion && defaultVersion.environmentVariables) {
        console.log(`🎯 Using default Claude version: ${defaultVersion.name} (${defaultVersion.alias})`);

        // Log all environment variables
        const envKeys = Object.keys(defaultVersion.environmentVariables);
        console.log(`📝 Environment variables from default version:`, envKeys);

        // Log proxy-related variables
        const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy', 'ALL_PROXY', 'all_proxy'];
        const configuredProxyVars = proxyVars.filter(key => defaultVersion.environmentVariables![key]);
        if (configuredProxyVars.length > 0) {
          console.log(`🌐 Proxy variables in default version:`, configuredProxyVars.reduce((acc, key) => {
            acc[key] = defaultVersion.environmentVariables![key];
            return acc;
          }, {} as Record<string, string>));
        }

        // Check if this version has API keys configured
        const hasApiKey = defaultVersion.environmentVariables.ANTHROPIC_API_KEY ||
          defaultVersion.environmentVariables.OPENAI_API_KEY ||
          defaultVersion.environmentVariables.ANTHROPIC_AUTH_TOKEN;

        if (hasApiKey) {
          console.log(`✅ Default Claude version has API key configured`);
          return defaultVersion.environmentVariables;
        } else {
          console.log(`⚠️ No API keys found in default version environment variables`);
        }
      }
    }

    console.log(`⚠️ No default Claude version with API keys found`);
    return null;
  } catch (error) {
    console.error('❌ Error getting default Claude version:', error);
    return null;
  }
}

/**
 * Build query options for Claude Code SDK
 * This is the enhanced version from agents.ts with full MCP support
 * 
 * @param agent - Agent configuration
 * @param projectPath - Optional project path override
 * @param mcpTools - Optional MCP tools to enable
 * @param permissionMode - Optional permission mode override
 * @param model - Optional model override
 * @param claudeVersion - Optional Claude version ID
 * @param defaultEnv - Optional default environment variables (used by Slack integration)
 * @param userEnv - Optional user-provided environment variables (from chat interface)
 */
export async function buildQueryOptions(
  agent: any,
  projectPath?: string,
  mcpTools?: string[],
  permissionMode?: string,
  model?: string,
  claudeVersion?: string,
  defaultEnv?: Record<string, string>,
  userEnv?: Record<string, string>
): Promise<Options> {
  // Determine working directory
  let cwd = process.cwd();
  if (projectPath) {
    cwd = projectPath;
  } else if (agent.workingDirectory) {
    cwd = path.resolve(process.cwd(), agent.workingDirectory);
  }

  // Determine permission mode: request > agent config > default
  let finalPermissionMode = 'default';
  if (permissionMode) {
    finalPermissionMode = permissionMode;
  } else if (agent.permissionMode) {
    finalPermissionMode = agent.permissionMode;
  }

  // Determine model: request > agent config > default (sonnet)
  let finalModel = 'sonnet';
  if (model) {
    finalModel = model;
  } else if (agent.model) {
    finalModel = agent.model;
  }

  // Build allowed tools list from agent configuration
  const allowedTools = agent.allowedTools
    .filter((tool: any) => tool.enabled)
    .map((tool: any) => tool.name);

  // Add MCP tools if provided
  if (mcpTools && mcpTools.length > 0) {
    allowedTools.push(...mcpTools);
  }

  // Get Claude executable path and environment variables based on version
  let executablePath: string | null = null;
  let environmentVariables: Record<string, string> = {};

  try {
    // First check if agent has a specific Claude version
    const agentClaudeVersion = claudeVersion || agent.claudeVersionId;

    if (agentClaudeVersion) {
      // Use specified version
      const selectedVersion = await getVersionByIdInternal(agentClaudeVersion);
      if (selectedVersion) {
        if (selectedVersion.executablePath) {
          executablePath = selectedVersion.executablePath.trim();
        } else {
          executablePath = await getClaudeExecutablePath();
        }
        environmentVariables = selectedVersion.environmentVariables || {};
        console.log(`🎯 Using specified Claude version: ${selectedVersion.alias} (${executablePath})`);
      } else {
        console.warn(`⚠️ Specified Claude version not found: ${agentClaudeVersion}, falling back to default`);
        executablePath = await getClaudeExecutablePath();
      }
    } else {
      // Use default version or provided default environment
      if (defaultEnv) {
        // Slack integration or other callers can provide default env
        console.log(`🎯 Using provided default environment variables`);
        environmentVariables = defaultEnv;
        executablePath = await getClaudeExecutablePath();
      } else {
        // Standard flow: get default version from configuration
        const defaultVersionId = await getDefaultVersionId();
        if (defaultVersionId) {
          const defaultVersion = await getVersionByIdInternal(defaultVersionId);
          if (defaultVersion) {
            if (defaultVersion.executablePath) {
              executablePath = defaultVersion.executablePath;
            } else {
              executablePath = await getClaudeExecutablePath();
            }
            environmentVariables = defaultVersion.environmentVariables || {};
            console.log(`🎯 Using default Claude version: ${defaultVersion.alias} (${executablePath})`);

            // Log environment variables details
            const envVarKeys = Object.keys(environmentVariables);
            if (envVarKeys.length > 0) {
              console.log(`📝 Environment variables loaded from version config:`, envVarKeys);
              // Log proxy-related variables specifically
              const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy', 'ALL_PROXY', 'all_proxy'];
              const loadedProxyVars = proxyVars.filter(key => environmentVariables[key]);
              if (loadedProxyVars.length > 0) {
                console.log(`🌐 Proxy variables detected:`, loadedProxyVars.reduce((acc, key) => {
                  acc[key] = environmentVariables[key];
                  return acc;
                }, {} as Record<string, string>));
              } else {
                console.log(`🌐 No proxy variables found in environment variables`);
              }
            } else {
              console.log(`⚠️ No environment variables configured for this version`);
            }
          } else {
            executablePath = await getClaudeExecutablePath();
          }
        } else {
          executablePath = await getClaudeExecutablePath();
        }
      }
    }
  } catch (error) {
    console.error('Failed to get Claude executable path:', error);
    executablePath = await getClaudeExecutablePath();
  }

  console.log(`🎯 Using Claude executable path: ${executablePath}`);

  const queryOptions: Options = {
    systemPrompt: agent.systemPrompt, // 直接使用 Agent 配置中的 systemPrompt
    allowedTools,
    maxTurns: agent.maxTurns,
    cwd,
    permissionMode: finalPermissionMode as any,
    model: finalModel,
    settingSources: ["user", "project"],
  };

  // Only add pathToClaudeCodeExecutable if we have a valid path
  if (executablePath) {
    queryOptions.pathToClaudeCodeExecutable = executablePath;
  }

  // Always merge environment variables with process.env
  // This ensures critical variables like PATH, etc. are available
  // Priority: userEnv > environmentVariables (from version/default) > process.env
  queryOptions.env = { ...process.env, ...environmentVariables, ...userEnv };

  // Normalize proxy variables: if uppercase is set, also set lowercase (and vice versa)
  // This ensures proxy settings work regardless of which form the client library checks first
  const proxyNormalizations = [
    ['HTTP_PROXY', 'http_proxy'],
    ['HTTPS_PROXY', 'https_proxy'],
    ['NO_PROXY', 'no_proxy'],
    ['ALL_PROXY', 'all_proxy']
  ];

  for (const [upper, lower] of proxyNormalizations) {
    if (environmentVariables[upper] && !environmentVariables[lower]) {
      // If uppercase is configured but lowercase isn't, set lowercase to match
      queryOptions.env[lower] = environmentVariables[upper];
    } else if (environmentVariables[lower] && !environmentVariables[upper]) {
      // If lowercase is configured but uppercase isn't, set uppercase to match
      queryOptions.env[upper] = environmentVariables[lower];
    }
  }

  if (Object.keys(environmentVariables).length > 0) {
    // Log final proxy configuration that will be used
    const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy', 'ALL_PROXY', 'all_proxy'];
    const finalProxyVars = proxyVars.filter(key => queryOptions.env?.[key]);

    // Log API keys presence (but not values)
    const apiKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_AUTH_TOKEN'];
    const configuredApiKeys = apiKeys.filter(key => queryOptions.env?.[key]);
    if (configuredApiKeys.length > 0) {
      console.log(`🔑 API keys configured:`, configuredApiKeys);
    }
  } else {
    console.log(`🌍 Using process environment variables (no custom variables defined)`);
  }

  // Add MCP configuration if MCP tools are selected
  if (mcpTools && mcpTools.length > 0) {
    try {
      const mcpConfigContent = readMcpConfig();

      // Extract unique server names from mcpTools
      const serverNames = new Set<string>();
      for (const tool of mcpTools) {
        // Tool format: mcp__serverName__toolName or mcp__serverName
        const parts = tool.split('__');
        if (parts.length >= 2 && parts[0] === 'mcp') {
          serverNames.add(parts[1]);
        }
      }

      // Build mcpServers configuration
      const mcpServers: Record<string, any> = {};
      for (const serverName of serverNames) {
        const serverConfig = mcpConfigContent.mcpServers?.[serverName];
        if (serverConfig && serverConfig.status === 'active') {
          if (serverConfig.type === 'http') {
            mcpServers[serverName] = {
              type: 'http',
              url: serverConfig.url
            };
          } else if (serverConfig.type === 'stdio') {
            mcpServers[serverName] = {
              type: 'stdio',
              command: serverConfig.command,
              args: serverConfig.args || [],
              env: serverConfig.env || {}
            };
          }
        }
      }

      if (Object.keys(mcpServers).length > 0) {
        queryOptions.mcpServers = mcpServers;
        console.log('🔧 MCP Servers configured:', Object.keys(mcpServers));
      }
    } catch (error) {
      console.error('Failed to parse MCP configuration:', error);
    }
  }

  // Integrate A2A SDK MCP server
  // We use the determined project path or current working directory
  const currentProjectId = projectPath || cwd;
  await integrateA2AMcpServer(queryOptions, currentProjectId);

  return queryOptions;
}

