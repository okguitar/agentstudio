import express from 'express';
import { z } from 'zod';
import type {
  SDKMessage,
  SDKSystemMessage,
  SDKResultMessage,
  SDKCompactBoundaryMessage
} from '@anthropic-ai/claude-agent-sdk';
import { AgentStorage } from '../services/agentStorage';
import { AgentConfig } from '../types/agents';
import { sessionManager } from '../services/sessionManager';
import { buildQueryOptions } from '../utils/claudeUtils.js';
import { handleSessionManagement, buildUserMessageContent } from '../utils/sessionUtils.js';
import { 
  userInputRegistry,
  notificationChannelManager,
  SSENotificationChannel,
  generateSSEChannelId,
  initAskUserQuestionModule
} from '../services/askUserQuestion/index.js';
import { a2aStreamEventEmitter, type A2AStreamStartEvent, type A2AStreamDataEvent, type A2AStreamEndEvent } from '../services/a2a/a2aStreamEvents.js';

// 类型守卫函数
function isSDKSystemMessage(message: any): message is SDKSystemMessage {
  return message && message.type === 'system';
}

function isSDKResultMessage(message: any): message is SDKResultMessage {
  return message && message.type === 'result';
}

// isSDKPartialAssistantMessage removed - not currently used

function isSDKCompactBoundaryMessage(message: any): message is SDKCompactBoundaryMessage {
  return message && message.type === 'system' && (message as any).subtype === 'compact_boundary';
}

const router: express.Router = express.Router();

// Storage instances
const globalAgentStorage = new AgentStorage();




// Validation schemas
// 定义 SystemPrompt schema，支持字符串或预设对象格式
const PresetSystemPromptSchema = z.object({
  type: z.literal('preset'),
  preset: z.literal('claude_code'),
  append: z.string().optional()
});

const SystemPromptSchema = z.union([
  z.string().min(1),
  PresetSystemPromptSchema
]);

const CreateAgentSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-_]+$/, 'ID must contain only lowercase letters, numbers, hyphens, and underscores'),
  name: z.string().min(1),
  description: z.string(),
  systemPrompt: SystemPromptSchema,
  // maxTurns 可以是数字（1-100）、null（不限制）或 undefined（使用默认值）
  maxTurns: z.union([z.number().min(1).max(100), z.null()]).optional().default(25),
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan']).optional().default('acceptEdits'),
  model: z.string().min(1).optional().default('claude-3-5-sonnet-20241022'),
  allowedTools: z.array(z.object({
    name: z.string(),
    enabled: z.boolean(),
    permissions: z.object({
      requireConfirmation: z.boolean().optional(),
      allowedPaths: z.array(z.string()).optional(),
      blockedPaths: z.array(z.string()).optional(),
    }).optional()
  })),
  ui: z.object({
    icon: z.string().optional().default('🤖'),
    primaryColor: z.string().optional().default('#3B82F6'),
    headerTitle: z.string(),
    headerDescription: z.string(),
    welcomeMessage: z.string().optional(),
    customComponent: z.string().optional()
  }),
  workingDirectory: z.string().optional(),
  dataDirectory: z.string().optional(),
  fileTypes: z.array(z.string()).optional(),
  author: z.string().min(1),
  homepage: z.string().url().optional(),
  tags: z.array(z.string()).optional().default([]),
  enabled: z.boolean().optional().default(true)
});

const UpdateAgentSchema = CreateAgentSchema.partial().omit({ id: true });


// 获取活跃会话列表 (需要在通用获取agents路由之前)
router.get('/sessions', (req, res) => {
  try {
    const activeCount = sessionManager.getActiveSessionCount();
    const sessionsInfo = sessionManager.getSessionsInfo();

    res.json({
      activeSessionCount: activeCount,
      sessions: sessionsInfo,
      message: `${activeCount} active Claude sessions`
    });
  } catch (error) {
    console.error('Failed to get sessions:', error);
    res.status(500).json({ error: 'Failed to retrieve session info' });
  }
});

// 手动关闭指定会话
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const removed = await sessionManager.removeSession(sessionId);

    if (removed) {
      res.json({ success: true, message: `Session ${sessionId} closed` });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    console.error('Failed to close session:', error);
    res.status(500).json({ error: 'Failed to close session' });
  }
});

