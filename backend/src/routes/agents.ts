import express from 'express';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { query } from '@anthropic-ai/claude-code';
import { AgentStorage } from 'agentstudio-shared/utils/agentStorage';
import { AgentConfig } from 'agentstudio-shared/types/agents';
import { ProjectMetadataStorage } from 'agentstudio-shared/utils/projectMetadataStorage';
import { sessionManager } from '../services/sessionManager.js';
import { getAllVersions, getDefaultVersionId } from 'agentstudio-shared/utils/claudeVersionStorage';

const router: express.Router = express.Router();
const execAsync = promisify(exec);

// Storage instances
const globalAgentStorage = new AgentStorage();




// Validation schemas
const CreateAgentSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-_]+$/, 'ID must contain only lowercase letters, numbers, hyphens, and underscores'),
  name: z.string().min(1),
  description: z.string(),
  systemPrompt: z.string().min(1),
  maxTurns: z.number().min(1).max(100).optional().default(25),
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
    componentType: z.enum(['slides', 'chat', 'documents', 'code', 'custom']),
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
    const { enabled, type } = req.query;
    let agents = globalAgentStorage.getAllAgents();
    
    // Filter by enabled status
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      agents = agents.filter(agent => agent.enabled === isEnabled);
    }
    
    // Filter by component type
    if (type && typeof type === 'string') {
      agents = agents.filter(agent => agent.ui.componentType === type);
    }
    
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
      model: 'claude-sonnet-4-20250514'
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

    const updatedAgent: AgentConfig = {
      ...existingAgent,
      ...validation.data,
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
    const deleted = globalAgentStorage.deleteAgent(agentId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Failed to delete agent:', error);
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
  }).optional()
}).refine(data => data.message.trim().length > 0 || (data.images && data.images.length > 0), {
  message: "Either message text or images must be provided"
});

// Function to get the path to system claude command
async function getClaudeExecutablePath(): Promise<string | null> {
  try {
    const { stdout: claudePath } = await execAsync('which claude');
    if (!claudePath) return null;
    
    const cleanPath = claudePath.trim();
    
    // Skip local node_modules paths - we want global installation
    if (cleanPath.includes('node_modules/.bin')) {
      // Try to find global installation by checking PATH without local node_modules
      try {
        const { stdout: allClaudes } = await execAsync('which -a claude');
        const claudes = allClaudes.trim().split('\n');
        
        // Find the first non-local installation
        for (const claudePathOption of claudes) {
          if (!claudePathOption.includes('node_modules/.bin')) {
            return claudePathOption.trim();
          }
        }
      } catch {
        // Fallback to the first path found
      }
    }
    
    return cleanPath;
  } catch (error) {
    console.error('Failed to get claude executable path:', error);
    return null;
  }
}

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

/**
 * 构建查询选项
 */
