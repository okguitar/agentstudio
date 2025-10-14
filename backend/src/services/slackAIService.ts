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
import { AgentStorage } from '@agentstudio/shared/utils/agentStorage';
import { slackThreadMapper } from './slackThreadMapper.js';
import { SlackClient } from './slackClient.js';
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
async function buildQueryOptions(agent: any, projectPath?: string, mcpTools?: string[], permissionMode?: string, model?: string): Promise<Options> {
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
 * Slack AI Service - Main adapter class
 */
export class SlackAIService {
  private slackClient: SlackClient;
  private agentStorage: AgentStorage;
  private defaultAgentId: string;

  constructor(botToken: string, defaultAgentId: string = 'slack-chat-agent') {
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

      // Get agent configuration
      const agent = this.agentStorage.getAgent(this.defaultAgentId);
      if (!agent) {
        throw new Error(`Agent not found: ${this.defaultAgentId}`);
      }

      if (!agent.enabled) {
        await this.slackClient.postMessage({
          channel: event.channel,
          text: '⚠️ Agent is currently disabled',
          thread_ts: threadTs
        });
        return;
      }

      // Send "thinking" placeholder
      const placeholderMsg = await this.slackClient.postMessage({
        channel: event.channel,
        text: '🤔 正在思考...',
        thread_ts: threadTs
      });

      console.log(`📍 Posted placeholder message: ${placeholderMsg.ts}`);

      // Build query options
      const queryOptions = await buildQueryOptions(agent);

      // Get or create Claude session
      let claudeSession = sessionId ? sessionManager.getSession(sessionId) : null;

      if (!claudeSession) {
        // Create new session
        claudeSession = sessionManager.createNewSession(this.defaultAgentId, queryOptions);
        console.log(`🆕 Created new Claude session for Slack thread: ${threadTs}`);
      } else {
        console.log(`♻️  Reusing existing Claude session: ${sessionId}`);
      }

      // Build user message
      const userMessage = {
        type: "user" as const,
        message: {
          role: "user" as const,
          content: [{
            type: "text" as const,
            text: event.text
          }]
        }
      };

      // Send message to Claude and collect response
      let fullResponse = '';
      let toolUsageInfo = '';
      let hasError = false;

      try {
        await claudeSession.sendMessage(userMessage, (sdkMessage: any) => {
          console.log(`📦 Received SDK message type: ${sdkMessage.type}, subtype: ${sdkMessage.subtype}`);

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
              agentId: this.defaultAgentId
            });

            console.log(`✅ Session confirmed: ${newSessionId} for thread: ${threadTs}`);
          }

          // Collect text responses
          if (sdkMessage.type === 'assistant' && sdkMessage.subtype === 'text' && sdkMessage.text) {
            fullResponse += sdkMessage.text;
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
          }
        });

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
