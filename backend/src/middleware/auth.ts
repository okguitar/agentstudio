import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware to authenticate requests using JWT token
 * Expects token in Authorization header as "Bearer <token>"
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  // Token is valid, proceed to next middleware
  next();
}
