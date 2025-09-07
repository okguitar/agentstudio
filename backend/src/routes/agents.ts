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

const router = express.Router();
const execAsync = promisify(exec);

// Storage instances
const globalAgentStorage = new AgentStorage();
const projectStorage = new ProjectMetadataStorage();

// Helper functions for reading Claude Code history from ~/.claude/projects
function convertProjectPathToClaudeFormat(projectPath: string): string {
  // Convert path like /Users/kongjie/claude-code-projects/ppt-editor-project-2025-08-27-00-12
  // to: -Users-kongjie-claude-code-projects-ppt-editor-project-2025-08-27-00-12
  return projectPath.replace(/\//g, '-');
}

interface ClaudeHistoryMessage {
  type: 'summary' | 'user' | 'assistant';
  summary?: string;
  message?: {
    role: 'user' | 'assistant';
    content: any[];
  };
  uuid: string;
  timestamp: string;
  sessionId: string;
  parentUuid?: string;
  leafUuid?: string;
}

interface ClaudeHistorySession {
  id: string;
  title: string;
  createdAt: string;
  lastUpdated: string;
  messages: any[];
}

function readClaudeHistorySessions(projectPath: string): ClaudeHistorySession[] {
  try {
    const claudeProjectPath = convertProjectPathToClaudeFormat(projectPath);
    const historyDir = path.join(os.homedir(), '.claude', 'projects', claudeProjectPath);
    
    if (!fs.existsSync(historyDir)) {
      console.log('Claude history directory not found:', historyDir);
      return [];
    }

    const jsonlFiles = fs.readdirSync(historyDir)
      .filter(file => file.endsWith('.jsonl'))
      .filter(file => !file.startsWith('.'));

    const sessions: ClaudeHistorySession[] = [];

    for (const filename of jsonlFiles) {
      const sessionId = filename.replace('.jsonl', '');
      const filePath = path.join(historyDir, filename);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        if (lines.length === 0) continue;

        const messages: ClaudeHistoryMessage[] = lines.map(line => JSON.parse(line));
        
        // Find summary message for session title
        const summaryMessage = messages.find(msg => msg.type === 'summary');
        const title = summaryMessage?.summary || `会话 ${sessionId.slice(0, 8)}`;
        
        // Filter user and assistant messages, but exclude tool_result-only user messages and isMeta messages
        const conversationMessages = messages.filter(msg => {
          // Filter out isMeta messages (rule 1)
          if ((msg as any).isMeta === true) {
            return false;
          }
          
          if (msg.type === 'assistant') return true;
          if (msg.type === 'user') {
            // Check if this user message contains only tool_result
            if (msg.message?.content && Array.isArray(msg.message.content)) {
              const hasNonToolResult = msg.message.content.some((block: any) => block.type !== 'tool_result');
              return hasNonToolResult; // Only include if it has content other than tool_result
            }
            // Include user messages with string content or no content array
            return typeof msg.message?.content === 'string' || !msg.message?.content;
          }
          return false;
        });
        
        if (conversationMessages.length === 0) continue;

        // Convert messages to our format and group consecutive assistant messages
        const convertedMessages: any[] = [];
        let i = 0;

        while (i < conversationMessages.length) {
          const msg = conversationMessages[i];
          
          if (msg.type === 'user') {
            // User message - always add as new message
            convertedMessages.push({
              id: `msg_${convertedMessages.length}_${msg.uuid}`,
              role: msg.message?.role || msg.type,
              content: extractContentFromClaudeMessage(msg),
              timestamp: new Date(msg.timestamp).getTime(),
              messageParts: convertClaudeMessageToMessageParts(msg)
            });
            i++;
          } else if (msg.type === 'assistant') {
            // Find all consecutive assistant messages and combine them
            const assistantMessages = [msg];
            let j = i + 1;
            
            // Collect all consecutive assistant messages
            while (j < conversationMessages.length && conversationMessages[j].type === 'assistant') {
              assistantMessages.push(conversationMessages[j]);
              j++;
            }
            
            // Create combined assistant message
            const combinedMessage = {
              id: `msg_${convertedMessages.length}_${msg.uuid}`,
              role: 'assistant',
              content: '',
              timestamp: new Date(msg.timestamp).getTime(),
              messageParts: [] as any[]
            };
            
            // Combine all assistant message parts
            assistantMessages.forEach((assistantMsg) => {
              const textContent = extractContentFromClaudeMessage(assistantMsg);
              const msgParts = convertClaudeMessageToMessageParts(assistantMsg);
              
              combinedMessage.content += textContent;
              combinedMessage.messageParts.push(...msgParts.map(part => ({
                ...part,
                order: combinedMessage.messageParts.length + part.order
              })));
            });
            
            convertedMessages.push(combinedMessage);
            i = j; // Skip to next non-assistant message
          } else {
            i++;
          }
        }

        // Process tool results - find tool_result messages and associate them with tool_use
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (msg.type === 'user' && msg.message?.content && Array.isArray(msg.message.content)) {
            for (const block of msg.message.content) {
              if (block.type === 'tool_result' && block.tool_use_id) {
                // Find the assistant message that contains the matching tool_use
                // Look backwards through conversation messages (not all messages)
                for (let j = convertedMessages.length - 1; j >= 0; j--) {
                  const assistantMsg = convertedMessages[j];
                  if (assistantMsg && assistantMsg.role === 'assistant') {
                    // Find the tool part with matching claudeId
                    const toolPart = assistantMsg.messageParts.find((part: any) => 
                      part.type === 'tool' && 
                      part.toolData && 
                      part.toolData.claudeId === block.tool_use_id
                    );
                    
                    if (toolPart && toolPart.toolData) {
                      toolPart.toolData.toolResult = typeof block.content === 'string' 
                        ? block.content 
                        : JSON.stringify(block.content);
                      toolPart.toolData.isError = block.is_error || false;
                      break;
                    }
                  }
                }
              }
            }
          }
        }

        // Get timestamps
        const timestamps = conversationMessages
          .map(msg => new Date(msg.timestamp).getTime())
          .filter(t => !isNaN(t));
        
        const createdAt = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
        const lastUpdated = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();

        sessions.push({
          id: sessionId,
          title,
          createdAt: new Date(createdAt).toISOString(),
          lastUpdated: new Date(lastUpdated).toISOString(),
          messages: convertedMessages
        });

      } catch (error) {
        console.error(`Failed to parse Claude history file ${filename}:`, error);
        continue;
      }
    }

    return sessions.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

  } catch (error) {
    console.error('Failed to read Claude history sessions:', error);
    return [];
  }
}

