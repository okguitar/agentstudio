import express from 'express';
import fs from 'fs-extra';
import { existsSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import * as os from 'os';
import * as path from 'path';
import { getProjectId } from './media.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router: express.Router = express.Router();

// Get working directory (project root or specified project path)
const getWorkingDir = (projectPath?: string) => {
  if (projectPath) {
    return resolve(projectPath);
  }
  return resolve(__dirname, '../../..');
};

// Validation schemas
const ReadFileSchema = z.object({
  path: z.string()
});

const ReadFilesSchema = z.object({
  paths: z.array(z.string())
});

const WriteFileSchema = z.object({
  path: z.string(),
  content: z.string()
});

// Helper function to resolve and validate file path
const resolveSafePath = (filePath: string, projectPath?: string): string => {
  const workingDir = getWorkingDir(projectPath);
  const resolvedPath = resolve(workingDir, filePath);
  
  // Ensure the path is within the working directory for security
  const relativePath = relative(workingDir, resolvedPath);
  if (relativePath.startsWith('..') || resolve(workingDir, relativePath) !== resolvedPath) {
    throw new Error('Path is outside working directory');
  }
  
  return resolvedPath;
};

// GET /api/files/read - Read a single file
router.get('/read', async (req, res) => {
  try {
    const { path, projectPath, binary } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'File path is required' });
    }

    const fullPath = resolveSafePath(path, typeof projectPath === 'string' ? projectPath : undefined);
    
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 如果是二进制文件请求（如图片），直接发送文件内容
    if (binary === 'true') {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return res.status(400).json({ error: 'Path is not a file' });
      }

      // 根据文件扩展名设置正确的Content-Type
      const ext = path.toLowerCase().split('.').pop();
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',
        'bmp': 'image/bmp',
        'tiff': 'image/tiff'
      };
      
      const mimeType = mimeTypes[ext || ''] || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1小时缓存
      
      // 直接发送文件流
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to read file' });
        }
      });
      
      return;
    }

    // 对于文本文件，仍然使用utf-8编码
    const content = await fs.readFile(fullPath, 'utf-8');
    
    res.json({
      path,
      content,
      exists: true
    });
  } catch (error) {
    console.error('Error reading file:', error);
    if (error instanceof Error && error.message === 'Path is outside working directory') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// POST /api/files/read-multiple - Read multiple files
router.post('/read-multiple', async (req, res) => {
  try {
    const validation = ReadFilesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validation.error });
    }

    const { paths } = validation.data;
    const { projectPath } = req.query;
    
    const results = await Promise.allSettled(
      paths.map(async (path) => {
        try {
          const fullPath = resolveSafePath(path, typeof projectPath === 'string' ? projectPath : undefined);
          const exists = existsSync(fullPath);
          
          if (!exists) {
            return {
              path,
              content: null,
              exists: false,
              error: 'File not found'
            };
          }

          const content = await fs.readFile(fullPath, 'utf-8');
          return {
            path,
            content,
            exists: true
          };
        } catch (error) {
          return {
            path,
            content: null,
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const files = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          path: paths[index],
          content: null,
          exists: false,
          error: result.reason
        };
      }
    });

    res.json({ files });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Failed to read files' });
  }
});

// PUT /api/files/write - Write to a single file
router.put('/write', async (req, res) => {
  try {
    const validation = WriteFileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validation.error });
    }

    const { path, content } = validation.data;
    const { projectPath } = req.query;
    const fullPath = resolveSafePath(path, typeof projectPath === 'string' ? projectPath : undefined);

    // Ensure directory exists
    await fs.ensureDir(dirname(fullPath));
    
    // Write the file
    await fs.writeFile(fullPath, content, 'utf-8');

    res.json({
      success: true,
      message: 'File written successfully',
      path
    });
  } catch (error) {
    console.error('Error writing file:', error);
    if (error instanceof Error && error.message === 'Path is outside working directory') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to write file' });
  }
});

// GET /api/files/project-id - Get project ID for a given project path
router.get('/project-id', async (req, res) => {
  try {
    const { projectPath } = req.query;
    
    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const projectId = getProjectId(projectPath);
    
    res.json({
      projectId,
      projectPath
    });
  } catch (error) {
    console.error('Error getting project ID:', error);
    res.status(500).json({ error: 'Failed to get project ID' });
  }
});

// ========== FILESYSTEM ROUTES MIGRATED FROM AGENTS.TS ==========

// GET /api/files/browse - Browse file system
router.get('/browse', (req, res) => {
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

// POST /api/files/create-directory - Create new directory
router.post('/create-directory', (req, res) => {
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