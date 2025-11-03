/**
 * Slack AI Service
 *
 * Adapts AgentStudio's AI architecture for Slack
 * Reuses sessionManager, AgentStorage, and Claude Code SDK
 * WITHOUT modifying existing SSE implementation
 */

import { Options } from '@anthropic-ai/claude-code';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { sessionManager } from './sessionManager.js';
import { AgentStorage } from './agentStorage.js';
import { slackThreadMapper } from './slackThreadMapper.js';
import { slackSessionLock } from './slackSessionLock.js';
import { SlackClient } from './slackClient.js';
import { getDefaultVersionId, getAllVersionsInternal } from './claudeVersionStorage.js';
import type { SlackMessageEvent, SlackAppMentionEvent } from '../types/slack.js';

const execAsync = promisify(exec);

/**
 * Helper function to get Claude executable path (copied from agents.ts)
 */
async function getClaudeExecutablePath(): Promise<string | null> {
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
 * Build query options for Claude (copied and adapted from agents.ts)
 */
async function buildQueryOptions(agent: any, projectPath?: string, mcpTools?: string[], permissionMode?: string, model?: string, defaultEnv?: Record<string, string>): Promise<Options> {
  let cwd = process.cwd();
  if (projectPath) {
    cwd = projectPath;
  } else if (agent.workingDirectory) {
    cwd = path.resolve(process.cwd(), agent.workingDirectory);
  }

  // Determine permission mode
  let finalPermissionMode = 'default';
  if (permissionMode) {
    finalPermissionMode = permissionMode;
  } else if (agent.permissionMode) {
    finalPermissionMode = agent.permissionMode;
  }

  // Determine model
  let finalModel = 'sonnet';
  if (model) {
    finalModel = model;
  } else if (agent.model) {
    finalModel = agent.model;
  }

  // Build allowed tools list
  const allowedTools = agent.allowedTools
    .filter((tool: any) => tool.enabled)
    .map((tool: any) => tool.name);

  if (mcpTools && mcpTools.length > 0) {
    allowedTools.push(...mcpTools);
  }

  const executablePath = await getClaudeExecutablePath();
  console.log(`🎯 Using Claude executable path: ${executablePath}`);

  const queryOptions: any = {
    appendSystemPrompt: agent.systemPrompt,
    allowedTools,
    maxTurns: agent.maxTurns,
    cwd,
    permissionMode: finalPermissionMode as any,
    model: finalModel,
  };

  if (executablePath) {
    queryOptions.pathToClaudeCodeExecutable = executablePath;
  }

  // Apply environment variables from Claude version if available
  // This is needed for different Claude versions with different API keys or configurations
  try {
    let versionEnv: Record<string, string> | null = null;

    // First try agent-specific Claude version
    const claudeVersionId = agent.claudeVersionId;
    if (claudeVersionId) {
      const versionConfigPath = path.join(os.homedir(), '.claude-agent', 'claude-versions.json');
      if (fs.existsSync(versionConfigPath)) {
        const config = JSON.parse(fs.readFileSync(versionConfigPath, 'utf8'));
        const version = config.versions?.find((v: any) => v.id === claudeVersionId);

        if (version?.environmentVariables) {
          console.log(`🔧 Applying environment variables for agent-specific Claude version: ${version.name}`);
          versionEnv = version.environmentVariables;
        }
      }
    }

    // If no agent-specific version, try default version
    if (!versionEnv && defaultEnv) {
      console.log(`🔧 Applying environment variables from default Claude version`);
      versionEnv = defaultEnv;
    }

    // Apply the environment variables
    if (versionEnv) {
      // Merge with existing process.env to ensure critical variables are preserved
      queryOptions.env = { ...process.env, ...versionEnv };
    }
  } catch (error) {
    console.error('Failed to apply Claude version environment variables:', error);
  }

  return queryOptions;
}

/**
 * Read MCP config (copied from agents.ts)
 */
const readMcpConfig = () => {
  const mcpConfigPath = path.join(os.homedir(), '.claude-agent', 'mcp-server.json');
  if (fs.existsSync(mcpConfigPath)) {
    try {
      return JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
    } catch (error) {
      console.error('Failed to parse MCP configuration:', error);
      return { mcpServers: {} };
    }
  }
  return { mcpServers: {} };
};

/**
 * Get default Claude version environment variables
 */
async function getDefaultClaudeVersionEnv(): Promise<Record<string, string> | null> {
  try {
    const defaultVersionId = await getDefaultVersionId();
    if (defaultVersionId) {
      console.log(`🔍 Found default Claude version: ${defaultVersionId}`);

      const allVersions = await getAllVersionsInternal();
      const defaultVersion = allVersions.find(v => v.id === defaultVersionId);

      if (defaultVersion && defaultVersion.environmentVariables) {
        console.log(`🎯 Using default Claude version: ${defaultVersion.name} (${defaultVersion.alias})`);

        // Check if this version has API keys configured
        const hasApiKey = defaultVersion.environmentVariables.ANTHROPIC_API_KEY ||
                         defaultVersion.environmentVariables.OPENAI_API_KEY ||
                         defaultVersion.environmentVariables.ANTHROPIC_AUTH_TOKEN;

        if (hasApiKey) {
          console.log(`✅ Default Claude version has API key configured`);
          return defaultVersion.environmentVariables;
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
 * Parse agent from message text
 * Supports agent mention, agent name, or agent ID
 */
function parseAgentFromMessage(text: string, allAgents: any[]): { agentId: string; cleanText: string } | null {
  // Remove the bot mention if present
  let cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim();
  
  // Check for agent mention format: @agent-name or agent-name
  const agentMentionMatch = cleanText.match(/^@?([a-zA-Z0-9\-_]+)\s+(.+)/);
  if (agentMentionMatch) {
    const potentialAgentId = agentMentionMatch[1];
    const remainingText = agentMentionMatch[2].trim();
    
    // First try exact match with agent ID
    let agent = allAgents.find(a => a.id.toLowerCase() === potentialAgentId.toLowerCase());
    
    // Then try name match
    if (!agent) {
      agent = allAgents.find(a => a.name.toLowerCase().includes(potentialAgentId.toLowerCase()) || 
                                     potentialAgentId.toLowerCase().includes(a.name.toLowerCase()));
    }
    
    // Finally try to match with common aliases
    if (!agent) {
      const aliases: { [key: string]: string } = {
        'ppt': 'ppt-editor',
        'slides': 'ppt-editor',
        'presentation': 'ppt-editor',
        'powerpoint': 'ppt-editor',
        'code': 'code-assistant',
        'coding': 'code-assistant',
        'developer': 'code-assistant',
        'programmer': 'code-assistant',
        'document': 'document-writer',
        'docs': 'document-writer',
        'writing': 'document-writer',
        'writer': 'document-writer',
        'general': 'general-chat',
        'chat': 'general-chat',
        'assistant': 'general-chat',
        'help': 'general-chat'
      };
      
      const aliasId = aliases[potentialAgentId.toLowerCase()];
      if (aliasId) {
        agent = allAgents.find(a => a.id === aliasId);
      }
    }
    
    if (agent && agent.enabled) {
      return { agentId: agent.id, cleanText: remainingText };
    }
  }
  
  return null;
}

/**
 * Get available agents list for Slack response
 */
function getAvailableAgentsList(allAgents: any[]): string {
  const enabledAgents = allAgents.filter(a => a.enabled);
  return enabledAgents.map(agent => `• **${agent.name}** (\`${agent.id}\`) - ${agent.description}`).join('\n');
}

/**
 * Slack AI Service - Main adapter class
 */
export class SlackAIService {
  private slackClient: SlackClient;
  private agentStorage: AgentStorage;
  private defaultAgentId: string;

  constructor(botToken: string, defaultAgentId: string = 'general-chat') {
    this.slackClient = new SlackClient(botToken);
    this.agentStorage = new AgentStorage();
    this.defaultAgentId = defaultAgentId;
  }

  /**
   * Handle incoming Slack message
   */
  async handleMessage(event: SlackMessageEvent | SlackAppMentionEvent): Promise<void> {
    try {
      console.log('📨 Received Slack message:', {
        channel: event.channel,
        user: event.user,
        text: event.text.substring(0, 50),
        thread_ts: event.thread_ts || event.ts
      });

      // Determine thread_ts (use thread_ts if exists, otherwise message ts)
      const threadTs = event.thread_ts || event.ts;

      // Get or create session mapping
      let sessionId = slackThreadMapper.getSessionId(threadTs, event.channel);
      let currentAgentId: string | null = null;

      // Get all available agents
      const allAgents = this.agentStorage.getAllAgents();
      const enabledAgents = allAgents.filter((agent: any) => agent.enabled);

      // Parse agent from message
      const agentSelection = parseAgentFromMessage(event.text, enabledAgents);
      
      if (agentSelection) {
        currentAgentId = agentSelection.agentId;
        console.log(`🎯 Selected agent: ${currentAgentId} from message`);
      } else if (sessionId) {
        // Reuse existing agent from session
        const existingSession = sessionManager.getSession(sessionId);
        if (existingSession) {
          currentAgentId = existingSession.getAgentId();
          console.log(`♻️  Reusing agent from existing session: ${currentAgentId}`);
        }
      }

      // If no agent found, try to use default agent
      if (!currentAgentId) {
        // Try to use default agent
        const defaultAgent = this.agentStorage.getAgent(this.defaultAgentId);
        if (defaultAgent && defaultAgent.enabled) {
          currentAgentId = this.defaultAgentId;
          console.log(`🔧 Using default agent: ${currentAgentId}`);
        } else {
          // If default agent is not available, show available agents list
          const agentsList = getAvailableAgentsList(allAgents);
          await this.slackClient.postMessage({
            channel: event.channel,
            text: `🤖 **请选择你想要使用的AI助手：**\n\n${agentsList}\n\n📝 **使用方法：**\n• 直接提及：\`@机器人 ppt-editor 请帮我创建幻灯片\`\n• 或使用别名：\`@机器人 ppt 请帮我创建幻灯片\`\n• 通用对话：\`@机器人 general 随便聊聊\``,
            thread_ts: threadTs
          });
          return;
        }
      }

      // Get agent configuration
      const agent = this.agentStorage.getAgent(currentAgentId);
      if (!agent) {
        await this.slackClient.postMessage({
          channel: event.channel,
          text: `❌ Agent **${currentAgentId}** not found.`,
          thread_ts: threadTs
        });
        return;
      }

      if (!agent.enabled) {
        await this.slackClient.postMessage({
          channel: event.channel,
          text: `⚠️ Agent **${agent.name}** is currently disabled.`,
          thread_ts: threadTs
        });
        return;
      }

      // Send "thinking" placeholder
      const agentDisplayName = agent.ui.icon ? `${agent.ui.icon} ${agent.name}` : agent.name;
      const placeholderMsg = await this.slackClient.postMessage({
        channel: event.channel,
        text: `🤔 ${agentDisplayName} 正在思考...`,
        thread_ts: threadTs
      });

      console.log(`📍 Posted placeholder message: ${placeholderMsg.ts}`);

      // Get default Claude version environment variables
      const defaultClaudeEnv = await getDefaultClaudeVersionEnv();

      // Build query options with default environment variables
      const queryOptions = await buildQueryOptions(agent, undefined, undefined, undefined, undefined, defaultClaudeEnv || undefined);

      // Get or create Claude session
      let claudeSession = sessionId ? sessionManager.getSession(sessionId) : null;

      if (!claudeSession) {
        // Create new session
        claudeSession = sessionManager.createNewSession(currentAgentId, queryOptions);
        console.log(`🆕 Created new Claude session for Slack thread: ${threadTs}`);
      } else {
        console.log(`♻️  Reusing existing Claude session: ${sessionId}`);
      }

      // 检查会话是否被锁定（文件锁机制）
      let finalSessionId = claudeSession.getClaudeSessionId() || sessionId;

      if (finalSessionId) {
        const lockStatus = slackSessionLock.isSessionLocked(finalSessionId, true);

        if (lockStatus.locked) {
          console.log(`⚠️  Session ${finalSessionId} is locked (${lockStatus.reason}), returning busy message`);

          await this.slackClient.updateMessage({
            channel: event.channel,
            ts: placeholderMsg.ts,
            text: `🚦 ${agentDisplayName} 正在处理其他消息，请稍后再试...`
          });

          return;
        }
      }

      // 尝试获取会话锁
      let lockAcquired = false;
      if (finalSessionId) {
        lockAcquired = slackSessionLock.tryAcquireLock(finalSessionId, {
          sessionId: finalSessionId,
          threadTs,
          channel: event.channel,
          agentId: currentAgentId
        });

        if (!lockAcquired) {
          console.log(`⚠️  Failed to acquire lock for session ${finalSessionId}, returning busy message`);

          await this.slackClient.updateMessage({
            channel: event.channel,
            ts: placeholderMsg.ts,
            text: `🚦 ${agentDisplayName} 正在处理其他消息，请稍后再试...`
          });

          return;
        }

        console.log(`🔒 Acquired lock for session ${finalSessionId}`);
      }

      // Build user message with cleaned text (remove agent mention)
      const messageText = agentSelection ? agentSelection.cleanText : event.text;
      const userMessage = {
        type: "user" as const,
        message: {
          role: "user" as const,
          content: [{
            type: "text" as const,
            text: messageText
          }]
        }
      };

      // Send message to Claude and collect response
      let fullResponse = '';
      let toolUsageInfo = '';
      let hasError = false;
      let isResponseComplete = false;

      try {
        // Create a promise to wait for the response to complete
        const responsePromise = new Promise<void>((resolve, reject) => {
          let timeoutId: NodeJS.Timeout;

          claudeSession.sendMessage(userMessage, (sdkMessage: any) => {
            console.log(`📦 Received SDK message type: ${sdkMessage.type}, subtype: ${sdkMessage.subtype}`);

            // Clear any existing timeout
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            // Set a new timeout in case we don't get a result event
            timeoutId = setTimeout(() => {
              if (!isResponseComplete) {
                console.log('⏰ Response timeout, treating as complete');
                isResponseComplete = true;
                resolve();
              }
            }, 30000); // 30 second timeout

            // Handle init message to get sessionId
            if (sdkMessage.type === 'system' && sdkMessage.subtype === 'init' && sdkMessage.session_id) {
              const newSessionId = sdkMessage.session_id;
              claudeSession!.setClaudeSessionId(newSessionId);
              sessionManager.confirmSessionId(claudeSession!, newSessionId);

              // Update mapping
              slackThreadMapper.setMapping({
                threadTs,
                channel: event.channel,
                sessionId: newSessionId,
                agentId: currentAgentId
              });

              console.log(`✅ Session confirmed: ${newSessionId} for thread: ${threadTs}`);
            }

            // Collect text responses
            if (sdkMessage.type === 'assistant') {
              console.log('🔍 Assistant message details:', JSON.stringify({
                type: sdkMessage.type,
                subtype: sdkMessage.subtype,
                hasContent: !!(sdkMessage.content || sdkMessage.message?.content),
                contentLength: sdkMessage.content?.length || sdkMessage.message?.content?.length || 0
              }, null, 2));

              // Extract text from message.content array (standard Claude SDK format)
              if (sdkMessage.message?.content && Array.isArray(sdkMessage.message.content)) {
                for (const block of sdkMessage.message.content) {
                  if (block.type === 'text' && block.text) {
                    fullResponse += block.text;
                  }
                }
              }
              // Fallback: Try other formats
              else if (sdkMessage.subtype === 'text' && sdkMessage.text) {
                fullResponse += sdkMessage.text;
              } else if (sdkMessage.message && typeof sdkMessage.message === 'string') {
                fullResponse += sdkMessage.message;
              } else if (sdkMessage.content) {
                if (Array.isArray(sdkMessage.content)) {
                  for (const block of sdkMessage.content) {
                    if (block.type === 'text' && block.text) {
                      fullResponse += block.text;
                    }
                  }
                } else if (typeof sdkMessage.content === 'string') {
                  fullResponse += sdkMessage.content;
                }
              }
            }

            // Track tool usage
            if (sdkMessage.type === 'tool_use' && sdkMessage.subtype === 'start') {
              const toolName = sdkMessage.tool_use?.name || 'unknown';
              toolUsageInfo += `\n🔧 Using tool: ${toolName}`;
              console.log(`🔧 Tool started: ${toolName}`);
            }

            // Handle errors
            if (sdkMessage.type === 'error') {
              hasError = true;
              console.error('❌ Claude error:', sdkMessage.error || sdkMessage.message);
              isResponseComplete = true;
              resolve();
            }

            // Check for completion
            if (sdkMessage.type === 'result') {
              console.log('✅ AI response completed');
              isResponseComplete = true;
              clearTimeout(timeoutId);
              resolve();
            }
          }).catch((error) => {
            console.error('❌ Error in sendMessage:', error);
            hasError = true;
            clearTimeout(timeoutId);
            resolve();
          });
        });

        // Wait for the response to complete
        await responsePromise;

        // Update Slack message with final response
        let finalText = fullResponse || '✅ 完成';

        if (toolUsageInfo) {
          finalText += `\n\n${toolUsageInfo}`;
        }

        if (hasError) {
          finalText = '❌ 处理请求时发生错误，请稍后重试';
        }

        await this.slackClient.updateMessage({
          channel: event.channel,
          ts: placeholderMsg.ts,
          text: finalText
        });

        console.log(`✅ Updated Slack message with AI response (${fullResponse.length} chars)`);

      } catch (error) {
        console.error('❌ Error during Claude processing:', error);

        await this.slackClient.updateMessage({
          channel: event.channel,
          ts: placeholderMsg.ts,
          text: `❌ 错误: ${error instanceof Error ? error.message : '未知错误'}`
        });
      } finally {
        // 释放会话锁
        if (finalSessionId && lockAcquired) {
          const released = slackSessionLock.releaseLock(finalSessionId);
          if (released) {
            console.log(`🔓 Released lock for session ${finalSessionId}`);
          } else {
            console.log(`⚠️  Failed to release lock for session ${finalSessionId}`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error handling Slack message:', error);

      // Try to send error message to Slack
      try {
        await this.slackClient.postMessage({
          channel: event.channel,
          text: `❌ 处理消息时发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
          thread_ts: event.thread_ts || event.ts
        });
      } catch (sendError) {
        console.error('❌ Failed to send error message to Slack:', sendError);
      }
    }
  }
}