function extractContentFromClaudeMessage(msg: ClaudeHistoryMessage): string {
  if (!msg.message?.content) return '';
  
  // Handle both array and string content
  if (typeof msg.message.content === 'string') {
    // Rule 2: Check for command message format and extract command name only
    const commandMatch = msg.message.content.match(/<command-message>.*?<\/command-message>\s*<command-name>(.+?)<\/command-name>/);
    if (commandMatch) {
      return commandMatch[1]; // Return only the command name
    }
    return msg.message.content;
  }
  
  if (Array.isArray(msg.message.content)) {
    return msg.message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');
  }
  
  return '';
}

function convertClaudeMessageToMessageParts(msg: ClaudeHistoryMessage): any[] {
  if (!msg.message?.content) return [];
  
  // Handle string content
  if (typeof msg.message.content === 'string') {
    // Rule 2: Check for command message format and create command-specific part
    const commandMatch = msg.message.content.match(/<command-message>.*?<\/command-message>\s*<command-name>(.+?)<\/command-name>/);
    if (commandMatch) {
      return [{
        id: `part_0_${msg.uuid}`,
        type: 'command',
        content: commandMatch[1], // Only the command name
        originalContent: msg.message.content, // Keep original for reference
        order: 0
      }];
    }
    
    return [{
      id: `part_0_${msg.uuid}`,
      type: 'text',
      content: msg.message.content,
      order: 0
    }];
  }
  
  // Handle array content
  if (Array.isArray(msg.message.content)) {
    return msg.message.content.map((block: any, index: number) => {
      if (block.type === 'text') {
        return {
          id: `part_${index}_${msg.uuid}`,
          type: 'text',
          content: block.text,
          order: index
        };
      } else if (block.type === 'tool_use') {
        return {
          id: `part_${index}_${msg.uuid}`,
          type: 'tool',
          toolData: {
            id: `tool_${index}_${msg.uuid}`,
            claudeId: block.id,
            toolName: block.name,
            toolInput: block.input || {},
            toolResult: '', // Will be filled by tool_result if available
            isExecuting: false, // Historical data is not executing
            isError: false
          },
          order: index
        };
      } else if (block.type === 'tool_result') {
        // Skip tool_result blocks as they will be merged with tool_use blocks
        return null;
      } else if (block.type === 'image') {
        // Handle image content blocks
        return {
          id: `part_${index}_${msg.uuid}`,
          type: 'image',
          imageData: {
            id: `img_${index}_${msg.uuid}`,
            data: block.source?.data || '',
            mediaType: block.source?.media_type || 'image/jpeg',
            filename: `image_${index}.jpg` // Default filename since Claude history may not store original filename
          },
          order: index
        };
      }
      // Handle other content types
      return {
        id: `part_${index}_${msg.uuid}`,
        type: 'unknown',
        content: JSON.stringify(block),
        order: index
      };
    }).filter(part => part !== null);
  }
  
  return [];
}

