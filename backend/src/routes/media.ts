import express, { Router } from 'express';
import fs from 'fs-extra';
import { existsSync } from 'fs';
import { join, resolve, relative, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router: Router = express.Router();

// Project ID to path mapping (in production, this should be stored in a database)
const projectMappings = new Map<string, string>();

// Helper function to generate project ID from path
const generateProjectId = (projectPath: string): string => {
  return crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 16);
};

// Helper function to get or create project ID
export const getProjectId = (projectPath: string): string => {
  const normalizedPath = resolve(projectPath);
  
  // Check if we already have an ID for this path
  for (const [id, path] of projectMappings.entries()) {
    if (path === normalizedPath) {
      return id;
    }
  }
  
  // Generate new ID and store mapping
  const projectId = generateProjectId(normalizedPath);
  projectMappings.set(projectId, normalizedPath);
  return projectId;
};

// Helper function to get project path from ID
const getProjectPath = (projectId: string): string | null => {
  return projectMappings.get(projectId) || null;
};

// Helper function to resolve and validate file path within project
const resolveSafeMediaPath = (projectPath: string, relativePath: string): string => {
  const resolvedProjectPath = resolve(projectPath);
  const resolvedFilePath = resolve(resolvedProjectPath, relativePath);
  
  // Ensure the path is within the project directory for security
  const relativeToProject = relative(resolvedProjectPath, resolvedFilePath);
  if (relativeToProject.startsWith('..') || resolve(resolvedProjectPath, relativeToProject) !== resolvedFilePath) {
    throw new Error('Path is outside project directory');
  }
  
  return resolvedFilePath;
};

// Helper function to get MIME type from file extension
const getMimeType = (filePath: string): string => {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

// GET /media/{project-id}/{relative-path} - Serve static files from project directory
router.get('/:projectId/*', async (req, res) => {
  try {
    const { projectId } = req.params;
    const relativePath = (req.params as any)[0]; // Everything after projectId
    
    if (!relativePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Get project path from ID
    const projectPath = getProjectPath(projectId);
    if (!projectPath) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Resolve safe file path
    const filePath = resolveSafeMediaPath(projectPath, relativePath);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if it's a file (not directory)
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }
    
    // Set appropriate Content-Type
    const mimeType = getMimeType(filePath);
    res.setHeader('Content-Type', mimeType);
    
    // Set cache headers for static assets
    if (mimeType.startsWith('image/') || mimeType === 'text/css' || mimeType === 'text/javascript') {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    }
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read file' });
      }
    });
    
  } catch (error) {
    console.error('Error serving media file:', error);
    if (error instanceof Error && error.message === 'Path is outside project directory') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

export default router;
