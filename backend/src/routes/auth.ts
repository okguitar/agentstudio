import express, { Request, Response, Router } from 'express';
import { generateToken, verifyToken, shouldRefreshToken } from '../utils/jwt';
import { loadConfig, isPasswordConfigured } from '../config/index';

const router: Router = express.Router();

/**
 * GET /api/auth/check-password-required
 * Check if password is required for login
 * Returns whether the system requires a password to authenticate
 */
router.get('/check-password-required', async (req: Request, res: Response) => {
  try {
    const passwordRequired = await isPasswordConfigured();
    res.json({
      success: true,
      passwordRequired,
    });
  } catch (error) {
    console.error('Failed to check password requirement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check password requirement',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with password and return JWT token
 * If no password is configured, login succeeds without password
 */
router.post('/login', async (req: Request, res: Response) => {
  const { password } = req.body;

  const passwordRequired = await isPasswordConfigured();

  // If no password is configured, allow login without password
  if (!passwordRequired) {
    const token = await generateToken();
    res.json({
      success: true,
      token,
      message: 'Login successful (no password required)',
    });
    return;
  }

  // Password is required but not provided
  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const config = await loadConfig();
  if (password !== config.adminPassword) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  // Generate JWT token
  const token = await generateToken();

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
router.post('/verify', async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  const payload = await verifyToken(token);

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
router.post('/refresh', async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  const payload = await verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Check if token should be refreshed
  if (!(await shouldRefreshToken(payload))) {
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
  const newToken = await generateToken();

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