// Function to get AgentStorage instance for specific project directory
const getAgentStorageForRequest = (req: express.Request): AgentStorage => {
  const projectPath = req.query.projectPath as string || req.body?.projectPath as string;
  const workingDir = projectPath || process.cwd();
  // console.log('Creating AgentStorage for agents route with workingDir:', workingDir);
  return new AgentStorage(workingDir);
};


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

// MCP Configuration Management Routes - MUST be before /:agentId route

// Get all MCP configurations
router.get('/mcp-configs', (req, res) => {
  try {
    const config = readMcpConfig();
    const servers: McpServerConfig[] = Object.entries(config.mcpServers).map(([name, serverConfig]) => ({
      name,
      ...serverConfig
    }));
    
    res.json({ servers });
  } catch (error) {
    console.error('Failed to get MCP configs:', error);
    res.status(500).json({ error: 'Failed to retrieve MCP configurations' });
  }
});

// Add or update MCP configuration
router.post('/mcp-configs', (req, res) => {
  try {
    const { name, command, args, timeout, autoApprove } = req.body;
    
    if (!name || !command || !Array.isArray(args)) {
      return res.status(400).json({ error: 'Missing required fields: name, command, args' });
    }
    
    const config = readMcpConfig();
    
    // Create server config without name field
    const serverConfig: Omit<McpServerConfig, 'name'> = {
      command,
      args,
      ...(timeout && { timeout }),
      ...(autoApprove && Array.isArray(autoApprove) && { autoApprove })
    };
    
    config.mcpServers[name] = serverConfig;
    writeMcpConfig(config);
    
    const responseServer: McpServerConfig = { name, ...serverConfig };
    res.json({ server: responseServer, message: 'MCP configuration saved successfully' });
  } catch (error) {
    console.error('Failed to save MCP config:', error);
    res.status(500).json({ error: 'Failed to save MCP configuration' });
  }
});

// Update MCP configuration
router.put('/mcp-configs/:name', (req, res) => {
  try {
    const { name } = req.params;
    const { command, args, timeout, autoApprove } = req.body;
    
    if (!command || !Array.isArray(args)) {
      return res.status(400).json({ error: 'Missing required fields: command, args' });
    }
    
    const config = readMcpConfig();
    
    if (!config.mcpServers[name]) {
      return res.status(404).json({ error: 'MCP configuration not found' });
    }
    
    // Update server config
    const serverConfig: Omit<McpServerConfig, 'name'> = {
      command,
      args,
      ...(timeout && { timeout }),
      ...(autoApprove && Array.isArray(autoApprove) && { autoApprove })
    };
    
    config.mcpServers[name] = serverConfig;
    writeMcpConfig(config);
    
    const responseServer: McpServerConfig = { name, ...serverConfig };
    res.json({ server: responseServer, message: 'MCP configuration updated successfully' });
  } catch (error) {
    console.error('Failed to update MCP config:', error);
    res.status(500).json({ error: 'Failed to update MCP configuration' });
  }
});

