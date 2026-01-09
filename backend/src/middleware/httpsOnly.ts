/**
 * HTTPS Enforcement Middleware
 *
 * Ensures that A2A endpoints are only accessible over HTTPS in production.
 * This prevents man-in-the-middle attacks and protects API keys in transit.
 *
 * Phase 10 (Polish): T089 - HTTPS enforcement middleware for production
 *
 * Note: IP address access is exempt from HTTPS requirement, as these are typically
 * internal/development access patterns or behind reverse proxies like Nginx.
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Check if a hostname is an IP address (IPv4 or IPv6)
 *
 * @param hostname - The hostname to check
 * @returns true if the hostname is an IP address
 */
export function isIPAddress(hostname: string): boolean {
  if (!hostname) return false;

  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];

  // IPv4 pattern: xxx.xxx.xxx.xxx
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(hostWithoutPort)) {
    // Validate each octet is 0-255
    const octets = hostWithoutPort.split('.');
    return octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6 patterns (simplified check for common formats)
  // Full IPv6: xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx
  // Compressed IPv6: ::1, ::ffff:192.0.2.1, etc.
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  const ipv6LoopbackPattern = /^::1$/;
  const ipv6MappedPattern = /^::ffff:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/i;

  return (
    ipv6Pattern.test(hostWithoutPort) ||
    ipv6LoopbackPattern.test(hostWithoutPort) ||
    ipv6MappedPattern.test(hostWithoutPort)
  );
}

/**
 * Middleware to enforce HTTPS for specific routes in production
 * Exempt: IP address access (internal/development patterns)
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

  // Allow IP address access without HTTPS (internal/proxy scenarios)
  const host = req.get('host') || '';
  if (isIPAddress(host)) {
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
