import express, { Request, Response, Router } from 'express';
import { generateToken, verifyToken, shouldRefreshToken } from '../utils/jwt.js';

const router: Router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * POST /api/auth/login
 * Authenticate with password and return JWT token
 */
router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  // Generate JWT token
  const token = generateToken();

  res.json({
    success: true,
    token,
    message: 'Login successful',
  });
});

/**
 * POST /api/auth/verify
 * Verify if a token is valid
 */
router.post('/verify', (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    return;
  }

  res.json({
    valid: true,
    payload,
  });
});

/**
 * POST /api/auth/refresh
 * Refresh an existing token if it's within refresh threshold
 */
router.post('/refresh', (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Check if token should be refreshed
  if (!shouldRefreshToken(payload)) {
    // Token is still valid and doesn't need refresh
    res.json({
      success: true,
      token: token, // Return existing token
      refreshed: false,
      message: 'Token is still valid',
    });
    return;
  }

  // Generate new token
  const newToken = generateToken();

  res.json({
    success: true,
    token: newToken,
    refreshed: true,
    message: 'Token refreshed successfully',
  });
});

/**
 * POST /api/auth/logout
 * Logout endpoint (client-side token removal)
 */
router.post('/logout', (req: Request, res: Response) => {
  // With JWT, logout is primarily handled client-side by removing the token
  // This endpoint is provided for consistency and future extensibility
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

export default router;
