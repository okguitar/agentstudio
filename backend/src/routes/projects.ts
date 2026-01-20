import express from 'express';
import fs from 'fs';
import path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { ProjectMetadataStorage } from '../services/projectMetadataStorage';
import { AgentStorage } from '../services/agentStorage';
import { loadA2AConfig, saveA2AConfig, validateA2AConfig } from '../services/a2a/a2aConfigService.js';
import {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  getApiKey,
} from '../services/a2a/apiKeyService.js';
import { A2AConfigSchema, GenerateApiKeyRequestSchema, validateSafe } from '../schemas/a2a.js';

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
router.get('/', async (_req, res) => {
  try {
    const projects = projectStorage.getAllProjects();
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/claude-md - Get project CLAUDE.md content (via query param)
// MUST be defined before /:dirName to avoid route matching issues
router.get('/claude-md', async (req, res) => {
  try {
    const projectPath = req.query.path as string;
    
    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }
    
    console.log('[claude-md] Looking for project with path:', projectPath);
    
    // Try to read CLAUDE.md directly from the path
    try {
      const claudeFilePath = path.join(projectPath, 'CLAUDE.md');
      const content = await readFile(claudeFilePath, 'utf-8');
      console.log('[claude-md] Successfully read CLAUDE.md, content length:', content.length);
      return res.json({ content });
    } catch (directError: any) {
      if (directError.code === 'ENOENT') {
        // Try parent directory
        const parentClaudeFilePath = path.join(path.dirname(projectPath), 'CLAUDE.md');
        try {
          const content = await readFile(parentClaudeFilePath, 'utf-8');
          console.log('[claude-md] Successfully read CLAUDE.md from parent, content length:', content.length);
          return res.json({ content });
        } catch (parentError: any) {
          if (parentError.code === 'ENOENT') {
            return res.json({ content: '' });
          }
          throw parentError;
        }
      }
      throw directError;
    }
  } catch (error) {
    console.error('Error reading CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to read CLAUDE.md file' });
  }
});

// PUT /api/projects/claude-md - Update project CLAUDE.md content (via query param)
// MUST be defined before /:dirName to avoid route matching issues
router.put('/claude-md', async (req, res) => {
  try {
    const projectPath = req.query.path as string;
    const { content } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    console.log('[claude-md PUT] Saving to project path:', projectPath);

    // Decide where to save the file - prefer project directory, but check if parent has existing file
    let claudeFilePath = path.join(projectPath, 'CLAUDE.md');
    const parentClaudeFilePath = path.join(path.dirname(projectPath), 'CLAUDE.md');
    
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

    // Write the file
    await writeFile(claudeFilePath, content, 'utf-8');
    console.log('Successfully wrote CLAUDE.md to:', claudeFilePath);

    res.json({ success: true, path: claudeFilePath });
  } catch (error) {
    console.error('Error writing CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to write CLAUDE.md file' });
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
    
    // Include provider/model settings from metadata
    const projectMeta = projectStorage.getProjectMetadata(dirName);
    res.json({ 
      project: {
        ...project,
        defaultProviderId: projectMeta?.defaultProviderId,
        defaultModel: projectMeta?.defaultModel,
      }
    });
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
    const { name, description, tags, metadata, defaultProviderId, defaultModel } = req.body;
    
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
    
    // Update default provider and model
    if (defaultProviderId !== undefined || defaultModel !== undefined) {
      const projectMeta = projectStorage.getProjectMetadata(dirName);
      if (projectMeta) {
        if (defaultProviderId !== undefined) {
          // Empty string clears the value
          projectMeta.defaultProviderId = defaultProviderId || undefined;
        }
        if (defaultModel !== undefined) {
          // Empty string clears the value
          projectMeta.defaultModel = defaultModel || undefined;
        }
        projectMeta.lastAccessed = new Date().toISOString();
        projectStorage.saveProjectMetadata(dirName, projectMeta);
      }
    }
    
    const updatedProject = projectStorage.getProject(dirName);
    
    // Include provider/model settings in response
    const projectMeta = projectStorage.getProjectMetadata(dirName);
    res.json({ 
      project: {
        ...updatedProject,
        defaultProviderId: projectMeta?.defaultProviderId,
        defaultModel: projectMeta?.defaultModel,
      }
    });
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
// Note: dirName is actually the full project path (URL encoded)
router.put('/:dirName/default-agent', async (req, res) => {
  try {
    // dirName here is actually the full project path (URL encoded)
    const projectPath = decodeURIComponent(req.params.dirName);
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // Add the agent to the project and set it as default
    projectStorage.addAgentToProject(projectPath, agentId);
    projectStorage.setDefaultAgent(projectPath, agentId);
    
    const updatedProject = projectStorage.getProject(projectPath);
    
    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ 
      success: true,
      project: updatedProject 
    });
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
    // dirName here is actually the full project path (URL encoded)
    const projectPath = decodeURIComponent(req.params.dirName);
    const { agentId } = req.body;
    
    console.log(`🎯 Select agent request - encoded: ${req.params.dirName}`);
    console.log(`🎯 Select agent request - decoded path: ${projectPath}`);
    console.log(`🎯 Select agent request - agentId: ${agentId}`);
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // Check if project exists, if not create it
    let projectMetadata = projectStorage.getProjectMetadata(projectPath);
    if (!projectMetadata) {
      console.log(`⚠️  Project not found in metadata, creating: ${projectPath}`);
      
      // Verify agent exists
      const agent = globalAgentStorage.getAgent(agentId);
      if (!agent) {
        console.error(`❌ Agent not found: ${agentId}`);
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Create the project with the selected agent
      const projectName = path.basename(projectPath);
      projectMetadata = projectStorage.createProject(projectPath, {
        name: projectName,
        agentId: agentId,
        description: ''
      });
      console.log(`✅ Created project metadata with ID: ${projectMetadata.id}`);
    } else {
      console.log(`✅ Project found in metadata - ID: ${projectMetadata.id}, adding/updating agent`);
      // Project exists, add the agent to the project and set it as default
      projectStorage.addAgentToProject(projectPath, agentId);
      projectStorage.setDefaultAgent(projectPath, agentId);
    }
    
    const updatedProject = projectStorage.getProject(projectPath);
    
    if (!updatedProject) {
      console.error(`❌ Failed to get project after creation/update: ${projectPath}`);
      console.error(`❌ Available projects:`, projectStorage.getAllProjects().map(p => p.path));
      return res.status(404).json({ error: 'Project not found' });
    }
    
    console.log(`✅ Agent selected successfully - project: ${updatedProject.name}, agent: ${agentId}`);
    res.json({ 
      success: true,
      project: updatedProject 
    });
  } catch (error) {
    console.error('Error selecting agent for project:', error);
    res.status(500).json({ error: 'Failed to select agent for project' });
  }
});

// GET /api/projects/:dirName/claude-md - Get project CLAUDE.md content (legacy)
router.get('/:dirName/claude-md', async (req, res) => {
  try {
    const { dirName } = req.params;
    
    const project = projectStorage.getProject(dirName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Try to find CLAUDE.md in project directory first, then parent directory
    const claudeFilePath = path.join(project.path, 'CLAUDE.md');
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

// POST /api/projects/import - Import existing project directory
router.post('/import', (req, res) => {
  try {
    const { agentId, projectPath } = req.body;
    
    console.log(`📥 Import project request - agentId: ${agentId}, projectPath: ${projectPath}`);
    
    if (!agentId || !projectPath) {
      return res.status(400).json({ error: 'Agent ID and project path are required' });
    }
    
    // Verify agent exists
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Check if project directory exists
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project directory does not exist' });
    }
    
    // Check if it's actually a directory
    const stats = fs.statSync(projectPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }
    
    // Add project path to agent's projects list
    if (!agent.projects) {
      agent.projects = [];
    }
    const normalizedPath = path.resolve(projectPath);
    console.log(`📁 Normalized path: ${normalizedPath}`);
    
    if (!agent.projects.includes(normalizedPath)) {
      agent.projects.unshift(normalizedPath); // Add to beginning for most recent
      agent.updatedAt = new Date().toISOString();
      globalAgentStorage.saveAgent(agent);
    }
    
    // Extract project name from path
    const projectName = path.basename(normalizedPath);

    // Create or update project metadata in projectStorage
    // This ensures the project exists when user selects agent later
    let projectMetadata = projectStorage.getProjectMetadata(normalizedPath);
    if (!projectMetadata) {
      console.log(`✨ Creating new project metadata for: ${normalizedPath}`);
      // Project doesn't exist in metadata storage, create it
      projectMetadata = projectStorage.createProject(normalizedPath, {
        name: projectName,
        agentId: agentId,
        description: ''
      });
      console.log(`✅ Project metadata created with ID: ${projectMetadata.id}`);
    } else {
      console.log(`♻️  Project already exists, updating agent association`);
      // Project already exists, just add the agent if not already added
      if (!projectMetadata.agents[agentId]) {
        projectStorage.addAgentToProject(normalizedPath, agentId);
      }
      // Set as default agent
      projectStorage.setDefaultAgent(normalizedPath, agentId);
    }
    
    // Get the full project info with agent details
    const project = projectStorage.getProject(normalizedPath);
    if (!project) {
      console.error(`❌ Failed to get project after creation: ${normalizedPath}`);
      return res.status(500).json({ error: 'Failed to create project metadata' });
    }

    console.log(`✅ Import successful - project ID: ${project.id}, path: ${project.path}`);
    res.json({
      success: true,
      project: project,
      message: `Project "${projectName}" imported successfully`
    });
    
  } catch (error) {
    console.error('Failed to import project:', error);
    res.status(500).json({ 
      error: 'Failed to import project', 
      details: error instanceof Error ? error.message : String(error)
    });
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

      // 🔧 FIX: Create project metadata using ProjectMetadataStorage
      // This ensures the project shows up correctly in the projects list with proper agent info
      // The metadata stores the real project path, regardless of where it is on the filesystem
      projectStorage.createProject(normalizedPath, {
        name: projectName,
        description: description || '',
        agentId: agentId,
        tags: [],
        metadata: {}
      });

      // Return project info that matches frontend interface
      const projectId = `${agentId}-${Buffer.from(normalizedPath).toString('base64').replace(/[+/=]/g, '').slice(-8)}`;

      res.json({
        success: true,
        project: {
          id: projectId,
          name: projectName,
          dirName: projectName,
          path: normalizedPath,
          agents: [agentId],
          defaultAgent: agentId,
          defaultAgentName: agent.name,
          defaultAgentIcon: agent.ui.icon,
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
    
    for (const agent of agents) {
      if (agent.projects && agent.projects.length > 0) {
        for (const projectPath of agent.projects) {
          const id = `${agent.id}-${Buffer.from(projectPath).toString('base64').replace(/[+/=]/g, '').slice(-8)}`;
          if (id === projectId) {
            targetProject = projectPath;
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
    
    // Check if it's a new format project ID (starts with "project_")
    if (projectId.startsWith('project_')) {
      // Handle new project metadata format
      const allProjects = projectStorage.getAllProjects();
      const project = allProjects.find(p => p.id === projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Delete project metadata - use full path for deletion
      const success = projectStorage.deleteProject(project.path);
      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'Project removed successfully',
        note: 'Project directory was not deleted from filesystem'
      });
      return;
    }
    
    // Handle legacy agent project format
    const agents = globalAgentStorage.getAllAgents();
    let targetProject = null;
    
    for (const agent of agents) {
      if (agent.projects && agent.projects.length > 0) {
        for (let i = 0; i < agent.projects.length; i++) {
          const projectPath = agent.projects[i];
          const id = `${agent.id}-${Buffer.from(projectPath).toString('base64').replace(/[+/=]/g, '').slice(-8)}`;
          if (id === projectId) {
            targetProject = projectPath;
            
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

// ========== A2A CONFIGURATION ENDPOINTS ==========

// GET /api/projects/:projectId/a2a-config - Get project A2A configuration
router.get('/:projectId/a2a-config', async (req, res) => {
  try {
    const { projectId: projectPath } = req.params;

    // Load A2A configuration using project path
    const config = await loadA2AConfig(projectPath);

    if (!config) {
      return res.status(500).json({
        error: 'Failed to load A2A configuration',
        code: 'CONFIG_LOAD_ERROR'
      });
    }

    res.json({ config });
  } catch (error) {
    console.error('Error loading A2A configuration:', error);
    res.status(500).json({
      error: 'Failed to load A2A configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// PUT /api/projects/:projectId/a2a-config - Update project A2A configuration
router.put('/:projectId/a2a-config', async (req, res) => {
  try {
    const { projectId: projectPath } = req.params;
    const config = req.body;

    // Convert project path to project ID for storage
    // Create a deterministic project ID from path
    const projectId = `proj_${Buffer.from(projectPath).toString('base64').replace(/[+/=]/g, '').slice(-12)}`;

    // Validate configuration using Zod schema
    const validation = validateSafe(A2AConfigSchema, config);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid A2A configuration',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      });
    }

    // Additional validation using service validator
    const serviceValidation = validateA2AConfig(validation.data);

    if (!serviceValidation.valid) {
      return res.status(400).json({
        error: 'Invalid A2A configuration',
        code: 'VALIDATION_ERROR',
        details: serviceValidation.errors
      });
    }

    // Save configuration using project path
    await saveA2AConfig(projectPath, validation.data);

    res.json({
      success: true,
      config: validation.data,
      message: 'A2A configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating A2A configuration:', error);
    res.status(500).json({
      error: 'Failed to update A2A configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ========== A2A API KEY MANAGEMENT ENDPOINTS ==========

// POST /api/projects/:projectId/api-keys - Generate new API key
router.post('/:projectId/api-keys', async (req, res) => {
  try {
    const { projectId: projectPath } = req.params;
    const body = req.body;

    // Validate request body
    const validation = validateSafe(GenerateApiKeyRequestSchema, body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: validation.errors,
      });
    }

    const { description } = validation.data;

    // Use the actual project path for storage
    // Generate new API key
    const { key, keyData } = await generateApiKey(projectPath, description);

    res.json({
      success: true,
      key, // Plaintext key - shown only once!
      keyId: keyData.id,
      createdAt: keyData.createdAt,
      description: keyData.description,
      message: 'API key generated successfully. Save it now - it will not be shown again.',
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({
      error: 'Failed to generate API key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/projects/:projectId/api-keys - List all API keys
router.get('/:projectId/api-keys', async (req, res) => {
  try {
    const { projectId: projectPath } = req.params;
    const includeRevoked = req.query.includeRevoked === 'true';

    // List API keys (hashes only, never plaintext)
    const keys = await listApiKeys(projectPath, includeRevoked);

    // Remove keyHash from response for security
    const sanitizedKeys = keys.map(({ keyHash, ...rest }) => rest);

    res.json({
      keys: sanitizedKeys,
      count: sanitizedKeys.length,
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({
      error: 'Failed to list API keys',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// DELETE /api/projects/:projectId/api-keys/:keyId - Revoke API key
router.delete('/:projectId/api-keys/:keyId', async (req, res) => {
  try {
    const { projectId: projectPath, keyId } = req.params;

    // Revoke the key using project path
    const success = await revokeApiKey(projectPath, keyId);

    if (!success) {
      return res.status(404).json({
        error: 'API key not found',
        code: 'KEY_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      message: 'API key revoked successfully',
      keyId,
      revokedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({
      error: 'Failed to revoke API key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/projects/:projectId/api-keys/:keyId/rotate - Rotate API key
router.post('/:projectId/api-keys/:keyId/rotate', async (req, res) => {
  try {
    const { projectId, keyId } = req.params;
    const { description, gracePeriodMs } = req.body;

    // Verify old key exists
    const oldKey = await getApiKey(projectId, keyId);

    if (!oldKey) {
      return res.status(404).json({
        error: 'API key not found',
        code: 'KEY_NOT_FOUND',
      });
    }

    // Rotate the key with optional grace period
    const { key, keyData, oldKeyId } = await rotateApiKey(
      projectId,
      keyId,
      description || oldKey.description,
      gracePeriodMs
    );

    res.json({
      success: true,
      key, // New plaintext key - shown only once!
      keyId: keyData.id,
      oldKeyId,
      createdAt: keyData.createdAt,
      description: keyData.description,
      gracePeriodMs: gracePeriodMs || 5 * 60 * 1000,
      message: 'API key rotated successfully. Old key will be revoked after grace period.',
    });
  } catch (error) {
    console.error('Error rotating API key:', error);
    res.status(500).json({
      error: 'Failed to rotate API key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;