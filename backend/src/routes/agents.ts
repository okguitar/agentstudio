import express from 'express';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import { AgentStorage } from '../../shared/utils/agentStorage.js';
import { AgentConfig } from '../../shared/types/agents.js';

const router = express.Router();

// Function to get AgentStorage instance for specific project directory
const getAgentStorageForRequest = (req: express.Request): AgentStorage => {
  const projectPath = req.query.projectPath as string || req.body?.projectPath as string;
  const workingDir = projectPath || process.cwd();
  // console.log('Creating AgentStorage for agents route with workingDir:', workingDir);
  return new AgentStorage(workingDir);
};

// For agent configuration operations, we still use the global one
const globalAgentStorage = new AgentStorage();

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
    
    // Verify agent exists
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Use project-specific AgentStorage for sessions
    const agentStorage = getAgentStorageForRequest(req);
    const sessions = agentStorage.getAgentSessions(agentId, search as string);
    const sessionList = sessions.map(session => ({
      id: session.id,
      agentId: session.agentId,
      title: session.title,
      createdAt: session.createdAt,
      lastUpdated: session.lastUpdated,
      messageCount: session.messages.length
    }));
    
    res.json({ sessions: sessionList });
  } catch (error) {
    console.error('Failed to get agent sessions:', error);
    res.status(500).json({ error: 'Failed to retrieve agent sessions' });
  }
});

router.get('/:agentId/sessions/:sessionId/messages', (req, res) => {
  try {
    const { agentId, sessionId } = req.params;
    
    // Use project-specific AgentStorage for sessions
    const agentStorage = getAgentStorageForRequest(req);
    const session = agentStorage.getSession(agentId, sessionId);
    
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

// Create new project directory
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
      const projectId = `${agentId}-${Buffer.from(normalizedPath).toString('base64').slice(0, 8)}`;
      
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

// Projects management routes
router.get('/projects', (req, res) => {
  try {
    const agents = globalAgentStorage.getAllAgents();
    const projects = [];
    
    // Gather projects from all agents
    for (const agent of agents) {
      if (agent.projects && agent.projects.length > 0) {
        for (const projectPath of agent.projects) {
          try {
            // Check if directory still exists
            if (fs.existsSync(projectPath)) {
              const stats = fs.statSync(projectPath);
              const projectName = path.basename(projectPath);
              
              // Try to get project metadata if it exists
              const metadataPath = path.join(projectPath, '.cc-sessions', 'project.json');
              let description = '';
              let createdAt = stats.birthtime.toISOString();
              
              if (fs.existsSync(metadataPath)) {
                try {
                  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
                  description = metadata.description || '';
                  createdAt = metadata.createdAt || createdAt;
                } catch (error) {
                  // Ignore metadata read errors
                }
              }
              
              // Get last accessed time from agent sessions
              const sessionsDir = path.join(projectPath, '.cc-sessions', agent.id);
              let lastAccessed = createdAt;
              if (fs.existsSync(sessionsDir)) {
                try {
                  const sessionFiles = fs.readdirSync(sessionsDir)
                    .filter(file => file.endsWith('.json'))
                    .map(file => {
                      const sessionPath = path.join(sessionsDir, file);
                      return fs.statSync(sessionPath).mtime;
                    })
                    .sort((a, b) => b.getTime() - a.getTime());
                  
                  if (sessionFiles.length > 0) {
                    lastAccessed = sessionFiles[0].toISOString();
                  }
                } catch (error) {
                  // Ignore session read errors
                }
              }
              
              projects.push({
                id: `${agent.id}-${Buffer.from(projectPath).toString('base64').slice(0, 8)}`,
                name: projectName,
                path: projectPath,
                agentId: agent.id,
                agentName: agent.name,
                agentIcon: agent.ui.icon,
                agentColor: agent.ui.primaryColor,
                createdAt,
                lastAccessed,
                description
              });
            }
          } catch (error) {
            // Skip projects that can't be read
            console.warn(`Failed to read project ${projectPath}:`, error);
          }
        }
      }
    }
    
    // Sort by last accessed time (most recent first)
    projects.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
    
    res.json({ projects });
  } catch (error) {
    console.error('Failed to get projects:', error);
    res.status(500).json({ error: 'Failed to retrieve projects' });
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
          const id = `${agent.id}-${Buffer.from(projectPath).toString('base64').slice(0, 8)}`;
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
          const id = `${agent.id}-${Buffer.from(projectPath).toString('base64').slice(0, 8)}`;
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