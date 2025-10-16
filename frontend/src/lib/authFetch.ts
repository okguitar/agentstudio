/**
 * Authenticated fetch wrapper with automatic token refresh
 * Automatically adds Authorization header with JWT token and handles token refresh
 */

import { useAuthStore } from '../stores/authStore';
import { extractToken, shouldRefreshToken } from '../utils/authHelpers';
import { API_BASE } from './config.js';

interface AuthFetchOptions extends RequestInit {
  skipAuth?: boolean;
  maxRetries?: number;
}

export async function authFetch(
  url: string,
  options: AuthFetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, maxRetries = 1, ...fetchOptions } = options;

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await makeAuthRequest(url, fetchOptions, skipAuth);

      // If we get a 401 and haven't exceeded retries, try to refresh token
      if (response.status === 401 && attempt < maxRetries && !skipAuth) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          attempt++;
          continue; // Retry with refreshed token
        }
      }

      return response;
    } catch (error) {
      if (attempt >= maxRetries) {
        // Enhance the error with more context before throwing
        if (error instanceof Error) {
          const enhancedError = error as Error & {
            requestUrl?: string;
            requestMethod?: string;
            isRetryable?: boolean;
            retryAttempt?: number;
            maxRetries?: number;
          };
          
          enhancedError.requestUrl = url;
          enhancedError.requestMethod = options.method || 'GET';
          enhancedError.isRetryable = true;
          enhancedError.retryAttempt = attempt;
          enhancedError.maxRetries = maxRetries;
          
          // Add more descriptive message for network errors
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            enhancedError.message = `Network request failed: ${options.method || 'GET'} ${url}`;
          }
        }
        throw error;
      }
      attempt++;
      // For network errors, wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Max retries exceeded');
}

async function makeAuthRequest(
  url: string,
  options: RequestInit = {},
  skipAuth: boolean = false
): Promise<Response> {
  const headers = new Headers(options.headers || {});

  // Add Authorization header if token exists and auth is not skipped
  let actualToken: string | undefined;
  if (!skipAuth) {
    const currentServiceId = getCurrentServiceId();
    const { getToken } = useAuthStore.getState();
    const token = currentServiceId ? getToken(currentServiceId) : useAuthStore.getState().token;
    actualToken = extractToken(token) || undefined;

    if (actualToken) {
      headers.set('Authorization', `Bearer ${actualToken}`);

      // Check if token needs refresh before making the request
      if (shouldRefreshToken(token)) {
        // Don't block the request for refresh, but trigger it in background
        attemptTokenRefresh().catch(console.error);
      }
    }
  }

  // Merge headers back into options
  const authOptions: RequestInit = {
    ...options,
    headers,
  };

  return fetch(url, authOptions).catch(error => {
    // Enhance fetch errors with more context
    if (error instanceof Error) {
      const enhancedError = error as Error & {
        requestUrl?: string;
        requestMethod?: string;
        hasAuth?: boolean;
        tokenPresent?: boolean;
      };
      
      enhancedError.requestUrl = url;
      enhancedError.requestMethod = authOptions.method || 'GET';
      enhancedError.hasAuth = !skipAuth;
      enhancedError.tokenPresent = !!actualToken;
      
      // Add more descriptive message for common network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        enhancedError.message = `Failed to connect to server: ${authOptions.method || 'GET'} ${url}`;
      }
    }
    throw error;
  });
}

function getCurrentServiceId(): string | null {
  // Try to get current service ID from localStorage or global state
  try {
    const backendServices = localStorage.getItem('backend-services-storage');
    if (backendServices) {
      const services = JSON.parse(backendServices);
      const currentService = services.state?.currentService;
      return currentService?.id || null;
    }
  } catch (error) {
    console.error('Error getting current service ID:', error);
  }
  return null;
}

async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const currentServiceId = getCurrentServiceId();
    const { getToken, setToken } = useAuthStore.getState();

    if (!currentServiceId) return false;

    const currentToken = getToken(currentServiceId);
    if (!currentToken) return false;

    const actualToken = extractToken(currentToken);
    if (!actualToken) return false;

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: actualToken }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.token && data.refreshed) {
        // Update the stored token with the new one
        const newTokenData = {
          ...currentToken,
          token: data.token,
          timestamp: Date.now(),
        };
        setToken(newTokenData);
        console.log('Token refreshed successfully via authFetch');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}
