/**
 * Rate Limiting Middleware for A2A Endpoints
 *
 * Limits requests to 100 per hour per API key to prevent abuse.
 * Returns 429 Too Many Requests with retryAfter header when limit exceeded.
 *
 * Uses in-memory storage (resets on server restart).
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import type { A2ARequest } from './a2aAuth.js';

/**
 * Rate limiter configuration for A2A endpoints
 *
 * - Window: 1 hour (60 minutes)
 * - Max requests: 100 per window
 * - Key generator: Uses API key from a2aContext (set by a2aAuth middleware)
 * - Response: 429 with retryAfter header
 */
export const a2aRateLimiter = rateLimit({
  // Rate limit window (1 hour)
  windowMs: 60 * 60 * 1000, // 60 minutes

  // Maximum requests per window
  max: 100,

  // Use API key as identifier (from a2aContext set by auth middleware)
  keyGenerator: (req: Request): string => {
    const a2aReq = req as A2ARequest;

    // If a2aContext is available, use API key ID
    if (a2aReq.a2aContext?.apiKeyId) {
      return a2aReq.a2aContext.apiKeyId;
    }

    // Fallback to IP address if no API key (shouldn't happen with auth middleware)
    return req.ip || 'unknown';
  },

  // Standardized error response
  handler: (req: Request, res: Response): void => {
    const a2aReq = req as A2ARequest;
    const keyId = a2aReq.a2aContext?.apiKeyId || 'unknown';

    console.warn('[A2A Rate Limit] Rate limit exceeded:', {
      keyId,
      projectId: a2aReq.a2aContext?.projectId,
      a2aAgentId: a2aReq.a2aContext?.a2aAgentId,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Maximum 100 requests per hour per API key.',
      retryAfter: 3600, // 1 hour in seconds
    });
  },

  // Skip successful requests from rate limit counting (only count actual processing)
  skip: (req: Request): boolean => {
    // Don't skip any requests - count all attempts
    return false;
  },

  // Include rate limit info in response headers
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Stricter rate limiter for sensitive operations (e.g., task creation)
 *
 * - Window: 1 hour
 * - Max requests: 50 per window
 */
export const a2aStrictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Stricter limit
  keyGenerator: (req: Request): string => {
    const a2aReq = req as A2ARequest;
    return a2aReq.a2aContext?.apiKeyId || req.ip || 'unknown';
  },
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many task creation requests. Maximum 50 per hour per API key.',
      retryAfter: 3600,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Custom rate limiter factory for flexible configuration
 *
 * @param options - Rate limiter options
 * @returns Configured rate limiter middleware
 */
export function createA2ARateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
}): ReturnType<typeof rateLimit> {
  const { windowMs = 60 * 60 * 1000, max = 100, message = 'Rate limit exceeded' } = options;

  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request): string => {
      const a2aReq = req as A2ARequest;
      return a2aReq.a2aContext?.apiKeyId || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response): void => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
