import { TokenData } from '../stores/authStore';
import { BackendService } from '../types/backendServices';

// Check if the stored token is for a different service than the current one
// Kept for backward compatibility
export const isTokenForDifferentService = (
  token: string | TokenData | null,
  currentService: BackendService | null
): boolean => {
  if (!token || !currentService) return false;

  // If token is a simple string, we can't determine the service
  if (typeof token === 'string') return false;

  // Check if the token was issued for a different service
  return token.serviceId !== currentService.id;
};

// Parse JWT token to extract expiration time
function parseJWT(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
}

// Check if token is expired based on JWT expiration time
export const isTokenExpired = (token: string | TokenData | null): boolean => {
  if (!token) return true;

  // If token is a simple string, parse JWT
  if (typeof token === 'string') {
    const decoded = parseJWT(token);
    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp <= now;
  }

  // For TokenData, use the timestamp as fallback
  // But prioritize JWT expiration if we can parse it
  const decoded = parseJWT(token.token);
  if (decoded && decoded.exp) {
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp <= now;
  }

  // Fallback: check if token is very old (7 days)
  const tokenAge = Date.now() - token.timestamp;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return tokenAge > sevenDays;
};

// Check if token should be refreshed (within refresh threshold)
export const shouldRefreshToken = (token: string | TokenData | null, thresholdHours: number = 24): boolean => {
  if (!token) return true;

  // Parse JWT to get expiration
  const jwtString = typeof token === 'string' ? token : token.token;
  const decoded = parseJWT(jwtString);

  if (!decoded || !decoded.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const thresholdSeconds = thresholdHours * 60 * 60;

  // Refresh if token expires within threshold hours
  return decoded.exp - now <= thresholdSeconds;
};

// Extract the actual JWT token from token data
export const extractToken = (token: string | TokenData | null): string | null => {
  if (!token) return null;
  return typeof token === 'object' && 'token' in token ? token.token : token;
};

// Check if a service has a valid (non-expired) token
export const hasValidToken = (
  serviceId: string,
  tokens: Record<string, TokenData>
): boolean => {
  const token = tokens[serviceId];
  if (!token) return false;

  return !isTokenExpired(token);
};