// 中断指定会话的当前请求
router.post('/sessions/:sessionId/interrupt', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`🛑 API: Interrupt request for session: ${sessionId}`);

    const result = await sessionManager.interruptSession(sessionId);

    if (result.success) {
      res.json({
        success: true,
        message: `Session ${sessionId} interrupted successfully`
      });
    } else {
      res.status(result.error === 'Session not found' ? 404 : 500).json({
        success: false,
        error: result.error || 'Failed to interrupt session'
      });
    }
  } catch (error) {
    console.error('Failed to interrupt session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to interrupt session',
      details: errorMessage
    });
  }
});

// Get all agents
router.get('/', (req, res) => {
  try {
    const { enabled } = req.query;
    let agents = globalAgentStorage.getAllAgents();

    // Filter by enabled status
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      agents = agents.filter(agent => agent.enabled === isEnabled);
    }

    // Filter by component type
    // componentType filtering removed - no longer needed

    res.json({ agents });
  } catch (error) {
    console.error('Failed to get agents:', error);
    res.status(500).json({ error: 'Failed to retrieve agents' });
  }
});




// Get specific agent
router.get('/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = globalAgentStorage.getAgent(agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ agent });
  } catch (error) {
    console.error('Failed to get agent:', error);
    res.status(500).json({ error: 'Failed to retrieve agent' });
  }
});

