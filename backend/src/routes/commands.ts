import express from 'express';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import matter from 'gray-matter';
import { SlashCommand, SlashCommandCreate, SlashCommandUpdate, SlashCommandFilter } from '@agentstudio/shared/types/commands';

const router = express.Router();
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

// Get project commands directory (.claude/commands)
const getProjectCommandsDir = (projectPath?: string) => {
  if (projectPath) {
    return path.join(projectPath, '.claude', 'commands');
  }
  return path.join(process.cwd(), '..', '.claude', 'commands');
};

// Get user commands directory (~/.claude/commands)
const getUserCommandsDir = () => path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'commands');

// Ensure directory exists
async function ensureDir(dirPath: string) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

// Parse command file content
function parseCommandContent(content: string): { frontmatter: any; body: string } {
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

// Format command content with frontmatter
function formatCommandContent(command: SlashCommandCreate | SlashCommandUpdate, existingContent?: string): string {
  let frontmatter: any = {};
  
  if (existingContent) {
    const parsed = parseCommandContent(existingContent);
    frontmatter = parsed.frontmatter;
  }

  // Update frontmatter with new values
  if (command.description) frontmatter.description = command.description;
  if (command.argumentHint) frontmatter['argument-hint'] = command.argumentHint;
  if (command.allowedTools) frontmatter['allowed-tools'] = command.allowedTools.join(', ');
  if (command.model) frontmatter.model = command.model;
  if ('namespace' in command && command.namespace !== undefined) frontmatter.namespace = command.namespace;

  // Build content
  let content = '';
  if (Object.keys(frontmatter).length > 0) {
    content += '---\n';
    for (const [key, value] of Object.entries(frontmatter)) {
      // Quote values that contain special YAML characters
      const shouldQuote = typeof value === 'string' && (/[[\]{}:>|*&!%@`]/.test(value) || value.includes('#') || value.trim() !== value);
      const formattedValue = shouldQuote ? `"${value.replace(/"/g, '\\"')}"` : value;
      content += `${key}: ${formattedValue}\n`;
    }
    content += '---\n\n';
  }
  
  if ('content' in command && command.content) {
    content += command.content;
  } else if (existingContent) {
    const parsed = parseCommandContent(existingContent);
    content += parsed.body;
  }

  return content;
}

// Scan commands in directory
async function scanCommands(dirPath: string, scope: 'project' | 'user'): Promise<SlashCommand[]> {
  try {
    await ensureDir(dirPath);
    const commands: SlashCommand[] = [];
    
    async function scanDirectory(currentDir: string, namespace?: string) {
      const items = await readdir(currentDir, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item.name);
        
        if (item.isDirectory()) {
          const subNamespace = namespace ? `${namespace}/${item.name}` : item.name;
          await scanDirectory(itemPath, subNamespace);
        } else if (item.name.endsWith('.md')) {
          const commandName = item.name.replace('.md', '');
          const content = await readFile(itemPath, 'utf-8');
          const parsed = parseCommandContent(content);
          const stats = await stat(itemPath);
          
          commands.push({
            id: `${scope}:${namespace ? namespace + '/' : ''}${commandName}`,
            name: commandName,
            description: parsed.frontmatter.description || parsed.body.split('\n')[0] || '',
            content: parsed.body,
            scope,
            namespace,
            argumentHint: parsed.frontmatter['argument-hint'],
            allowedTools: parsed.frontmatter['allowed-tools'] ? 
              parsed.frontmatter['allowed-tools'].split(',').map((s: string) => s.trim()) : undefined,
            model: parsed.frontmatter.model,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime
          });
        }
      }
    }
    
    await scanDirectory(dirPath);
    return commands;
  } catch (error) {
    console.error(`Error scanning commands in ${dirPath}:`, error);
    return [];
  }
}

