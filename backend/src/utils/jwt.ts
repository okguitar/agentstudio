import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const TOKEN_REFRESH_THRESHOLD = process.env.TOKEN_REFRESH_THRESHOLD || '24h';

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
export function generateToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = getExpirationSeconds(JWT_EXPIRES_IN);

  const payload: JWTPayload = {
    authenticated: true,
    issuedAt: now,
    expiresAt: now + expiresIn,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
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
export function shouldRefreshToken(payload: JWTPayload): boolean {
  if (!payload.expiresAt) return true;

  const now = Math.floor(Date.now() / 1000);
  const threshold = getExpirationSeconds(TOKEN_REFRESH_THRESHOLD);

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
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
