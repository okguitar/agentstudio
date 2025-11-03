import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import matter from 'gray-matter';
import { Subagent, SubagentCreate, SubagentUpdate, SubagentFilter } from '../types/subagents';

const router: Router = express.Router();
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

// Get user subagents directory (~/.claude/agents)
const getUserSubagentsDir = () => path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'agents');

// Get project subagents directory (.claude/agents)
const getProjectSubagentsDir = (projectPath?: string) => {
  if (projectPath) {
    return path.join(projectPath, '.claude', 'agents');
  }
  return path.join(process.cwd(), '..', '.claude', 'agents');
};

// Ensure directory exists
async function ensureDir(dirPath: string) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

// Parse subagent file content
function parseSubagentContent(content: string): { frontmatter: any; body: string } {
  try {
    const parsed = matter(content);
    return {
      frontmatter: parsed.data,
      body: parsed.content.trim()
    };
  } catch {
    return {
      frontmatter: {},
      body: content
    };
  }
}

// Format subagent content with frontmatter
function formatSubagentContent(subagent: SubagentCreate | SubagentUpdate, existingContent?: string): string {
  let frontmatter: any = {};
  
  if (existingContent) {
    const parsed = parseSubagentContent(existingContent);
    frontmatter = parsed.frontmatter;
  }

  // Update frontmatter with new values
  if ('name' in subagent && subagent.name) frontmatter.name = subagent.name;
  if (subagent.description) frontmatter.description = subagent.description;
  if (subagent.tools && subagent.tools.length > 0) {
    frontmatter.tools = subagent.tools.join(', ');
  }

  // Build content
  let content = '';
  if (Object.keys(frontmatter).length > 0) {
    content += '---\n';
    for (const [key, value] of Object.entries(frontmatter)) {
      content += `${key}: ${value}\n`;
    }
    content += '---\n\n';
  }
  
  if ('content' in subagent && subagent.content) {
    content += subagent.content;
  } else if (existingContent) {
    const parsed = parseSubagentContent(existingContent);
    content += parsed.body;
  }

  return content;
}

// Scan subagents in directory
async function scanSubagents(dirPath: string): Promise<Subagent[]> {
  try {
    await ensureDir(dirPath);
    const subagents: Subagent[] = [];
    const items = await readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isFile() && item.name.endsWith('.md')) {
        const subagentName = item.name.replace('.md', '');
        const itemPath = path.join(dirPath, item.name);
        const content = await readFile(itemPath, 'utf-8');
        const parsed = parseSubagentContent(content);
        const stats = await stat(itemPath);
        
        subagents.push({
          id: `user:${subagentName}`,
          name: parsed.frontmatter.name || subagentName,
          description: parsed.frontmatter.description || '',
          content: parsed.body,
          scope: 'user',
          tools: parsed.frontmatter.tools ? 
            parsed.frontmatter.tools.split(',').map((s: string) => s.trim()) : undefined,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime
        });
      }
    }
    
    return subagents;
  } catch (error) {
    console.error(`Error scanning subagents in ${dirPath}:`, error);
    return [];
  }
}

// GET /api/subagents - List all subagents
router.get('/', async (req, res) => {
  try {
    const filter: SubagentFilter = {
      search: req.query.search as string
    };
    const projectPath = req.query.projectPath as string;

    let subagents;
    if (projectPath) {
      // Get project-specific subagents
      subagents = await scanSubagents(getProjectSubagentsDir(projectPath));
    } else {
      // Get user subagents
      subagents = await scanSubagents(getUserSubagentsDir());
    }

    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      subagents = subagents.filter(subagent => 
        subagent.name.toLowerCase().includes(searchLower) ||
        subagent.description.toLowerCase().includes(searchLower) ||
        subagent.content.toLowerCase().includes(searchLower)
      );
    }

    // Sort by name
    subagents.sort((a, b) => a.name.localeCompare(b.name));

    res.json(subagents);
  } catch (error) {
    console.error('Error listing subagents:', error);
    res.status(500).json({ error: 'Failed to list subagents' });
  }
});

// GET /api/subagents/:id - Get specific subagent
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [scope, name] = id.split(':');
    
    if (scope !== 'user') {
      return res.status(400).json({ error: 'Invalid subagent scope' });
    }

    const dirPath = getUserSubagentsDir();
    const filePath = path.join(dirPath, name + '.md');

    try {
      const content = await readFile(filePath, 'utf-8');
      const parsed = parseSubagentContent(content);
      const stats = await stat(filePath);

      const subagent: Subagent = {
        id,
        name: parsed.frontmatter.name || name,
        description: parsed.frontmatter.description || '',
        content: parsed.body,
        scope: 'user',
        tools: parsed.frontmatter.tools ? 
          parsed.frontmatter.tools.split(',').map((s: string) => s.trim()) : undefined,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      };

      res.json(subagent);
    } catch (error) {
      res.status(404).json({ error: 'Subagent not found' });
    }
  } catch (error) {
    console.error('Error getting subagent:', error);
    res.status(500).json({ error: 'Failed to get subagent' });
  }
});