async function buildQueryOptions(agent: any, projectPath: string | undefined, mcpTools: string[] | undefined, permissionMode: string | undefined, model: string | undefined, claudeVersion?: string | undefined): Promise<any> {
  // Use Claude Code SDK with agent-specific settings
  // If projectPath is provided, use it as cwd; otherwise fall back to agent's workingDirectory
  let cwd = process.cwd();
  if (projectPath) {
    cwd = projectPath;
  } else if (agent.workingDirectory) {
    cwd = path.resolve(process.cwd(), agent.workingDirectory);
  }
  
  // Determine permission mode: request > agent config > system default
  let finalPermissionMode = 'default';
  if (permissionMode) {
    finalPermissionMode = permissionMode;
  } else if (agent.permissionMode) {
    finalPermissionMode = agent.permissionMode;
  }
  
  // Determine model: request > agent config > system default (sonnet)
  let finalModel = 'sonnet';
  if (model) {
    finalModel = model
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

  // 获取Claude可执行路径 - 支持版本选择
  let executablePath: string | null = null;
  let environmentVariables: Record<string, string> = {};
  
  try {
    if (claudeVersion) {
      // 使用指定版本
      const versions = await getAllVersions();
      const selectedVersion = versions.find(v => v.id === claudeVersion);
      if (selectedVersion) {
        if (selectedVersion.executablePath) {
          executablePath = selectedVersion.executablePath.trim();
        } else {
          executablePath = await getClaudeExecutablePath();
        }
        environmentVariables = selectedVersion.environmentVariables || {};
        console.log(`🎯 Using specified Claude version: ${selectedVersion.alias} (${executablePath})`);
      } else {
        console.warn(`⚠️ Specified Claude version not found: ${claudeVersion}, falling back to default`);
        executablePath = await getClaudeExecutablePath();
      }
    } else {
      // 使用默认版本
      const defaultVersionId = await getDefaultVersionId();
      if (defaultVersionId) {
        const versions = await getAllVersions();
        const defaultVersion = versions.find(v => v.id === defaultVersionId);
        if (defaultVersion) {
          if (defaultVersion.executablePath) {
            executablePath = defaultVersion.executablePath;
          } else {
            executablePath = await getClaudeExecutablePath();
          }
          environmentVariables = defaultVersion.environmentVariables || {};
          console.log(`🎯 Using default Claude version: ${defaultVersion.alias} (${executablePath})`);
        } else {
          executablePath = await getClaudeExecutablePath();
        }
      } else {
        executablePath = await getClaudeExecutablePath();
      }
    }
  } catch (error) {
    console.error('Failed to get Claude executable path:', error);
    executablePath = await getClaudeExecutablePath();
  }

  console.log(`🎯 Using Claude executable path: ${executablePath}`);
  
  const queryOptions: any = {
    appendSystemPrompt: agent.systemPrompt,
    allowedTools,
    maxTurns: agent.maxTurns,
    cwd,
    permissionMode: finalPermissionMode as any,
    model: finalModel,
  };

  // Only add pathToClaudeCodeExecutable if we have a valid path
  if (executablePath) {
    queryOptions.pathToClaudeCodeExecutable = executablePath;
  }
  
  // Always merge environment variables with process.env
  // This ensures critical variables like ANTHROPIC_API_KEY, PATH, etc. are available
  queryOptions.env = { ...process.env, ...environmentVariables };

  if (Object.keys(environmentVariables).length > 0) {
    console.log(`🌍 Using custom environment variables:`, environmentVariables);
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

  return queryOptions;
}

/**
 * 处理会话管理逻辑
 */
async function handleSessionManagement(agentId: string, sessionId: string | null, projectPath: string | undefined, queryOptions: any, claudeVersionId?: string) {
  let claudeSession: any;
  const actualSessionId: string | null = sessionId || null;

  if (sessionId) {
    // 尝试复用现有会话
    console.log(`🔍 Looking for existing session: ${sessionId} for agent: ${agentId}`);
    claudeSession = sessionManager.getSession(sessionId);
    if (claudeSession) {
      console.log(`♻️  Using existing persistent Claude session: ${sessionId} for agent: ${agentId}`);
    } else {
      console.log(`❌ Session ${sessionId} not found in memory for agent: ${agentId}`);

      // 检查项目目录中是否存在会话历史
      console.log(`🔍 Checking project directory for session history: ${sessionId}, projectPath: ${projectPath}`);
      const sessionExists = sessionManager.checkSessionExists(sessionId, projectPath);
      console.log(`📁 Session history exists: ${sessionExists} for sessionId: ${sessionId}`);

      if (sessionExists) {
        // 会话历史存在，使用 resume 参数恢复会话
        console.log(`🔄 Found session history for ${sessionId}, resuming session for agent: ${agentId}`);
        claudeSession = sessionManager.createNewSession(agentId, queryOptions, sessionId, claudeVersionId);
      } else {
        // 会话历史不存在，创建新会话但保持原始 sessionId 用于前端识别
        console.log(`⚠️  Session ${sessionId} not found in memory or project history, creating new session for agent: ${agentId}`);
        claudeSession = sessionManager.createNewSession(agentId, queryOptions, undefined, claudeVersionId);
      }
    }
  } else {
    // 创建新的持续会话
    claudeSession = sessionManager.createNewSession(agentId, queryOptions, undefined, claudeVersionId);
    console.log(`🆕 Created new persistent Claude session for agent: ${agentId}`);
  }

  return { claudeSession, actualSessionId };
}

/**
 * 检测模型是否支持视觉功能
 * 从版本配置中获取模型的 isVision 字段
 */
async function isVisionModel(model: string, claudeVersionId?: string): Promise<boolean> {
  try {
    // 获取版本配置
    let versionId = claudeVersionId;
    if (!versionId) {
      versionId = await getDefaultVersionId() || 'system';
    }

    const versions = await getAllVersions();
    const version = versions.find(v => v.id === versionId);

    if (!version || !version.models) {
      // 如果找不到版本或模型配置,默认假设支持视觉
      console.warn(`⚠️ Version ${versionId} not found or has no model config, assuming vision support`);
      return true;
    }

    // 在版本的模型列表中查找匹配的模型
    const modelConfig = version.models.find(m => m.id === model);
    if (modelConfig) {
      console.log(`✅ Found model config for ${model}: isVision=${modelConfig.isVision}`);
      return modelConfig.isVision;
    }

    // 如果找不到精确匹配,默认假设支持视觉
    console.warn(`⚠️ Model ${model} not found in version ${versionId} config, assuming vision support`);
    return true;
  } catch (error) {
    console.error('Failed to check vision support:', error);
    // 出错时默认假设支持视觉
    return true;
  }
}

/**
 * 保存图片到隐藏目录并返回相对路径
 */
function saveImageToHiddenDir(imageData: string, mediaType: string, imageIndex: number, projectPath?: string): string {
  const cwd = projectPath || process.cwd();
  const hiddenDir = path.join(cwd, '.agentstudio-images');

  // 确保隐藏目录存在
  if (!fs.existsSync(hiddenDir)) {
    fs.mkdirSync(hiddenDir, { recursive: true });
  }

  // 根据 mediaType 确定文件扩展名
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  const ext = extMap[mediaType] || 'jpg';

  // 生成唯一文件名
  const timestamp = Date.now();
  const filename = `image${imageIndex}_${timestamp}.${ext}`;
  const filepath = path.join(hiddenDir, filename);

  // 将 base64 数据写入文件
  const buffer = Buffer.from(imageData, 'base64');
  fs.writeFileSync(filepath, buffer);

  // 返回相对于项目根目录的路径
  return path.relative(cwd, filepath);
}

/**
 * 构建用户消息内容
 */
async function buildUserMessageContent(message: string, images?: any[], model?: string, projectPath?: string, claudeVersionId?: string) {
  const messageContent: any[] = [];
  let processedMessage = message;

  // 检测模型是否支持视觉(从版本配置中获取)
  const supportsVision = model ? await isVisionModel(model, claudeVersionId) : true;

  // 处理图片
  if (images && images.length > 0) {
    console.log('📸 Processing images:', images.map(img => ({
      id: img.id,
      mediaType: img.mediaType,
      filename: img.filename,
      size: img.data.length
    })));

    if (supportsVision) {
      // 视觉模型:直接添加图片到消息内容
      console.log('✅ Model supports vision, adding images directly to message content');
      for (const image of images) {
        messageContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType,
            data: image.data
          }
        });
      }
    } else {
      // 非视觉模型:保存图片到隐藏目录,替换占位符为路径
      console.log('⚠️ Model does not support vision, saving images to hidden directory');
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageIndex = i + 1;
        const placeholder = `[image${imageIndex}]`;

        try {
          // 保存图片并获取路径
          const imagePath = saveImageToHiddenDir(image.data, image.mediaType, imageIndex, projectPath);
          console.log(`💾 Saved image ${imageIndex} to: ${imagePath}`);

          // 替换消息中的占位符为文件路径(添加@前缀)
          processedMessage = processedMessage.replace(placeholder, `@${imagePath}`);
        } catch (error) {
          console.error(`Failed to save image ${imageIndex}:`, error);
          // 如果保存失败,保留占位符
        }
      }
    }
  }

  // Add text content if provided
  if (processedMessage && processedMessage.trim()) {
    messageContent.push({
      type: "text",
      text: processedMessage
    });
  }

  return {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: messageContent
    }
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

    const { message, images, agentId, sessionId: initialSessionId, projectPath, mcpTools, permissionMode, model, claudeVersion } = validation.data;
    let sessionId = initialSessionId;

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

    // 重试循环：处理会话失败的情况
    while (retryCount <= MAX_RETRIES) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${MAX_RETRIES + 1} for session: ${sessionId || 'new'}`);
        // 构建查询选项
      const queryOptions = await buildQueryOptions(agent, projectPath, mcpTools, permissionMode, model, claudeVersion);

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
      
      // 构建完整的query options，如果有现有session则使用resume
      const requestQueryOptions = { ...queryOptions };
      if (currentSessionId) {
        requestQueryOptions.resume = currentSessionId;
        console.log(`🔄 Using resume sessionId: ${currentSessionId} for this request`);
      }
      
      // 使用会话的 sendMessage 方法发送消息
      let compactMessageBuffer: any[] = []; // 缓存 compact 相关消息

      const currentRequestId = await claudeSession.sendMessage(userMessage, (sdkMessage: any) => {
        // 🔧 MCP 工具日志观察 - 检查 MCP 服务器状态
        if (sdkMessage.type === "system" && sdkMessage.subtype === "init") {
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
        if (sdkMessage.type === "result" && sdkMessage.subtype === "error_during_execution") {
          console.error("❌ [MCP] Execution failed:", {
            error: sdkMessage.error,
            details: sdkMessage.details,
            tool: sdkMessage.tool,
            timestamp: Date.now()
          });
          
          // 发送执行错误通知给前端
          const mcpErrorEvent = {
            type: 'mcp_error',
            subtype: 'execution_failed',
            error: sdkMessage.error,
            details: sdkMessage.details,
            tool: sdkMessage.tool,
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
          console.log('📦 [COMPACT] Received SDK message:', {
            type: sdkMessage.type,
            subtype: sdkMessage.subtype,
            hasMessage: !!sdkMessage.message,
            messageType: typeof sdkMessage.message,
            messageContentType: sdkMessage.message?.content ? typeof sdkMessage.message.content : 'no content',
            messageContentLength: Array.isArray(sdkMessage.message?.content) ? sdkMessage.message.content.length : 'not array',
            firstBlock: Array.isArray(sdkMessage.message?.content) && sdkMessage.message.content.length > 0
              ? { type: sdkMessage.message.content[0].type, hasText: !!sdkMessage.message.content[0].text, textPreview: sdkMessage.message.content[0].text?.substring(0, 100) }
              : 'no blocks'
          });
        }

        // 处理 /compact 命令的特殊消息序列
        if (message === '/compact' && sdkMessage.type === 'system' && sdkMessage.subtype === 'compact_boundary') {
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
        const responseSessionId = sdkMessage.session_id || sdkMessage.sessionId;
        if (sdkMessage.type === 'system' && sdkMessage.subtype === 'init' && responseSessionId) {
          if (!actualSessionId || !currentSessionId) {
            // 新会话：保存session ID
            claudeSession.setClaudeSessionId(responseSessionId);
            sessionManager.confirmSessionId(claudeSession, responseSessionId);
            console.log(`✅ Confirmed session ${responseSessionId} for agent: ${agentId}`);
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

        const eventData = {
          ...sdkMessage,
          agentId: agentId,
          sessionId: actualSessionId || responseSessionId || currentSessionId,
          timestamp: Date.now()
        };
        
        // 确保返回的 session_id 字段与 sessionId 一致
        if (actualSessionId || currentSessionId) {
          eventData.session_id = actualSessionId || currentSessionId;
        }
        
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
        if (sdkMessage.type === 'result') {
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



// Helper function to read MCP config (needed for chat functionality)
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

export default router;