// Delete MCP configuration
router.delete('/mcp-configs/:name', (req, res) => {
  try {
    const { name } = req.params;
    const config = readMcpConfig();
    
    if (!config.mcpServers[name]) {
      return res.status(404).json({ error: 'MCP configuration not found' });
    }
    
    delete config.mcpServers[name];
    writeMcpConfig(config);
    
    res.json({ success: true, message: 'MCP configuration deleted successfully' });
  } catch (error) {
    console.error('Failed to delete MCP config:', error);
    res.status(500).json({ error: 'Failed to delete MCP configuration' });
  }
});

// Validate MCP server by testing connection and getting tools
router.post('/mcp-configs/:name/validate', async (req, res) => {
  try {
    const { name } = req.params;
    const config = readMcpConfig();
    
    if (!config.mcpServers[name]) {
      return res.status(404).json({ error: 'MCP configuration not found' });
    }
    
    const serverConfig = config.mcpServers[name];
    
    // Start MCP server process to test connection
    console.log('Starting MCP server:', serverConfig.command, serverConfig.args);
    const child = spawn(serverConfig.command, serverConfig.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: serverConfig.timeout || 15000
    });
    
    let stdout = '';
    let stderr = '';
    let tools: string[] = [];
    

    
    child.stderr?.on('data', (data) => {
      const errorStr = data.toString();
      console.log('MCP stderr:', errorStr);
      stderr += errorStr;
    });
    
    let initializeDone = false;
    
    // Send initialize request to MCP server
    const initializeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'claude-code-studio',
          version: '1.0.0'
        }
      }
    };
    
    child.stdin?.write(JSON.stringify(initializeRequest) + '\n');
    
    let buffer = '';
    
    // Listen for stdout and parse responses in real-time
    child.stdout?.on('data', (data) => {
      const dataStr = data.toString();
      stdout += dataStr;
      buffer += dataStr;
      
      // Try to parse complete JSON messages
      const lines = buffer.split('\n');
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const response = JSON.parse(line);
          console.log('MCP response:', response);
          
          // Check if initialization was successful
          if (response.id === 1 && response.result && !initializeDone) {
            console.log('Initialize successful, sending initialized notification');
            initializeDone = true;
            
            // Send initialized notification
            const initializedNotification = {
              jsonrpc: '2.0',
              method: 'notifications/initialized'
            };
            child.stdin?.write(JSON.stringify(initializedNotification) + '\n');
            
            // Send tools/list request
            setTimeout(() => {
              console.log('Sending tools/list request');
              const toolsRequest = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
                params: {}
              };
              child.stdin?.write(JSON.stringify(toolsRequest) + '\n');
            }, 500);
          }
          
          // Handle tools/list response
          if (response.id === 2 && response.result) {
            console.log('Tools/list response received:', response.result);
            if (response.result.tools) {
              tools = response.result.tools.map((tool: any) => tool.name);
              console.log('Found tools:', tools);
            }
            // Close stdin after getting tools response (even if empty)
            setTimeout(() => child.stdin?.end(), 100);
          }
        } catch (parseError) {
          // This might be a partial JSON, continue buffering
          console.log('Parse error for line:', line.substring(0, 100) + '...');
        }
      }
      
      // Also try to parse the buffer as a complete JSON in case it's all one response
      if (buffer.trim()) {
        try {
          const response = JSON.parse(buffer);
          console.log('MCP buffered response:', response);
          
          // Handle tools/list response from buffer
          if (response.id === 2 && response.result) {
            console.log('Tools/list response received from buffer:', response.result);
            if (response.result.tools) {
              tools = response.result.tools.map((tool: any) => tool.name);
              console.log('Found tools from buffer:', tools);
            }
            // Clear buffer and close stdin
            buffer = '';
            setTimeout(() => child.stdin?.end(), 100);
          }
        } catch (parseError) {
          // Buffer is not complete JSON yet, continue
        }
      }
    });
    
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
    }, serverConfig.timeout || 10000);
    
    child.on('close', (code) => {
      clearTimeout(timeoutId);
      
      try {
        const config = readMcpConfig();
        const currentTime = new Date().toISOString();
        
        if (code === 0 || tools.length > 0) {
          // Update server config with successful validation
          if (config.mcpServers[name]) {
            config.mcpServers[name] = {
              ...config.mcpServers[name],
              status: 'active',
              tools,
              lastValidated: currentTime,
              error: undefined
            };
            writeMcpConfig(config);
          }
          
          res.json({
            success: true,
            tools,
            message: `MCP server validated successfully. Found ${tools.length} tools.`
          });
        } else {
          // Update server config with error status
          const errorMessage = `MCP server validation failed with exit code ${code}`;
          if (config.mcpServers[name]) {
            config.mcpServers[name] = {
              ...config.mcpServers[name],
              status: 'error',
              error: errorMessage,
              tools: undefined,
              lastValidated: currentTime
            };
            writeMcpConfig(config);
          }
          
          res.status(400).json({
            error: errorMessage,
            details: stderr || 'No error details available'
          });
        }
      } catch (configError) {
        console.error('Failed to update config with validation result:', configError);
        
        // Still return the validation result even if config update fails
        if (code === 0 || tools.length > 0) {
          res.json({
            success: true,
            tools,
            message: `MCP server validated successfully. Found ${tools.length} tools.`
          });
        } else {
          res.status(400).json({
            error: `MCP server validation failed with exit code ${code}`,
            details: stderr || 'No error details available'
          });
        }
      }
    });
    
    child.on('error', (error) => {
      clearTimeout(timeoutId);
      
      try {
        const config = readMcpConfig();
        if (config.mcpServers[name]) {
          config.mcpServers[name] = {
            ...config.mcpServers[name],
            status: 'error',
            error: `Failed to start MCP server: ${error.message}`,
            tools: undefined,
            lastValidated: new Date().toISOString()
          };
          writeMcpConfig(config);
        }
      } catch (configError) {
        console.error('Failed to update config with error status:', configError);
      }
      
      res.status(500).json({
        error: 'Failed to start MCP server',
        details: error.message
      });
    });
    
  } catch (error) {
    console.error('Failed to validate MCP server:', error);
    res.status(500).json({ 
      error: 'Failed to validate MCP server',
      details: error instanceof Error ? error.message : String(error)
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



// Projects management routes - MUST be before /:agentId route
// Using new project metadata storage system
router.get('/projects', (req, res) => {
  try {
    const projects = projectStorage.getAllProjects();
    res.json({ projects });
  } catch (error) {
    console.error('Failed to get projects:', error);
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
});

// Get projects for a specific agent
router.get('/projects/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Verify agent exists
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Get all projects and filter by agent
    const allProjects = projectStorage.getAllProjects();
    const agentProjects = allProjects.filter(project => 
      project.agents.includes(agentId)
    );
    
    res.json({ projects: agentProjects });
  } catch (error) {
    console.error('Failed to get agent projects:', error);
    res.status(500).json({ error: 'Failed to retrieve agent projects' });
  }
});

// Create new project directory in ~/.claude/projects
router.post('/projects/create', (req, res) => {
  try {
    const { agentId, projectName, parentDirectory, description } = req.body;
    
    if (!agentId || !projectName) {
      return res.status(400).json({ error: 'Agent ID and project name are required' });
    }
    
    // Verify agent exists
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Use custom parent directory if provided, otherwise default to ~/claude-code-projects
    let projectPath: string;
    if (parentDirectory && parentDirectory !== '~/claude-code-projects') {
      // Expand tilde if present
      const expandedParent = parentDirectory.startsWith('~/') 
        ? path.join(os.homedir(), parentDirectory.slice(2))
        : parentDirectory;
      projectPath = path.join(expandedParent, projectName);
    } else {
      const homeDir = os.homedir();
      const projectsDir = path.join(homeDir, 'claude-code-projects');
      projectPath = path.join(projectsDir, projectName);
      
      // Create projects directory if it doesn't exist
      if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
      }
    }
    
    // Create project directory
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
      
      // Create .cc-sessions directory and project metadata
      const sessionsDir = path.join(projectPath, '.cc-sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      
      const projectMetadata = {
        name: projectName,
        description: description || '',
        agentId,
        agentName: agent.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(
        path.join(sessionsDir, 'project.json'), 
        JSON.stringify(projectMetadata, null, 2)
      );
      
      // Create a basic README file
      const readmeContent = `# ${projectName}

Created with ${agent.name} on ${new Date().toLocaleString()}

${description ? `## Description\n${description}\n\n` : ''}This is your project workspace. You can:
- Store your files here
- Create subdirectories for organization  
- Use this directory for your ${agent.name} sessions

The conversation history will be saved in \`.cc-sessions/${agentId}/\` within this directory.
`;
      
      fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent);
      
      // Add project path to agent's projects list
      if (!agent.projects) {
        agent.projects = [];
      }
      const normalizedPath = path.resolve(projectPath);
      if (!agent.projects.includes(normalizedPath)) {
        agent.projects.unshift(normalizedPath); // Add to beginning for most recent
        agent.updatedAt = new Date().toISOString();
        globalAgentStorage.saveAgent(agent);
      }
      
      // Return project info that matches frontend interface
      const projectId = `${agentId}-${Buffer.from(normalizedPath).toString('base64').replace(/[+/=]/g, '').slice(-8)}`;
      
      res.json({ 
        success: true, 
        project: {
          id: projectId,
          name: projectName,
          path: normalizedPath,
          agentId,
          agentName: agent.name,
          agentIcon: agent.ui.icon,
          agentColor: agent.ui.primaryColor,
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          description: description || ''
        },
        message: `Project "${projectName}" created successfully`
      });
    } else {
      res.status(409).json({ error: 'Project directory already exists' });
    }
    
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({ 
      error: 'Failed to create project directory', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.put('/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const { description } = req.body;
    
    // Find project by ID
    const agents = globalAgentStorage.getAllAgents();
    let targetProject = null;
    let targetAgent = null;
    
    for (const agent of agents) {
      if (agent.projects && agent.projects.length > 0) {
        for (const projectPath of agent.projects) {
          const id = `${agent.id}-${Buffer.from(projectPath).toString('base64').replace(/[+/=]/g, '').slice(-8)}`;
          if (id === projectId) {
            targetProject = projectPath;
            targetAgent = agent;
            break;
          }
        }
        if (targetProject) break;
      }
    }
    
    if (!targetProject || !fs.existsSync(targetProject)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update project metadata
    const sessionsDir = path.join(targetProject, '.cc-sessions');
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }
    
    const metadataPath = path.join(sessionsDir, 'project.json');
    let metadata = {};
    
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch (error) {
        // Start with empty metadata if file is corrupted
      }
    }
    
    const updatedMetadata = {
      ...metadata,
      description: description || '',
      updatedAt: new Date().toISOString(),
      createdAt: (metadata as any).createdAt || fs.statSync(targetProject).birthtime.toISOString()
    };
    
    fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Project updated successfully'
    });
    
  } catch (error) {
    console.error('Failed to update project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Find project by ID
    const agents = globalAgentStorage.getAllAgents();
    let targetProject = null;
    let targetAgent = null;
    
    for (const agent of agents) {
      if (agent.projects && agent.projects.length > 0) {
        for (let i = 0; i < agent.projects.length; i++) {
          const projectPath = agent.projects[i];
          const id = `${agent.id}-${Buffer.from(projectPath).toString('base64').replace(/[+/=]/g, '').slice(-8)}`;
          if (id === projectId) {
            targetProject = projectPath;
            targetAgent = agent;
            
            // Remove project from agent's projects list
            agent.projects.splice(i, 1);
            agent.updatedAt = new Date().toISOString();
            globalAgentStorage.saveAgent(agent);
            break;
          }
        }
        if (targetProject) break;
      }
    }
    
    if (!targetProject) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Project removed from list successfully',
      note: 'Project directory was not deleted from filesystem'
    });
    
  } catch (error) {
    console.error('Failed to delete project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
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

// Agent sessions routes
router.get('/:agentId/sessions', (req, res) => {
  try {
    const { agentId } = req.params;
    const { search } = req.query;
    const projectPath = req.query.projectPath as string;
    
    // Verify agent exists
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    let sessions: any[] = [];
    
    // If projectPath is provided, read from Claude Code history
    if (projectPath) {
      console.log('Reading Claude history sessions for project:', projectPath);
      const claudeSessions = readClaudeHistorySessions(projectPath);
      sessions = claudeSessions.map(session => ({
        id: session.id,
        agentId: agentId, // Associate with current agent
        title: session.title,
        createdAt: session.createdAt,
        lastUpdated: session.lastUpdated,
        messageCount: session.messages.length
      }));
    } else {
      // Use project-specific AgentStorage for sessions (existing behavior)
      const agentStorage = getAgentStorageForRequest(req);
      const agentSessions = agentStorage.getAgentSessions(agentId, search as string);
      sessions = agentSessions.map(session => ({
        id: session.id,
        agentId: session.agentId,
        title: session.title,
        createdAt: session.createdAt,
        lastUpdated: session.lastUpdated,
        messageCount: session.messages.length
      }));
    }
    
    // Apply search filter if provided
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      sessions = sessions.filter(session => 
        session.title.toLowerCase().includes(searchTerm)
      );
    }
    
    res.json({ sessions });
  } catch (error) {
    console.error('Failed to get agent sessions:', error);
    res.status(500).json({ error: 'Failed to retrieve agent sessions' });
  }
});

router.get('/:agentId/sessions/:sessionId/messages', (req, res) => {
  try {
    const { agentId, sessionId } = req.params;
    const projectPath = req.query.projectPath as string;
    
    let session: any = null;
    
    // If projectPath is provided, read from Claude Code history
    if (projectPath) {
      console.log('Reading Claude history messages for session:', sessionId, 'in project:', projectPath);
      const claudeSessions = readClaudeHistorySessions(projectPath);
      session = claudeSessions.find(s => s.id === sessionId);
      
      if (session) {
        // Add agentId to match expected format
        session = {
          ...session,
          agentId: agentId
        };
      }
    } else {
      // Use project-specific AgentStorage for sessions (existing behavior)
      const agentStorage = getAgentStorageForRequest(req);
      session = agentStorage.getSession(agentId, sessionId);
    }
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ 
      sessionId: session.id,
      agentId: session.agentId,
      title: session.title,
      messages: session.messages 
    });
  } catch (error) {
    console.error('Failed to get session messages:', error);
    res.status(500).json({ error: 'Failed to retrieve session messages' });
  }
});

router.post('/:agentId/sessions', (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Verify agent exists
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Use project-specific AgentStorage for sessions
    const agentStorage = getAgentStorageForRequest(req);
    const session = agentStorage.createSession(agentId, req.body.title);
    res.json({ sessionId: session.id, session });
  } catch (error) {
    console.error('Failed to create agent session:', error);
    res.status(500).json({ error: 'Failed to create agent session' });
  }
});

