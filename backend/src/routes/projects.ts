import express from 'express';
import fs from 'fs';
import path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { ProjectMetadataStorage } from '../../shared/utils/projectMetadataStorage.js';
import { AgentStorage } from '../../shared/utils/agentStorage.js';

const router: express.Router = express.Router();
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

// Use the new project metadata storage
const projectStorage = new ProjectMetadataStorage();
// Global agent storage for agent management
const globalAgentStorage = new AgentStorage();

// Ensure directory exists
async function ensureDir(dirPath: string) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

// GET /api/projects - Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = projectStorage.getAllProjects();
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:dirName - Get specific project
router.get('/:dirName', async (req, res) => {
  try {
    const { dirName } = req.params;
    const project = projectStorage.getProject(dirName);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const { name, dirName, agentId, description, tags, metadata } = req.body;
    
    if (!dirName) {
      return res.status(400).json({ error: 'Directory name is required' });
    }
    
    // Check if project directory already exists
    const existingProject = projectStorage.getProject(dirName);
    if (existingProject) {
      return res.status(409).json({ error: 'Project directory already exists' });
    }
    
    const projectMetadata = projectStorage.createProject(dirName, {
      name: name || dirName,
      description,
      agentId,
      tags,
      metadata
    });
    
    const project = projectStorage.getProject(dirName);
    res.json({ project, metadata: projectMetadata });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:dirName - Update project info
router.put('/:dirName', async (req, res) => {
  try {
    const { dirName } = req.params;
    const { name, description, tags, metadata } = req.body;
    
    const project = projectStorage.getProject(dirName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update basic info
    if (name !== undefined || description !== undefined) {
      projectStorage.updateProjectInfo(dirName, { name, description });
    }
    
    // Update tags
    if (tags !== undefined) {
      projectStorage.updateProjectTags(dirName, tags);
    }
    
    // Update metadata
    if (metadata !== undefined) {
      projectStorage.updateProjectMetadata(dirName, metadata);
    }
    
    const updatedProject = projectStorage.getProject(dirName);
    res.json({ project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:dirName - Delete project metadata
router.delete('/:dirName', async (req, res) => {
  try {
    const { dirName } = req.params;
    
    const success = projectStorage.deleteProject(dirName);
    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// PUT /api/projects/:dirName/default-agent - Set default agent
router.put('/:dirName/default-agent', async (req, res) => {
  try {
    const { dirName } = req.params;
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    projectStorage.setDefaultAgent(dirName, agentId);
    const updatedProject = projectStorage.getProject(dirName);
    
    res.json({ project: updatedProject });
  } catch (error) {
    console.error('Error setting default agent:', error);
    res.status(500).json({ error: 'Failed to set default agent' });
  }
});

// PUT /api/projects/:dirName/agents/:agentId - Enable/disable agent for project
router.put('/:dirName/agents/:agentId', async (req, res) => {
  try {
    const { dirName, agentId } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled must be a boolean' });
    }
    
    if (enabled) {
      projectStorage.addAgentToProject(dirName, agentId);
    } else {
      projectStorage.removeAgentFromProject(dirName, agentId);
    }
    
    const updatedProject = projectStorage.getProject(dirName);
    res.json({ project: updatedProject });
  } catch (error) {
    console.error('Error updating project agent:', error);
    res.status(500).json({ error: 'Failed to update project agent' });
  }
});


// GET /api/projects/:dirName/check-agent - Check if project needs agent selection
router.get('/:dirName/check-agent', async (req, res) => {
  try {
    const { dirName } = req.params;
    
    const project = projectStorage.getProject(dirName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const needsAgent = project.agents.length === 0 || !project.defaultAgent;
    
    res.json({ 
      needsAgent,
      project: {
        name: project.name,
        path: project.path,
        agents: project.agents,
        defaultAgent: project.defaultAgent
      }
    });
  } catch (error) {
    console.error('Error checking project agent:', error);
    res.status(500).json({ error: 'Failed to check project agent' });
  }
});

// POST /api/projects/:dirName/select-agent - Select first agent for project
router.post('/:dirName/select-agent', async (req, res) => {
  try {
    const { dirName } = req.params;
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // Add the agent to the project and set it as default
    projectStorage.addAgentToProject(dirName, agentId);
    projectStorage.setDefaultAgent(dirName, agentId);
    
    const updatedProject = projectStorage.getProject(dirName);
    
    res.json({ 
      success: true,
      project: updatedProject 
    });
  } catch (error) {
    console.error('Error selecting agent for project:', error);
    res.status(500).json({ error: 'Failed to select agent for project' });
  }
});

// GET /api/projects/:dirName/claude-md - Get project CLAUDE.md content
router.get('/:dirName/claude-md', async (req, res) => {
  try {
    const { dirName } = req.params;
    
    const project = projectStorage.getProject(dirName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Try to find CLAUDE.md in project directory first, then parent directory
    let claudeFilePath = path.join(project.path, 'CLAUDE.md');
    console.log('Looking for CLAUDE.md at:', claudeFilePath);

    try {
      const content = await readFile(claudeFilePath, 'utf-8');
      console.log('Successfully read CLAUDE.md, content length:', content.length);
      res.json({ content });
    } catch (error: any) {
      console.log('Error reading CLAUDE.md from project dir:', error.code);
      
      if (error.code === 'ENOENT') {
        // Try parent directory
        const parentClaudeFilePath = path.join(path.dirname(project.path), 'CLAUDE.md');
        console.log('Trying parent directory:', parentClaudeFilePath);
        
        try {
          const content = await readFile(parentClaudeFilePath, 'utf-8');
          console.log('Successfully read CLAUDE.md from parent dir, content length:', content.length);
          res.json({ content });
        } catch (parentError: any) {
          console.log('Error reading CLAUDE.md from parent dir:', parentError.code);
          if (parentError.code === 'ENOENT') {
            // File doesn't exist in either location, return empty content
            res.json({ content: '' });
          } else {
            throw parentError;
          }
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error reading CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to read CLAUDE.md file' });
  }
});

// PUT /api/projects/:dirName/claude-md - Update project CLAUDE.md content
router.put('/:dirName/claude-md', async (req, res) => {
  try {
    const { dirName } = req.params;
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    const project = projectStorage.getProject(dirName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Decide where to save the file - prefer project directory, but check if parent has existing file
    let claudeFilePath = path.join(project.path, 'CLAUDE.md');
    const parentClaudeFilePath = path.join(path.dirname(project.path), 'CLAUDE.md');
    
    // Check if parent directory already has CLAUDE.md
    try {
      await stat(parentClaudeFilePath);
      // Parent file exists, use that location
      claudeFilePath = parentClaudeFilePath;
      console.log('Using existing CLAUDE.md in parent directory:', claudeFilePath);
    } catch (error: any) {
      // Parent file doesn't exist, use project directory
      console.log('Using project directory for CLAUDE.md:', claudeFilePath);
    }

    // Ensure directory exists
    await ensureDir(path.dirname(claudeFilePath));

    // Write the content
    await writeFile(claudeFilePath, content, 'utf-8');

    res.json({ success: true });
  } catch (error) {
    console.error('Error writing CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to write CLAUDE.md file' });
  }
});

// ========== ROUTES MIGRATED FROM AGENTS.TS ==========

// GET /api/projects/agents/:agentId - Get projects for a specific agent
router.get('/agents/:agentId', (req, res) => {
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

// POST /api/projects/create - Create new project directory in ~/.claude/projects
router.post('/create', (req, res) => {
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

// PUT /api/projects/by-id/:projectId - Update project metadata (legacy format support)
router.put('/by-id/:projectId', (req, res) => {
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

// DELETE /api/projects/by-id/:projectId - Remove project from agent's list (legacy format support)
router.delete('/by-id/:projectId', (req, res) => {
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

export default router;