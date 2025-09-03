import express from 'express';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { AgentStorage } from '../../shared/utils/agentStorage.js';

const router = express.Router();
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

// Use the same global agent storage as agents.ts
const globalAgentStorage = new AgentStorage();

// Ensure directory exists
async function ensureDir(dirPath: string) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

// Find project by ID (same logic as agents.ts)
function findProjectById(projectId: string) {
  const agents = globalAgentStorage.getAllAgents();
  
  for (const agent of agents) {
    if (agent.projects && agent.projects.length > 0) {
      for (const projectPath of agent.projects) {
        const id = `${agent.id}-${Buffer.from(projectPath).toString('base64').replace(/[+/=]/g, '').slice(-8)}`;
        if (id === projectId) {
          return {
            id,
            name: path.basename(projectPath),
            path: projectPath,
            agentId: agent.id,
            agentName: agent.name,
            agentIcon: agent.ui.icon,
            agentColor: agent.ui.primaryColor
          };
        }
      }
    }
  }
  
  return null;
}

// GET /api/projects/:id/claude-md - Get project CLAUDE.md content
router.get('/:id/claude-md', async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = findProjectById(id);
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

// PUT /api/projects/:id/claude-md - Update project CLAUDE.md content
router.put('/:id/claude-md', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    const project = findProjectById(id);
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

export default router;