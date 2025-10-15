import jwt from 'jsonwebtoken';
import { loadConfig } from '../config/index.js';

// Cache config values to avoid repeated loading
let cachedJwtConfig: { secret: string; expiresIn: string; refreshThreshold: string } | null = null;

async function getJwtConfig() {
  if (cachedJwtConfig) {
    return cachedJwtConfig;
  }
  
  const config = await loadConfig();
  cachedJwtConfig = {
    secret: config.jwtSecret || 'your-secret-key-change-this-in-production',
    expiresIn: config.jwtExpiresIn || '7d',
    refreshThreshold: config.tokenRefreshThreshold || '24h'
  };
  
  return cachedJwtConfig;
}

export interface JWTPayload {
  authenticated: true;
  iat?: number;
  exp?: number;
  issuedAt?: number;
  expiresAt?: number;
}

/**
 * Generate a JWT token for authentication
 */
export async function generateToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwtConfig = await getJwtConfig();
  const expiresIn = getExpirationSeconds(jwtConfig.expiresIn);

  const payload: JWTPayload = {
    authenticated: true,
    issuedAt: now,
    expiresAt: now + expiresIn,
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Parse expiration string to seconds
 */
function getExpirationSeconds(expireStr: string): number {
  const match = expireStr.match(/^(\d+)([hdwmy])$/);
  if (!match) return 7 * 24 * 60 * 60; // Default to 7 days

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    case 'w': return value * 7 * 24 * 60 * 60;
    case 'm': return value * 30 * 24 * 60 * 60;
    case 'y': return value * 365 * 24 * 60 * 60;
    default: return 7 * 24 * 60 * 60;
  }
}

/**
 * Check if token should be refreshed (within threshold of expiration)
 */
export async function shouldRefreshToken(payload: JWTPayload): Promise<boolean> {
  if (!payload.expiresAt) return true;

  const now = Math.floor(Date.now() / 1000);
  const jwtConfig = await getJwtConfig();
  const threshold = getExpirationSeconds(jwtConfig.refreshThreshold);

  return payload.expiresAt - now <= threshold;
}

/**
 * Get remaining time in seconds before token expires
 */
export function getTokenRemainingTime(payload: JWTPayload): number {
  if (!payload.expiresAt) return 0;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.expiresAt - now);
}

/**
 * Verify and decode a JWT token
 * @returns Decoded payload if valid, null if invalid
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const jwtConfig = await getJwtConfig();
    const decoded = jwt.verify(token, jwtConfig.secret) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