router.delete('/:agentId/sessions/:sessionId', (req, res) => {
  try {
    const { agentId, sessionId } = req.params;
    
    // Use project-specific AgentStorage for sessions
    const agentStorage = getAgentStorageForRequest(req);
    const deleted = agentStorage.deleteSession(agentId, sessionId);
    res.json({ success: deleted });
  } catch (error) {
    console.error('Failed to delete agent session:', error);
    res.status(500).json({ error: 'Failed to delete agent session' });
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

    const { message, images, agentId, context, sessionId, projectPath, mcpTools } = validation.data;
    
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
      const queryOptions: Options = {
        customSystemPrompt: systemPrompt,
        allowedTools,
        maxTurns: agent.maxTurns,
        cwd,
        permissionMode: agent.permissionMode as any,
        // Temporarily disable custom path to let SDK find claude automatically
        // ...(claudePath && { pathToClaudeCodeExecutable: claudePath })
      };

      // Add MCP configuration if MCP tools are selected
      if (mcpTools && mcpTools.length > 0) {
        const mcpConfigPath = path.join(os.homedir(), '.claude-agent', 'mcp-server.json');
        if (fs.existsSync(mcpConfigPath)) {
          try {
            const mcpConfigContent = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
            
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

// File browser API
router.get('/filesystem/browse', (req, res) => {
  try {
    const { path: requestedPath } = req.query;
    
    // Default to home directory if no path provided
    const browsePath = requestedPath ? String(requestedPath) : os.homedir();
    
    // Security check: ensure path is safe
    if (browsePath.includes('..') || !path.isAbsolute(browsePath)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    
    if (!fs.existsSync(browsePath)) {
      return res.status(404).json({ error: 'Path not found' });
    }
    
    const stats = fs.statSync(browsePath);
    
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }
    
    const items = fs.readdirSync(browsePath)
      .map(name => {
        const itemPath = path.join(browsePath, name);
        try {
          const itemStats = fs.statSync(itemPath);
          return {
            name,
            path: itemPath,
            isDirectory: itemStats.isDirectory(),
            size: itemStats.isDirectory() ? null : itemStats.size,
            modified: itemStats.mtime.toISOString(),
            isHidden: name.startsWith('.')
          };
        } catch (error) {
          // Skip items that can't be read
          return null;
        }
      })
      .filter(item => item !== null)
      .sort((a, b) => {
        // Directories first, then by name
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    
    // Get parent directory info
    const parentPath = path.dirname(browsePath);
    const canGoUp = browsePath !== parentPath;
    
    res.json({
      currentPath: browsePath,
      parentPath: canGoUp ? parentPath : null,
      items
    });
    
  } catch (error) {
    console.error('File browser error:', error);
    res.status(500).json({ error: 'Failed to browse directory' });
  }
});

// Create new directory
router.post('/filesystem/create-directory', (req, res) => {
  try {
    const { parentPath, directoryName } = req.body;
    
    if (!parentPath || !directoryName) {
      return res.status(400).json({ error: 'Parent path and directory name are required' });
    }
    
    // Security checks
    if (directoryName.includes('..') || directoryName.includes('/') || directoryName.includes('\\')) {
      return res.status(400).json({ error: 'Invalid directory name' });
    }
    
    if (parentPath.includes('..') || !path.isAbsolute(parentPath)) {
      return res.status(400).json({ error: 'Invalid parent path' });
    }
    
    if (!fs.existsSync(parentPath)) {
      return res.status(404).json({ error: 'Parent directory not found' });
    }
    
    const newDirPath = path.join(parentPath, directoryName);
    
    if (fs.existsSync(newDirPath)) {
      return res.status(409).json({ error: 'Directory already exists' });
    }
    
    fs.mkdirSync(newDirPath, { recursive: true });
    
    res.json({
      success: true,
      directoryPath: newDirPath,
      message: `Directory "${directoryName}" created successfully`
    });
    
  } catch (error) {
    console.error('Create directory error:', error);
    res.status(500).json({ 
      error: 'Failed to create directory',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});



// MCP Configuration Management Helper Functions

// MCP configuration interface
interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  timeout?: number;
  autoApprove?: string[];
  status?: 'active' | 'error' | 'validating';
  error?: string;
  tools?: string[];
  lastValidated?: string;
}

interface McpConfigFile {
  mcpServers: Record<string, Omit<McpServerConfig, 'name'>>;
}

// Helper function to get MCP config file path
const getMcpConfigPath = (): string => {
  return path.join(os.homedir(), '.claude-agent', 'mcp-server.json');
};

// Helper function to ensure config directory exists
const ensureConfigDirectory = (): void => {
  const configDir = path.dirname(getMcpConfigPath());
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
};

// Helper function to read MCP config
const readMcpConfig = (): McpConfigFile => {
  const configPath = getMcpConfigPath();
  
  if (!fs.existsSync(configPath)) {
    return { mcpServers: {} };
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read MCP config:', error);
    return { mcpServers: {} };
  }
};

// Helper function to write MCP config
const writeMcpConfig = (config: McpConfigFile): void => {
  ensureConfigDirectory();
  const configPath = getMcpConfigPath();
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to write MCP config:', error);
    throw error;
  }
};

export default router;