// Create new agent
router.post('/', (req, res) => {
  try {
    const validation = CreateAgentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid agent data', details: validation.error });
    }

    const agentData = validation.data;

    // Check if agent ID already exists
    const existingAgent = globalAgentStorage.getAgent(agentData.id);
    if (existingAgent) {
      return res.status(409).json({ error: 'Agent with this ID already exists' });
    }

    const agent = globalAgentStorage.createAgent({
      ...agentData,
      version: '1.0.0',
      model: 'claude-sonnet-4-20250514',
      source: 'local'
    } as Omit<AgentConfig, 'createdAt' | 'updatedAt'>);

    res.json({ agent, message: 'Agent created successfully' });
  } catch (error) {
    console.error('Failed to create agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update agent
router.put('/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const validation = UpdateAgentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid agent data', details: validation.error });
    }

    const existingAgent = globalAgentStorage.getAgent(agentId);
    if (!existingAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // 过滤并转换 validation.data，将 maxTurns: null 转换为 undefined
    const updateData: Partial<AgentConfig> = { ...validation.data as any };
    if (updateData.maxTurns === null) {
      updateData.maxTurns = undefined;
    }

    // 构建更新后的 agent
    const updatedAgent: AgentConfig = {
      ...existingAgent,
      ...updateData,
      id: agentId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    globalAgentStorage.saveAgent(updatedAgent);
    res.json({ agent: updatedAgent, message: 'Agent updated successfully' });
  } catch (error) {
    console.error('Failed to update agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete agent
router.delete('/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    console.log(`🗑️ [ROUTE DEBUG] DELETE request for agent: ${agentId}`);

    const deleted = globalAgentStorage.deleteAgent(agentId);
    console.log(`🗑️ [ROUTE DEBUG] Delete result:`, deleted);

    if (!deleted) {
      console.log(`❌ [ROUTE DEBUG] Agent not found: ${agentId}`);
      return res.status(404).json({ error: 'Agent not found' });
    }

    console.log(`✅ [ROUTE DEBUG] Agent deleted successfully: ${agentId}`);
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('❌ [ROUTE DEBUG] Failed to delete agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});


// Validation schemas for chat
const ImageSchema = z.object({
  id: z.string(),
  data: z.string(), // base64 encoded image data
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  filename: z.string().optional()
});

const ChatRequestSchema = z.object({
  message: z.string(),
  images: z.array(ImageSchema).optional(),
  agentId: z.string().min(1),
  sessionId: z.string().optional().nullable(),
  projectPath: z.string().optional(),
  mcpTools: z.array(z.string()).optional(),
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan']).optional(),
  model: z.string().optional(),
  claudeVersion: z.string().optional(), // Claude版本ID
  channel: z.enum(['web', 'slack']).optional().default('web'), // Channel for streaming control
  context: z.object({
    currentSlide: z.number().optional().nullable(),
    slideContent: z.string().optional(),
    allSlides: z.array(z.object({
      index: z.number(),
      title: z.string(),
      path: z.string(),
      exists: z.boolean().optional()
    })).optional(),
    // Generic context for other agent types
    currentItem: z.any().optional(),
    allItems: z.array(z.any()).optional(),
    customContext: z.record(z.any()).optional()
  }).optional(),
  envVars: z.record(z.string()).optional()
}).refine(data => {
  // Either message text or images must be provided
  return data.message.trim().length > 0 || (data.images && data.images.length > 0);
}, {
  message: "Either message text or images must be provided"
});

// Helper functions for chat endpoint

/**
 * 设置 SSE 连接管理
 */
function setupSSEConnectionManagement(req: express.Request, res: express.Response, agentId: string) {
  // 连接管理变量
  let isConnectionClosed = false;
  let connectionTimeout: NodeJS.Timeout | null = null;
  let currentRequestId: string | null = null;
  let claudeSession: any; // 会话实例，稍后赋值

  // 安全关闭连接的函数
  const safeCloseConnection = (reason: string) => {
    if (isConnectionClosed) return;

    isConnectionClosed = true;
    console.log(`🔚 Closing SSE connection for agent ${agentId}: ${reason}`);

    // 清理超时定时器
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }

    // 清理 Claude 请求回调
    if (currentRequestId && claudeSession) {
      claudeSession.cancelRequest(currentRequestId);
      if (reason === 'request completed') {
        console.log(`✅ Cleaned up Claude request ${currentRequestId}: ${reason}`);
      } else {
        console.log(`🚫 Cancelled Claude request ${currentRequestId} due to: ${reason}`);
      }
    }

    // 确保连接关闭
    if (!res.headersSent) {
      try {
        res.write(`data: ${JSON.stringify({
          type: 'connection_closed',
          reason: reason,
          timestamp: Date.now()
        })}\n\n`);
      } catch (writeError: unknown) {
        console.error('Failed to write connection close event:', writeError);
      }
    }

    try {
      if (!res.destroyed) {
        res.end();
      }
    } catch (endError: unknown) {
      console.error('Failed to end response:', endError);
    }
  };

  // 监听客户端断开连接 - 只在响应阶段监听
  res.on('close', () => {
    if (!isConnectionClosed) {
      safeCloseConnection('client disconnected');
    }
  });

  // 监听请求完成
  req.on('end', () => {
    console.log('📤 Request data received completely');
  });

  // 监听连接错误
  req.on('error', (error) => {
    console.error('SSE request error:', error);
    safeCloseConnection(`request error: ${error.message}`);
  });

  // 监听响应错误
  res.on('error', (error) => {
    console.error('SSE response error:', error);
    safeCloseConnection(`response error: ${error.message}`);
  });

  // 设置连接超时保护（30分钟）
  const CONNECTION_TIMEOUT_MS = 30 * 60 * 1000;
  connectionTimeout = setTimeout(() => {
    safeCloseConnection('connection timeout');
  }, CONNECTION_TIMEOUT_MS);

  return {
    isConnectionClosed: () => isConnectionClosed,
    safeCloseConnection,
    setCurrentRequestId: (id: string | null) => { currentRequestId = id; },
    setClaudeSession: (session: any) => { claudeSession = session; }
  };
}

// POST /api/agents/chat - Agent-based AI chat using Claude Code SDK with session management
router.post('/chat', async (req, res) => {
  // 重试逻辑：最多重试1次
  let retryCount = 0;
  const MAX_RETRIES = 1;

  try {
    console.log('Chat request received:', req.body);

    // 输出当前Session Manager的状态
    console.log('📊 SessionManager状态 - 收到/chat消息时:');
    console.log(`   活跃会话总数: ${sessionManager.getActiveSessionCount()}`);
    const sessionsInfo = sessionManager.getSessionsInfo();
    console.log('   会话详情:');
    sessionsInfo.forEach(session => {
      console.log(`     - SessionId: ${session.sessionId}`);
      console.log(`       AgentId: ${session.agentId}`);
      console.log(`       状态: ${session.status}`);
      console.log(`       是否活跃: ${session.isActive}`);
      console.log(`       空闲时间: ${Math.round(session.idleTimeMs / 1000)}秒`);
      console.log(`       最后活动: ${new Date(session.lastActivity).toISOString()}`);
    });

    // 验证请求数据
    const validation = ChatRequestSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('Validation failed:', validation.error);
      return res.status(400).json({ error: 'Invalid request body', details: validation.error });
    }

    const { message, images, agentId, sessionId: initialSessionId, projectPath, mcpTools, permissionMode, model, claudeVersion, channel, envVars } = validation.data;
    let sessionId = initialSessionId;

    console.log('[Backend] Received chat request:', {
      agentId,
      sessionId,
      envVarsKeys: envVars ? Object.keys(envVars) : [],
      envVars
    });

    // Configure partial message streaming based on channel
    const includePartialMessages = channel === 'web';
    console.log(`📡 Channel: ${channel}, includePartialMessages: ${includePartialMessages}`);

    // 获取 agent 配置
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (!agent.enabled) {
      return res.status(403).json({ error: 'Agent is disabled' });
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // 设置连接管理
    const connectionManager = setupSSEConnectionManagement(req, res, agentId);

    // 🎤 初始化 AskUserQuestion 模块（只会初始化一次）
    initAskUserQuestionModule();
    
    // 🎤 生成 SSE channel ID（用于通知渠道管理）
    const sseChannelId = generateSSEChannelId();
    // 注意：SSE channel 需要 sessionId，但新会话还没有 sessionId
    // 我们使用临时 ID，稍后在收到 Claude SDK 的 sessionId 时更新
    const tempSessionId = sessionId || `temp_${Date.now()}`;
    
    // 创建 SSE channel，传入 onClose 回调用于自动注销和清理
    const sseChannel = new SSENotificationChannel(
      sseChannelId, 
      tempSessionId, 
      agentId, 
      res,
      () => {
        // 连接关闭时自动注销渠道，防止内存泄漏
        notificationChannelManager.unregisterChannel(sseChannelId);
        
        // 🎤 取消该 session 的所有等待中的用户输入请求
        // 使用 sseChannel.sessionId 获取最新的 sessionId（可能已从 temp 更新为真实 ID）
        const currentSessionId = sseChannel.sessionId;
        const cancelledCount = userInputRegistry.cancelAllBySession(
          currentSessionId, 
          'SSE connection closed'
        );
        if (cancelledCount > 0) {
          console.log(`🎤 [AskUserQuestion] Cancelled ${cancelledCount} pending inputs for session: ${currentSessionId}`);
        }
      }
    );
    notificationChannelManager.registerChannel(sseChannel);
    console.log(`📡 [AskUserQuestion] Registered SSE channel: ${sseChannelId}`);

    // =================================================================================
    // A2A Stream Event Subscription
    // Subscribe to A2A stream events to forward sessionId to frontend
    // This allows frontend to connect to history stream early for real-time display
    // =================================================================================
    const a2aStreamStartHandler = (event: A2AStreamStartEvent) => {
      // Only forward events for the same project
      if (event.projectId === projectPath) {
        try {
          if (!res.destroyed && !connectionManager.isConnectionClosed()) {
            res.write(`data: ${JSON.stringify({
              type: 'a2a_stream_start',
              sessionId: event.sessionId,
              contextId: event.contextId,  // A2A standard contextId
              taskId: event.taskId,         // A2A standard taskId
              agentUrl: event.agentUrl,
              message: event.message,
              timestamp: event.timestamp,
            })}\n\n`);
          }
        } catch (writeError) {
          console.error('Failed to write A2A stream start event:', writeError);
        }
      }
    };

    const a2aStreamDataHandler = (event: A2AStreamDataEvent) => {
      // Only forward events for the same project
      if (event.projectId === projectPath) {
        try {
          if (!res.destroyed && !connectionManager.isConnectionClosed()) {
            res.write(`data: ${JSON.stringify({
              type: 'a2a_stream_data',
              sessionId: event.sessionId,
              agentUrl: event.agentUrl,  // Agent URL for frontend matching
              event: event.event,  // The actual A2A standard event
              timestamp: event.timestamp,
            })}\n\n`);
          }
        } catch (writeError) {
          console.error('Failed to write A2A stream data event:', writeError);
        }
      }
    };

    const a2aStreamEndHandler = (event: A2AStreamEndEvent) => {
      // Only forward events for the same project
      if (event.projectId === projectPath) {
        try {
          if (!res.destroyed && !connectionManager.isConnectionClosed()) {
            res.write(`data: ${JSON.stringify({
              type: 'a2a_stream_end',
              sessionId: event.sessionId,
              success: event.success,
              error: event.error,
              finalState: event.finalState,  // A2A standard TaskState
              timestamp: event.timestamp,
            })}\n\n`);
          }
        } catch (writeError) {
          console.error('Failed to write A2A stream end event:', writeError);
        }
      }
    };

    // Subscribe to A2A stream events
    a2aStreamEventEmitter.on('a2a_stream_start', a2aStreamStartHandler);
    a2aStreamEventEmitter.on('a2a_stream_data', a2aStreamDataHandler);
    a2aStreamEventEmitter.on('a2a_stream_end', a2aStreamEndHandler);

    // Clean up subscription when connection closes
    res.on('close', () => {
      a2aStreamEventEmitter.off('a2a_stream_start', a2aStreamStartHandler);
      a2aStreamEventEmitter.off('a2a_stream_data', a2aStreamDataHandler);
      a2aStreamEventEmitter.off('a2a_stream_end', a2aStreamEndHandler);
    });
    // =================================================================================

    // 重试循环：处理会话失败的情况
    while (retryCount <= MAX_RETRIES) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${MAX_RETRIES + 1} for session: ${sessionId || 'new'}`);
        // 构建查询选项（包含 AskUserQuestion MCP 工具）
        // 使用 tempSessionId 作为 MCP 工具的 sessionId（新会话还没有真实 sessionId）
        const { queryOptions, askUserSessionRef } = await buildQueryOptions(agent, projectPath, mcpTools, permissionMode, model, claudeVersion, undefined, envVars, tempSessionId, agentId);

        // ⚡ CRITICAL: Add includePartialMessages BEFORE creating session
        // This must be set before handleSessionManagement because ClaudeSession
        // uses these options to configure the Claude SDK query
        queryOptions.includePartialMessages = includePartialMessages;

        // 处理会话管理
        const { claudeSession, actualSessionId: initialSessionId } = await handleSessionManagement(agentId, sessionId || null, projectPath, queryOptions, claudeVersion);
        let actualSessionId = initialSessionId;

        // 设置会话到连接管理器
        connectionManager.setClaudeSession(claudeSession);

        // 获取最终的模型名称(从queryOptions中获取,因为buildQueryOptions已经处理了优先级)
        const finalModel = queryOptions.model || 'sonnet';

        // 构建用户消息(传递claudeVersion以便查询isVision配置)
        const userMessage = await buildUserMessageContent(message, images, finalModel, projectPath, claudeVersion);

        // 为这个特定请求创建一个独立的query调用，但复用session context
        const currentSessionId = claudeSession.getClaudeSessionId();

        // 使用会话的 sendMessage 方法发送消息
        let compactMessageBuffer: any[] = []; // 缓存 compact 相关消息

        const currentRequestId = await claudeSession.sendMessage(userMessage, (sdkMessage: SDKMessage) => {
          if (isSDKSystemMessage(sdkMessage) && sdkMessage.subtype === "init") {
            // 检查 MCP 服务器连接状态
            if (sdkMessage.mcp_servers && Array.isArray(sdkMessage.mcp_servers)) {
              const failedServers = sdkMessage.mcp_servers.filter(
                (s: any) => s.status !== "connected"
              );

              if (failedServers.length > 0) {
                console.warn("🚨 [MCP] Failed to connect MCP servers:", failedServers.map((s: any) => ({
                  name: s.name,
                  status: s.status,
                  error: s.error
                })));

                // 发送 MCP 状态通知给前端
                const mcpStatusEvent = {
                  type: 'mcp_status',
                  subtype: 'connection_failed',
                  failedServers: failedServers,
                  timestamp: Date.now(),
                  agentId: agentId,
                  sessionId: actualSessionId || currentSessionId
                };

                try {
                  if (!res.destroyed && !connectionManager.isConnectionClosed()) {
                    res.write(`data: ${JSON.stringify(mcpStatusEvent)}\n\n`);
                  }
                } catch (writeError: unknown) {
                  console.error('Failed to write MCP status event:', writeError);
                }
              } else {
                // 所有 MCP 服务器连接成功
                const connectedServers = sdkMessage.mcp_servers.filter((s: any) => s.status === "connected");
                if (connectedServers.length > 0) {
                  console.log("✅ [MCP] Successfully connected MCP servers:", connectedServers.map((s: any) => s.name));

                  // 发送成功连接通知给前端
                  const mcpStatusEvent = {
                    type: 'mcp_status',
                    subtype: 'connection_success',
                    connectedServers: connectedServers,
                    timestamp: Date.now(),
                    agentId: agentId,
                    sessionId: actualSessionId || currentSessionId
                  };

                  try {
                    if (!res.destroyed && !connectionManager.isConnectionClosed()) {
                      res.write(`data: ${JSON.stringify(mcpStatusEvent)}\n\n`);
                    }
                  } catch (writeError: unknown) {
                    console.error('Failed to write MCP success event:', writeError);
                  }
                }
              }
            }
          }

          // 🚨 MCP 工具日志观察 - 检查执行错误
          if (isSDKResultMessage(sdkMessage) && sdkMessage.subtype === "error_during_execution") {
            const errorMessage = sdkMessage as any; // 临时类型断言以访问错误详情
            console.error("❌ [MCP] Execution failed:", {
              error: errorMessage.error,
              details: errorMessage.details,
              tool: errorMessage.tool,
              timestamp: Date.now()
            });

            // 发送执行错误通知给前端
            const mcpErrorEvent = {
              type: 'mcp_error',
              subtype: 'execution_failed',
              error: errorMessage.error,
              details: errorMessage.details,
              tool: errorMessage.tool,
              timestamp: Date.now(),
              agentId: agentId,
              sessionId: actualSessionId || currentSessionId
            };

            try {
              if (!res.destroyed && !connectionManager.isConnectionClosed()) {
                res.write(`data: ${JSON.stringify(mcpErrorEvent)}\n\n`);
              }
            } catch (writeError: unknown) {
              console.error('Failed to write MCP error event:', writeError);
            }
          }

          // 🔍 添加详细日志来观察消息结构
          if (message === '/compact') {
            const msgWithContent = sdkMessage as any;  // 临时使用 any 访问 message 属性
            console.log('📦 [COMPACT] Received SDK message:', {
              type: sdkMessage.type,
              subtype: (sdkMessage as any).subtype,
              hasMessage: !!msgWithContent.message,
              messageType: typeof msgWithContent.message,
              messageContentType: msgWithContent.message?.content ? typeof msgWithContent.message.content : 'no content',
              messageContentLength: Array.isArray(msgWithContent.message?.content) ? msgWithContent.message.content.length : 'not array',
              firstBlock: Array.isArray(msgWithContent.message?.content) && msgWithContent.message.content.length > 0
                ? { type: msgWithContent.message.content[0].type, hasText: !!msgWithContent.message.content[0].text, textPreview: msgWithContent.message.content[0].text?.substring(0, 100) }
                : 'no blocks'
            });
          }

          // 处理 /compact 命令的特殊消息序列
          if (message === '/compact' && isSDKCompactBoundaryMessage(sdkMessage)) {
            compactMessageBuffer.push(sdkMessage);
            console.log('📦 [COMPACT] Detected compact_boundary, buffering messages...');
            return; // 不发送给前端，等待完整的消息序列
          }

          // 如果在 compact 模式下，缓存消息直到找到完整序列
          if (compactMessageBuffer.length > 0) {
            compactMessageBuffer.push(sdkMessage);

            // 检查是否有足够的消息来构成完整的 compact 序列
            if (compactMessageBuffer.length >= 5) {
              console.log('📦 [COMPACT] Processing complete compact sequence...');

              // 提取摘要内容（第二个消息应该是 isCompactSummary）
              const summaryMsg = compactMessageBuffer.find(msg => msg.isCompactSummary);
              let compactContent = '会话上下文已压缩';

              if (summaryMsg?.message?.content) {
                if (Array.isArray(summaryMsg.message.content)) {
                  const textBlock = summaryMsg.message.content.find((block: any) => block.type === 'text');
                  compactContent = textBlock?.text || compactContent;
                } else if (typeof summaryMsg.message.content === 'string') {
                  compactContent = summaryMsg.message.content;
                }
              }

              // 创建 compact summary 消息发送给前端
              const compactSummaryMessage = {
                type: 'assistant',
                role: 'assistant',
                content: [
                  {
                    type: 'compactSummary',
                    text: compactContent
                  }
                ],
                agentId: agentId,
                sessionId: actualSessionId || currentSessionId,
                timestamp: Date.now(),
                isCompactSummary: true
              };

              console.log('📦 [COMPACT] Sending compact summary to frontend:', compactContent.substring(0, 100));

              try {
                if (!res.destroyed && !connectionManager.isConnectionClosed()) {
                  res.write(`data: ${JSON.stringify(compactSummaryMessage)}\n\n`);
                }
              } catch (writeError: unknown) {
                console.error('Failed to write compact summary:', writeError);
              }

              // 清空缓存
              compactMessageBuffer = [];
              return; // 不继续处理原始消息
            }
          }

          // 检查连接是否已关闭
          if (connectionManager.isConnectionClosed()) {
            console.log(`⚠️ Skipping response for closed connection, agent: ${agentId}`);
            return;
          }

          // 当收到 init 消息时，确认会话 ID
          const responseSessionId = sdkMessage.session_id;
          if (isSDKSystemMessage(sdkMessage) && sdkMessage.subtype === 'init' && responseSessionId) {
            if (!actualSessionId || !currentSessionId) {
              // 新会话：保存session ID
              claudeSession.setClaudeSessionId(responseSessionId);
              sessionManager.confirmSessionId(claudeSession, responseSessionId);
              console.log(`✅ Confirmed session ${responseSessionId} for agent: ${agentId}`);
              
              // 🎤 更新 NotificationChannel、UserInputRegistry 和 MCP Server 的 sessionId
              if (tempSessionId !== responseSessionId) {
                notificationChannelManager.updateChannelSession(sseChannelId, responseSessionId);
                userInputRegistry.updateSessionId(tempSessionId, responseSessionId);
                // 更新 AskUserQuestion MCP Server 使用的 session ID
                if (askUserSessionRef) {
                  askUserSessionRef.current = responseSessionId;
                }
                console.log(`📡 [AskUserQuestion] Updated session: ${tempSessionId} -> ${responseSessionId}`);
              }
            } else if (currentSessionId && responseSessionId !== currentSessionId) {
              // Resume场景：Claude SDK返回了新的session ID，需要通知前端
              console.log(`🔄 Session resumed: ${currentSessionId} -> ${responseSessionId} for agent: ${agentId}`);

              // 更新会话管理器中的session ID映射
              sessionManager.replaceSessionId(claudeSession, currentSessionId, responseSessionId);
              claudeSession.setClaudeSessionId(responseSessionId);

              // 发送session resume通知给前端
              const resumeNotification = {
                type: 'session_resumed',
                subtype: 'new_branch',
                originalSessionId: currentSessionId,
                newSessionId: responseSessionId,
                sessionId: responseSessionId,
                message: `会话已从历史记录恢复并创建新分支。原始会话ID: ${currentSessionId}，新会话ID: ${responseSessionId}`,
                timestamp: Date.now()
              };

              try {
                if (!res.destroyed && !connectionManager.isConnectionClosed()) {
                  res.write(`data: ${JSON.stringify(resumeNotification)}\n\n`);
                  console.log(`🔄 Sent session resume notification: ${currentSessionId} -> ${responseSessionId}`);
                }
              } catch (writeError: unknown) {
                console.error('Failed to write session resume notification:', writeError);
              }

              // 更新实际的session ID为新的ID
              actualSessionId = responseSessionId;
            } else {
              // 继续会话：使用现有session ID
              console.log(`♻️  Continued session ${currentSessionId} for agent: ${agentId}`);
            }
          }

          // 🎯 检测子Agent消息：通过 parent_tool_use_id 字段判断
          const msgAny = sdkMessage as any;
          const isSidechain = !!msgAny.parent_tool_use_id;
          const parentToolUseId = msgAny.parent_tool_use_id;
          
          if (isSidechain) {
            const contentBlocks = msgAny.message?.content || [];
            const blockTypes = contentBlocks.map((b: any) => b.type);
            console.log('🎯 [SIDECHAIN] Sub-agent message:', {
              type: sdkMessage.type,
              parentToolUseId,
              blockTypes,
              // 如果有文本内容，打印前100字符
              textPreview: contentBlocks.find((b: any) => b.type === 'text')?.text?.substring(0, 100),
            });
          }

          const eventData = {
            ...sdkMessage,
            agentId: agentId,
            sessionId: actualSessionId || responseSessionId || currentSessionId,
            timestamp: Date.now(),
            // 🎯 添加子Agent标识
            isSidechain,
            parentToolUseId,
          };

          // 确保返回的 session_id 字段与 sessionId 一致
          if (actualSessionId || currentSessionId) {
            eventData.session_id = actualSessionId || currentSessionId;
          }

          // 🎤 AskUserQuestion 工具调用说明（事件驱动架构）：
          // 1. MCP 工具调用 userInputRegistry.waitForUserInput()
          // 2. UserInputRegistry 发出 'awaiting_input' 事件
          // 3. NotificationChannelManager 通过活跃渠道（SSE/Slack等）发送通知
          // 4. 用户响应后，调用 /agents/user-response API
          // 5. MCP 工具返回，Claude 继续执行
          // 不需要在这里检测工具调用或关闭连接

          try {
            if (!res.destroyed && !connectionManager.isConnectionClosed()) {
              res.write(`data: ${JSON.stringify(eventData)}\n\n`);
            }
          } catch (writeError: unknown) {
            console.error('Failed to write SSE data:', writeError);
            const errorMessage = writeError instanceof Error ? writeError.message : 'unknown write error';
            connectionManager.safeCloseConnection(`write error: ${errorMessage}`);
            return;
          }

          // 当收到 result 事件时，正常结束 SSE 连接
          if (isSDKResultMessage(sdkMessage)) {
            console.log(`✅ Received result event, closing SSE connection for sessionId: ${actualSessionId || currentSessionId}`);
            connectionManager.safeCloseConnection('request completed');
          }
        });

        // 设置当前请求ID到连接管理器
        connectionManager.setCurrentRequestId(currentRequestId);

        console.log(`📨 Started Claude request for agent: ${agentId}, sessionId: ${currentSessionId || 'new'}, requestId: ${currentRequestId}`);

        // 如果成功发送消息，跳出重试循环
        break;

      } catch (sessionError) {
        console.error(`❌ Claude session error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, sessionError);

        const errorMessage = sessionError instanceof Error ? sessionError.message : 'Unknown error';
        const originalSessionId = sessionId; // 使用外部作用域的sessionId

        // 检查是否应该重试
        const shouldRetry = retryCount < MAX_RETRIES && originalSessionId !== null;

        if (shouldRetry && originalSessionId) {
          // 尝试重试：从SessionManager中移除失败的会话
          console.log(`🔄 Attempting to recover from session failure for session: ${originalSessionId}`);
          console.log(`   Error details: ${errorMessage}`);

          try {
            // 从SessionManager中移除失败的会话
            const removed = await sessionManager.removeSession(originalSessionId);
            if (removed) {
              console.log(`✅ Removed failed session ${originalSessionId} from SessionManager`);
            } else {
              console.log(`⚠️  Session ${originalSessionId} was not found in SessionManager (may have been cleaned up already)`);
            }
          } catch (removeError) {
            console.error(`⚠️  Failed to remove session ${originalSessionId}:`, removeError);
          }

          // 将sessionId设为null，下次循环将创建新会话
          sessionId = null;
          retryCount++;

          console.log(`🔄 Retrying with new session (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
          continue; // 继续下一次循环
        }

        // 不再重试，发送错误给前端
        console.log(`❌ Maximum retries reached or no sessionId to retry. Sending error to frontend.`);

        if (!connectionManager.isConnectionClosed()) {
          try {
            res.write(`data: ${JSON.stringify({
              type: 'error',
              error: 'Claude session failed',
              message: errorMessage,
              timestamp: Date.now(),
              retriesExhausted: retryCount >= MAX_RETRIES
            })}\n\n`);
          } catch (writeError) {
            console.error('Failed to write error message:', writeError);
          }
          connectionManager.safeCloseConnection(`session error: ${errorMessage}`);
        }
        break; // 跳出重试循环
      }
    } // End of while loop

  } catch (error) {
    console.error('Error in AI chat:', error);

    // 使用安全关闭连接函数（如果在 try 块内部定义的话）
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (!res.headersSent) {
      // 如果还没有设置为 SSE，返回 JSON 错误
      res.status(500).json({ error: 'AI request failed', message: errorMessage });
    } else {
      // 如果已经是 SSE 连接，发送错误事件并关闭
      try {
        if (!res.destroyed) {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: 'AI request failed',
            message: errorMessage,
            timestamp: Date.now()
          })}\n\n`);
          res.end();
        }
      } catch (writeError) {
        console.error('Failed to write final error message:', writeError);
        try {
          if (!res.destroyed) {
            res.end();
          }
        } catch (endError) {
          console.error('Failed to end response in error handler:', endError);
        }
      }
    }
  }
});

// =================================================================================
// 🎤 AskUserQuestion: Submit User Response API
// =================================================================================
// 当用户在前端交互组件中提交答案时，前端调用此 API
// 这会 resolve MCP 工具中正在等待的 Promise，使工具返回用户答案

const UserResponseSchema = z.object({
  toolUseId: z.string().min(1, 'toolUseId is required'),
  response: z.string().min(1, 'response is required'),
  // 可选的验证参数，用于防止伪造响应
  sessionId: z.string().optional(),
  agentId: z.string().optional()
});

router.post('/user-response', async (req, res) => {
  try {
    const validation = UserResponseSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors
      });
    }
    
    const { toolUseId, response, sessionId, agentId } = validation.data;
    
    console.log(`🎤 [AskUserQuestion] Received user response for tool: ${toolUseId}`);
    
    // 使用带验证的提交方法，防止伪造响应
    const result = userInputRegistry.validateAndSubmitUserResponse(
      toolUseId, 
      response,
      sessionId,
      agentId
    );
    
    if (result.success) {
      console.log(`✅ [AskUserQuestion] User response submitted successfully for tool: ${toolUseId}`);
      res.json({
        success: true,
        message: 'User response submitted successfully'
      });
    } else {
      console.warn(`⚠️ [AskUserQuestion] Failed to submit response for tool: ${toolUseId}, error: ${result.error}`);
      
      // 根据错误类型返回不同的状态码
      const statusCode = result.error === 'No pending input found for this tool use ID' ? 404 : 403;
      res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ [AskUserQuestion] Error processing user response:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;