// POST /api/subagents - Create new subagent
router.post('/', async (req, res) => {
  try {
    const subagentData: SubagentCreate = req.body;

    if (!subagentData.name || !subagentData.description || !subagentData.content) {
      return res.status(400).json({ error: 'Missing required fields: name, description, content' });
    }

    if (!['user', 'project'].includes(subagentData.scope)) {
      return res.status(400).json({ error: 'Invalid scope. Must be "user" or "project"' });
    }

    // Validate name format (lowercase letters and hyphens only)
    const nameRegex = /^[a-z0-9-]+$/;
    if (!nameRegex.test(subagentData.name)) {
      return res.status(400).json({ error: 'Name must contain only lowercase letters, numbers, and hyphens' });
    }

    const projectPath = req.query.projectPath as string;
    let dirPath: string;
    
    if (subagentData.scope === 'project') {
      if (!projectPath) {
        return res.status(400).json({ error: 'Project path is required for project scope' });
      }
      dirPath = getProjectSubagentsDir(projectPath);
    } else {
      dirPath = getUserSubagentsDir();
    }
    
    const filePath = path.join(dirPath, subagentData.name + '.md');

    // Check if subagent already exists
    try {
      await stat(filePath);
      return res.status(409).json({ error: 'Subagent already exists' });
    } catch {
      // Subagent doesn't exist, continue
    }

    // Ensure directory exists
    await ensureDir(dirPath);

    // Format and write content
    const content = formatSubagentContent(subagentData);
    await writeFile(filePath, content, 'utf-8');

    // Return created subagent
    const stats = await stat(filePath);
    const subagent: Subagent = {
      id: `${subagentData.scope}:${subagentData.name}`,
      name: subagentData.name,
      description: subagentData.description,
      content: subagentData.content,
      scope: subagentData.scope,
      tools: subagentData.tools,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime
    };

    res.status(201).json(subagent);
  } catch (error) {
    console.error('Error creating subagent:', error);
    res.status(500).json({ error: 'Failed to create subagent' });
  }
});

// PUT /api/subagents/:id - Update subagent
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: SubagentUpdate = req.body;
    const [scope, name] = id.split(':');
    
    if (!['user', 'project'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid subagent scope' });
    }

    const projectPath = req.query.projectPath as string;
    let dirPath: string;
    
    if (scope === 'project') {
      if (!projectPath) {
        return res.status(400).json({ error: 'Project path is required for project scope' });
      }
      dirPath = getProjectSubagentsDir(projectPath);
    } else {
      dirPath = getUserSubagentsDir();
    }
    
    const filePath = path.join(dirPath, name + '.md');

    try {
      // Read existing content
      const existingContent = await readFile(filePath, 'utf-8');
      
      // Format updated content
      const content = formatSubagentContent(updateData, existingContent);
      await writeFile(filePath, content, 'utf-8');

      // Return updated subagent
      const parsed = parseSubagentContent(content);
      const stats = await stat(filePath);

      const subagent: Subagent = {
        id,
        name: parsed.frontmatter.name || name,
        description: parsed.frontmatter.description || '',
        content: parsed.body,
        scope: scope as 'user' | 'project',
        tools: parsed.frontmatter.tools ? 
          parsed.frontmatter.tools.split(',').map((s: string) => s.trim()) : undefined,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      };

      res.json(subagent);
    } catch (error) {
      res.status(404).json({ error: 'Subagent not found' });
    }
  } catch (error) {
    console.error('Error updating subagent:', error);
    res.status(500).json({ error: 'Failed to update subagent' });
  }
});

// DELETE /api/subagents/:id - Delete subagent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [scope, name] = id.split(':');
    
    if (!['user', 'project'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid subagent scope' });
    }

    const projectPath = req.query.projectPath as string;
    let dirPath: string;
    
    if (scope === 'project') {
      if (!projectPath) {
        return res.status(400).json({ error: 'Project path is required for project scope' });
      }
      dirPath = getProjectSubagentsDir(projectPath);
    } else {
      dirPath = getUserSubagentsDir();
    }
    
    const filePath = path.join(dirPath, name + '.md');

    try {
      await unlink(filePath);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: 'Subagent not found' });
    }
  } catch (error) {
    console.error('Error deleting subagent:', error);
    res.status(500).json({ error: 'Failed to delete subagent' });
  }
});

export default router;
