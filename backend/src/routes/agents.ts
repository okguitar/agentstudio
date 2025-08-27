import express from 'express';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
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
  permissionMode: z.enum(['ask', 'acceptEdits', 'acceptAll']).optional().default('acceptEdits'),
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
      id: agentId // Ensure ID doesn't change
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
    const { agentId, projectName, parentDirectory } = req.body;
    
    if (!agentId || !projectName) {
      return res.status(400).json({ error: 'Agent ID and project name are required' });
    }
    
    // Use custom parent directory if provided, otherwise default to ~/claude-code-projects
    let projectPath: string;
    if (parentDirectory) {
      projectPath = path.join(parentDirectory, projectName);
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
      
      // Create a basic README file
      const readmeContent = `# ${projectName}

Created with ${agentId} agent on ${new Date().toLocaleString()}

This is your project workspace. You can:
- Store your files here
- Create subdirectories for organization  
- Use this directory for your ${agentId} sessions

The conversation history will be saved in \`.cc-sessions/${agentId}/\` within this directory.
`;
      
      fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent);
      
      // Add project path to agent's projects list
      const agent = globalAgentStorage.getAgent(agentId);
      if (agent) {
        if (!agent.projects) {
          agent.projects = [];
        }
        const normalizedPath = path.resolve(projectPath);
        if (!agent.projects.includes(normalizedPath)) {
          agent.projects.unshift(normalizedPath); // Add to beginning for most recent
          agent.updatedAt = new Date().toISOString();
          globalAgentStorage.saveAgent(agent);
        }
      }
      
      res.json({ 
        success: true, 
        projectPath,
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

export default router;