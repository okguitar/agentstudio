import express from 'express';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import { query, Options } from '@anthropic-ai/claude-code';
import { AgentStorage } from '../../shared/utils/agentStorage.js';
import { AgentConfig } from '../../shared/types/agents.js';
import { ProjectMetadataStorage } from '../../shared/utils/projectMetadataStorage.js';

const router: express.Router = express.Router();
const execAsync = promisify(exec);

// Storage instances
const globalAgentStorage = new AgentStorage();
const projectStorage = new ProjectMetadataStorage();




// Validation schemas
const CreateAgentSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-_]+$/, 'ID must contain only lowercase letters, numbers, hyphens, and underscores'),
  name: z.string().min(1),
  description: z.string(),
  systemPrompt: z.string().min(1),
  maxTurns: z.number().min(1).max(100).optional().default(25),
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan']).optional().default('acceptEdits'),
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
      version: '1.0.0',
      ...agentData
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
  model: z.enum(['sonnet', 'opus']).optional(),
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

// POST /api/agents/chat - Agent-based AI chat using Claude Code SDK
router.post('/chat', async (req, res) => {
  try {
    console.log('Chat request received:', req.body);
    const validation = ChatRequestSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('Validation failed:', validation.error);
      return res.status(400).json({ error: 'Invalid request body', details: validation.error });
    }

    const { message, images, agentId, context, sessionId, projectPath, mcpTools, permissionMode, model } = validation.data;
    
    // console.log('Received chat request with projectPath:', projectPath);

    // Get agent configuration using global storage (agent configs are global)
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (!agent.enabled) {
      return res.status(403).json({ error: 'Agent is disabled' });
    }


    // Build system prompt from agent configuration
    let systemPrompt = agent.systemPrompt;

    // Add context based on agent type and provided context
    if (context) {
      if (agent.ui.componentType === 'slides') {
        // PPT-specific context
        if (context.currentSlide !== undefined && context.currentSlide !== null) {
          systemPrompt += `\n\nCurrent context: User is working on slide ${context.currentSlide + 1}`;
          if (context.slideContent) {
            systemPrompt += `\nCurrent slide content preview:\n${context.slideContent.substring(0, 500)}...`;
          }
        }

        if (context.allSlides?.length) {
          systemPrompt += `\n\nPresentation overview: ${context.allSlides.length} slides total`;
          systemPrompt += `\nSlides: ${context.allSlides.map((s: any) => `${s.index + 1}. ${s.title}`).join(', ')}`;
        }
      } else {
        // Generic context for other agent types
        if (context.currentItem) {
          systemPrompt += `\n\nCurrent item context: ${JSON.stringify(context.currentItem, null, 2)}`;
        }

        if (context.allItems?.length) {
          systemPrompt += `\n\nAll items overview: ${context.allItems.length} items total`;
        }

        if (context.customContext) {
          systemPrompt += `\n\nCustom context: ${JSON.stringify(context.customContext, null, 2)}`;
        }
      }
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    try {
      // Build allowed tools list from agent configuration
      const allowedTools = agent.allowedTools
        .filter(tool => tool.enabled)
        .map(tool => tool.name);

      // Add MCP tools if provided
      if (mcpTools && mcpTools.length > 0) {
        allowedTools.push(...mcpTools);
      }

      // Use Claude Code SDK with agent-specific settings
      // If projectPath is provided, use it as cwd; otherwise fall back to agent's workingDirectory
      let cwd = process.cwd();
      if (projectPath) {
        cwd = projectPath;
      } else if (agent.workingDirectory) {
        cwd = path.resolve(process.cwd(), agent.workingDirectory);
      }
      
      // const claudePath = await getClaudeExecutablePath();
      
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
      
      const queryOptions: Options = {
        customSystemPrompt: systemPrompt,
        allowedTools,
        maxTurns: agent.maxTurns,
        cwd,
        permissionMode: finalPermissionMode as any,
        model: finalModel,
        // Temporarily disable custom path to let SDK find claude automatically
        // ...(claudePath && { pathToClaudeCodeExecutable: claudePath })
      };

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
                mcpServers[serverName] = {
                  type: 'stdio',
                  command: serverConfig.command,
                  args: serverConfig.args || [],
                  env: serverConfig.env || {}
                };
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

      // Resume existing Claude session if sessionId provided
      if (sessionId) {
        queryOptions.resume = sessionId;
        console.log('🔄 Resuming Claude session:', sessionId);
      } else {
        console.log('🆕 Starting new Claude session');
      }

      // Check if we have images to use streaming input mode
      if (images && images.length > 0) {
        console.log('📸 Using streaming input mode for images:', images.map(img => ({
          id: img.id,
          mediaType: img.mediaType,
          filename: img.filename,
          size: img.data.length
        })));

        // Create async generator for streaming input with images
        async function* generateMessages() {
          const messageContent: any[] = [];
          
          // Add text content if provided
          if (message && message.trim()) {
            messageContent.push({
              type: "text",
              text: message
            });
          }
          
          // Add image content
          for (const image of images!) {
            messageContent.push({
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.data
              }
            });
          }
          
          yield {
            type: "user" as const,
            message: {
              role: "user" as const,
              content: messageContent
            }
          };
        }

        for await (const sdkMessage of query({
          prompt: generateMessages() as any,
          options: queryOptions
        })) {
          // Send each message as SSE event
          const eventData = {
            ...sdkMessage,
            timestamp: Date.now()
          };
          
          res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        }
      } else {
        // No images, use simple string prompt
        for await (const sdkMessage of query({
          prompt: message || '',
          options: queryOptions
        })) {
          // Send each message as SSE event
          const eventData = {
            ...sdkMessage,
            timestamp: Date.now()
          };
          
          res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        }
      }
      
    } catch (sdkError) {
      console.error('Claude Code SDK error:', sdkError);
      
      const errorMessage = sdkError instanceof Error ? sdkError.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'Claude Code SDK failed', 
        message: errorMessage 
      })}\n\n`);
    }
    
    res.end();
    
  } catch (error) {
    console.error('Error in AI chat:', error);
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'AI request failed', message: errorMessage });
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