import express, { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { verifyToken, getJwtConfig } from '../utils/jwt.js';

const router: Router = express.Router();

// Generate stateless temporary JWT token for media access
export async function generateTempToken(projectId: string, filePath: string): Promise<string> {
  // Create a short-lived JWT token (5 minutes) with media access payload
  const payload = {
    type: 'media-access',
    projectId,
    filePath,
    purpose: 'iframe-media',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes expiration
    jti: crypto.randomBytes(16).toString('hex') // Unique ID for one-time use
  };
  
  const jwtConfig = await getJwtConfig();
  return jwt.sign(payload, jwtConfig.secret);
}

// Generate project-wide temporary JWT token for media access
export async function generateProjectToken(projectId: string, projectPath: string): Promise<string> {
  // Create a short-lived JWT token (5 minutes) with project-wide access
  const payload = {
    type: 'project-media-access',
    projectId,
    projectPath,
    purpose: 'iframe-project-media',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes expiration
    jti: crypto.randomBytes(16).toString('hex') // Unique ID for project
  };
  
  const jwtConfig = await getJwtConfig();
  return jwt.sign(payload, jwtConfig.secret);
}

// Verify stateless temporary JWT token
export async function verifyTempToken(tokenString: string, projectId: string, filePath: string): Promise<boolean> {
  try {
    const payload = await verifyToken(tokenString);
    
    // Check if this is a media access token - cast to any to access custom properties
    if (!payload || typeof payload !== 'object' || (payload as any).type !== 'media-access') {
      return false;
    }
    
    // Check if projectId and filePath match
    if ((payload as any).projectId !== projectId || (payload as any).filePath !== filePath) {
      return false;
    }
    
    // Check token purpose
    if ((payload as any).purpose !== 'iframe-media') {
      return false;
    }
    
    // All checks passed - token is valid
    return true;
    
  } catch (error) {
    // Token verification failed (invalid, expired, etc.)
    return false;
  }
}

// Verify project-wide temporary JWT token
export async function verifyProjectToken(tokenString: string, projectId: string): Promise<boolean> {
  try {
    const payload = await verifyToken(tokenString);
    
    // Check if this is a project media access token
    if (!payload || typeof payload !== 'object' || (payload as any).type !== 'project-media-access') {
      return false;
    }
    
    // Check if projectId matches
    if ((payload as any).projectId !== projectId) {
      return false;
    }
    
    // Check token purpose
    if ((payload as any).purpose !== 'iframe-project-media') {
      return false;
    }
    
    // All checks passed - token is valid
    return true;
    
  } catch (error) {
    // Token verification failed (invalid, expired, etc.)
    return false;
  }
}

// POST /api/media/temp-token - Generate temporary token for media access
router.post('/temp-token', async (req, res) => {
  try {
    const { projectId, filePath } = req.body;
    
    if (!projectId || !filePath) {
      return res.status(400).json({ error: 'ProjectId and filePath are required' });
    }
    
    // This route is protected by authMiddleware, so we're already authenticated
    // Generate temporary token
    const tempToken = await generateTempToken(projectId, filePath);
    
    res.json({
      success: true,
      tempToken,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
    
  } catch (error) {
    console.error('Error generating temp token:', error);
    res.status(500).json({ error: 'Failed to generate temporary token' });
  }
});

// POST /api/media/project-token - Generate project-wide temporary token for media access
router.post('/project-token', async (req, res) => {
  try {
    const { projectId, projectPath } = req.body;
    
    if (!projectId || !projectPath) {
      return res.status(400).json({ error: 'ProjectId and projectPath are required' });
    }
    
    // This route is protected by authMiddleware, so we're already authenticated
    // Generate project-wide temporary token
    const projectToken = await generateProjectToken(projectId, projectPath);
    
    res.json({
      success: true,
      projectToken,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
    
  } catch (error) {
    console.error('Error generating project token:', error);
    res.status(500).json({ error: 'Failed to generate project token' });
  }
});

export default router;