// GET /api/commands - List all commands
router.get('/', async (req, res) => {
  try {
    const filter: SlashCommandFilter = {
      scope: req.query.scope as any || 'all',
      namespace: req.query.namespace as string,
      search: req.query.search as string
    };
    const projectPath = req.query.projectPath as string;

    let commands: SlashCommand[] = [];

    // Scan project commands
    if (filter.scope === 'all' || filter.scope === 'project') {
      const projectCommands = await scanCommands(getProjectCommandsDir(projectPath), 'project');
      commands.push(...projectCommands);
    }

    // Scan user commands
    if (filter.scope === 'all' || filter.scope === 'user') {
      const userCommands = await scanCommands(getUserCommandsDir(), 'user');
      commands.push(...userCommands);
    }

    // Apply filters
    if (filter.namespace) {
      commands = commands.filter(cmd => cmd.namespace === filter.namespace);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      // Remove leading '/' if present, as it's not part of the actual command name
      const cleanSearch = searchLower.startsWith('/') ? searchLower.slice(1) : searchLower;
      
      commands = commands.filter(cmd => {
        // Basic field matching
        const basicMatch = cmd.name.toLowerCase().includes(cleanSearch) ||
          cmd.description.toLowerCase().includes(cleanSearch) ||
          cmd.content.toLowerCase().includes(cleanSearch) ||
          (cmd.namespace && cmd.namespace.toLowerCase().includes(cleanSearch));
          
        // Special handling for namespace pattern matching (e.g., "code:" should match "code:testcmd")
        if (cleanSearch.endsWith(':') && cmd.namespace) {
          const namespacePrefix = cleanSearch.slice(0, -1); // Remove the trailing ':'
          if (cmd.namespace.toLowerCase() === namespacePrefix) {
            return true;
          }
        }
        
        // Full namespace:name pattern matching (e.g., "code:test" should match "code:testcmd")
        if (cleanSearch.includes(':') && cmd.namespace) {
          const fullDisplayName = `${cmd.namespace.toLowerCase()}:${cmd.name.toLowerCase()}`;
          if (fullDisplayName.includes(cleanSearch)) {
            return true;
          }
        }
        
        return basicMatch;
      });
    }

    // Sort by scope (project first) then by name
    commands.sort((a, b) => {
      if (a.scope !== b.scope) {
        return a.scope === 'project' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    res.json(commands);
  } catch (error) {
    console.error('Error listing commands:', error);
    res.status(500).json({ error: 'Failed to list commands' });
  }
});

// GET /api/commands/:id - Get specific command
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath = req.query.projectPath as string;
    const [scope, ...nameParts] = id.split(':');
    const fullName = nameParts.join(':');
    
    if (!['project', 'user'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid command scope' });
    }

    const baseDir = scope === 'project' ? getProjectCommandsDir(projectPath) : getUserCommandsDir();
    const filePath = path.join(baseDir, fullName + '.md');

    try {
      const content = await readFile(filePath, 'utf-8');
      const parsed = parseCommandContent(content);
      const stats = await stat(filePath);
      
      const pathParts = fullName.split('/');
      const commandName = pathParts.pop()!;
      const namespace = pathParts.length > 0 ? pathParts.join('/') : undefined;

      const command: SlashCommand = {
        id,
        name: commandName,
        description: parsed.frontmatter.description || parsed.body.split('\n')[0] || '',
        content: parsed.body,
        scope: scope as 'project' | 'user',
        namespace,
        argumentHint: parsed.frontmatter['argument-hint'],
        allowedTools: parsed.frontmatter['allowed-tools'] ? 
          parsed.frontmatter['allowed-tools'].split(',').map((s: string) => s.trim()) : undefined,
        model: parsed.frontmatter.model,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      };

      res.json(command);
    } catch (error) {
      res.status(404).json({ error: 'Command not found' });
    }
  } catch (error) {
    console.error('Error getting command:', error);
    res.status(500).json({ error: 'Failed to get command' });
  }
});

// POST /api/commands - Create new command
router.post('/', async (req, res) => {
  try {
    const commandData: SlashCommandCreate = req.body;
    const projectPath = req.query.projectPath as string;

    if (!commandData.name || !commandData.content || !commandData.scope) {
      return res.status(400).json({ error: 'Missing required fields: name, content, scope' });
    }

    if (!['project', 'user'].includes(commandData.scope)) {
      return res.status(400).json({ error: 'Invalid scope. Must be "project" or "user"' });
    }

    const baseDir = commandData.scope === 'project' ? getProjectCommandsDir(projectPath) : getUserCommandsDir();
    const fileName = commandData.namespace 
      ? path.join(commandData.namespace, commandData.name + '.md')
      : commandData.name + '.md';
    const filePath = path.join(baseDir, fileName);

    // Check if command already exists
    try {
      await stat(filePath);
      return res.status(409).json({ error: 'Command already exists' });
    } catch {
      // Command doesn't exist, continue
    }

    // Ensure directory exists
    await ensureDir(path.dirname(filePath));

    // Format and write content
    const content = formatCommandContent(commandData);
    await writeFile(filePath, content, 'utf-8');

    // Return created command
    const stats = await stat(filePath);
    const command: SlashCommand = {
      id: `${commandData.scope}:${commandData.namespace ? commandData.namespace + '/' : ''}${commandData.name}`,
      name: commandData.name,
      description: commandData.description || '',
      content: commandData.content,
      scope: commandData.scope,
      namespace: commandData.namespace,
      argumentHint: commandData.argumentHint,
      allowedTools: commandData.allowedTools,
      model: commandData.model,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime
    };

    res.status(201).json(command);
  } catch (error) {
    console.error('Error creating command:', error);
    res.status(500).json({ error: 'Failed to create command' });
  }
});

// PUT /api/commands/:id - Update command
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: SlashCommandUpdate = req.body;
    const projectPath = req.query.projectPath as string;
    const [scope, ...nameParts] = id.split(':');
    const fullName = nameParts.join(':');
    
    if (!['project', 'user'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid command scope' });
    }

    const baseDir = scope === 'project' ? getProjectCommandsDir(projectPath) : getUserCommandsDir();
    const oldFilePath = path.join(baseDir, fullName + '.md');

    try {
      // Read existing content
      const existingContent = await readFile(oldFilePath, 'utf-8');
      
      // Parse existing command to get current namespace and name
      const pathParts = fullName.split('/');
      const commandName = pathParts.pop()!;
      const currentNamespace = pathParts.length > 0 ? pathParts.join('/') : undefined;
      
      // Determine new namespace (from update data or keep current)
      const newNamespace = updateData.namespace !== undefined ? updateData.namespace || undefined : currentNamespace;
      
      // Format updated content
      const content = formatCommandContent(updateData, existingContent);
      
      // Check if namespace changed - if so, we need to move the file
      let newFilePath = oldFilePath;
      let newId = id;
      
      if (newNamespace !== currentNamespace) {
        const newFileName = newNamespace 
          ? path.join(newNamespace, commandName + '.md')
          : commandName + '.md';
        newFilePath = path.join(baseDir, newFileName);
        newId = `${scope}:${newNamespace ? newNamespace + '/' : ''}${commandName}`;
        
        // Ensure new directory exists
        await ensureDir(path.dirname(newFilePath));
        
        // Check if target file already exists
        try {
          await stat(newFilePath);
          if (newFilePath !== oldFilePath) {
            return res.status(409).json({ error: 'A command with this namespace and name already exists' });
          }
        } catch {
          // File doesn't exist, good to proceed
        }
      }
      
      // Write to new location
      await writeFile(newFilePath, content, 'utf-8');
      
      // If file location changed, remove old file
      if (newFilePath !== oldFilePath) {
        await unlink(oldFilePath);
      }

      // Return updated command
      const parsed = parseCommandContent(content);
      const stats = await stat(newFilePath);

      const command: SlashCommand = {
        id: newId,
        name: commandName,
        description: parsed.frontmatter.description || parsed.body.split('\n')[0] || '',
        content: parsed.body,
        scope: scope as 'project' | 'user',
        namespace: newNamespace,
        argumentHint: parsed.frontmatter['argument-hint'],
        allowedTools: parsed.frontmatter['allowed-tools'] ? 
          parsed.frontmatter['allowed-tools'].split(',').map((s: string) => s.trim()) : undefined,
        model: parsed.frontmatter.model,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      };

      res.json(command);
    } catch (error) {
      res.status(404).json({ error: 'Command not found' });
    }
  } catch (error) {
    console.error('Error updating command:', error);
    res.status(500).json({ error: 'Failed to update command' });
  }
});

// DELETE /api/commands/:id - Delete command
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath = req.query.projectPath as string;
    const [scope, ...nameParts] = id.split(':');
    const fullName = nameParts.join(':');
    
    if (!['project', 'user'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid command scope' });
    }

    const baseDir = scope === 'project' ? getProjectCommandsDir(projectPath) : getUserCommandsDir();
    const filePath = path.join(baseDir, fullName + '.md');

    try {
      await unlink(filePath);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: 'Command not found' });
    }
  } catch (error) {
    console.error('Error deleting command:', error);
    res.status(500).json({ error: 'Failed to delete command' });
  }
});

export default router;