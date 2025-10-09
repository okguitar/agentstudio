import { TokenData } from '../stores/authStore';
import { BackendService } from '../types/backendServices';

// Check if the stored token is for a different service than the current one
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

// Check if token is expired (older than 24 hours)
export const isTokenExpired = (token: string | TokenData | null): boolean => {
  if (!token) return true;

  // If token is a simple string, we can't determine expiration
  if (typeof token === 'string') return false;

  const tokenAge = Date.now() - token.timestamp;
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  return tokenAge > twentyFourHours;
};

// Extract the actual JWT token from token data
export const extractToken = (token: string | TokenData | null): string | null => {
  if (!token) return null;
  return typeof token === 'object' && 'token' in token ? token.token : token;
};