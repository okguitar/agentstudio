/**
 * HTTPS Enforcement Middleware
 *
 * Ensures that A2A endpoints are only accessible over HTTPS in production.
 * This prevents man-in-the-middle attacks and protects API keys in transit.
 *
 * Phase 10 (Polish): T089 - HTTPS enforcement middleware for production
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce HTTPS for specific routes in production
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function httpsOnly(req: Request, res: Response, next: NextFunction): any {
  // Only enforce HTTPS in production
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is secure (HTTPS)
  // req.secure checks for req.protocol === 'https'
  // Also check X-Forwarded-Proto header for proxy/load balancer scenarios
  const isSecure =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.headers['x-forwarded-proto']?.includes('https');

  if (!isSecure) {
    return res.status(403).json({
      error: 'HTTPS required',
      code: 'HTTPS_REQUIRED',
      message: 'This endpoint requires HTTPS connection in production environment',
    });
  }

  next();
}

/**
 * Middleware to enforce HTTPS and redirect HTTP to HTTPS
 * Use this for user-facing pages that should redirect
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function httpsRedirect(req: Request, res: Response, next: NextFunction): any {
  // Only enforce HTTPS in production
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is secure
  const isSecure =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.headers['x-forwarded-proto']?.includes('https');

  if (!isSecure) {
    // Redirect to HTTPS
    const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
    return res.redirect(301, httpsUrl);
  }

  next();
}
