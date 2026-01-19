/**
 * HTTPS Enforcement Middleware
 *
 * Ensures that A2A endpoints are only accessible over HTTPS in production.
 * This prevents man-in-the-middle attacks and protects API keys in transit.
 *
 * Phase 10 (Polish): T089 - HTTPS enforcement middleware for production
 *
 * Exemptions from HTTPS requirement:
 * - IP address access (internal/development patterns or behind reverse proxies)
 * - Trusted domain suffixes (e.g., .tunnel, .local, .internal)
 * - Custom domain whitelist via HTTPS_EXEMPT_DOMAINS environment variable
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Default trusted domain suffixes that are exempt from HTTPS requirement.
 * These are typically internal/tunnel domains that don't need HTTPS enforcement.
 */
const DEFAULT_TRUSTED_SUFFIXES = [
  '.tunnel',      // Cloudflare Tunnel, custom tunnels
  '.local',       // Local development domains
  '.internal',    // Internal network domains
  '.localhost',   // Localhost subdomains
];

/**
 * Get the list of domains exempt from HTTPS requirement.
 * Configured via HTTPS_EXEMPT_DOMAINS environment variable (comma-separated).
 * 
 * Example: HTTPS_EXEMPT_DOMAINS=example.com,myapp.internal,*.mycompany.com
 * 
 * @returns Array of exempt domain patterns
 */
export function getExemptDomains(): string[] {
  const envDomains = process.env.HTTPS_EXEMPT_DOMAINS;
  if (!envDomains) return [];
  
  return envDomains
    .split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(domain => domain.length > 0);
}

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
 * Check if a hostname has a trusted domain suffix
 * 
 * @param hostname - The hostname to check
 * @returns true if the hostname ends with a trusted suffix
 */
export function hasTrustedSuffix(hostname: string): boolean {
  if (!hostname) return false;
  
  // Remove port if present and convert to lowercase
  const hostWithoutPort = hostname.split(':')[0].toLowerCase();
  
  return DEFAULT_TRUSTED_SUFFIXES.some(suffix => hostWithoutPort.endsWith(suffix));
}

/**
 * Check if a hostname is in the exempt domains whitelist
 * Supports exact match and wildcard patterns (*.example.com)
 * 
 * @param hostname - The hostname to check
 * @returns true if the hostname matches an exempt domain pattern
 */
export function isExemptDomain(hostname: string): boolean {
  if (!hostname) return false;
  
  const exemptDomains = getExemptDomains();
  if (exemptDomains.length === 0) return false;
  
  // Remove port if present and convert to lowercase
  const hostWithoutPort = hostname.split(':')[0].toLowerCase();
  
  return exemptDomains.some(pattern => {
    // Wildcard pattern: *.example.com
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // Remove '*', keep '.example.com'
      return hostWithoutPort.endsWith(suffix) || hostWithoutPort === pattern.slice(2);
    }
    // Exact match
    return hostWithoutPort === pattern;
  });
}

/**
 * Check if HTTPS requirement should be bypassed for this host
 * 
 * @param hostname - The hostname to check
 * @returns true if HTTPS should not be enforced
 */
export function shouldBypassHttps(hostname: string): boolean {
  return isIPAddress(hostname) || hasTrustedSuffix(hostname) || isExemptDomain(hostname);
}

/**
 * Middleware to enforce HTTPS for specific routes in production
 * 
 * Exempt from HTTPS requirement:
 * - IP address access (internal/development patterns)
 * - Trusted domain suffixes (.tunnel, .local, .internal, .localhost)
 * - Custom domains via HTTPS_EXEMPT_DOMAINS environment variable
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

  // Check if this host should bypass HTTPS requirement
  const host = req.get('host') || '';
  if (shouldBypassHttps(host)) {
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
