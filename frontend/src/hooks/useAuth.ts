import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useBackendServices } from './useBackendServices';
import { API_BASE } from '../lib/config.js';
import { isTokenExpired, extractToken, shouldRefreshToken as shouldRefreshTokenUtil } from '../utils/authHelpers';

export function useAuth() {
  const { token, setToken, removeToken, getToken } = useAuthStore();
  const { currentService } = useBackendServices();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshCheckRef = useRef<number>(0);

  // Use only the service ID to avoid unnecessary re-renders
  const currentServiceId = currentService?.id;

  // Check if the current service has a token - use useMemo to stabilize
  const currentServiceToken = useMemo(() =>
    currentServiceId ? getToken(currentServiceId) : null,
    [currentServiceId, getToken]
  );
  const isAuthenticated = !!currentServiceToken;

  const login = useCallback(async (password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    if (!currentService) {
      setError('No service selected');
      setIsLoading(false);
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Create detailed error object
        const loginError = new Error(data.error || 'Login failed') as Error & {
          status?: number;
          details?: any;
          url?: string;
          timestamp?: number;
        };
        loginError.status = response.status;
        loginError.details = data as unknown;
        loginError.url = API_BASE;
        loginError.timestamp = Date.now();
        setError(loginError);
        return false;
      }

      // Store token with service information
      const tokenData = {
        token: data.token,
        serviceId: currentService.id,
        serviceName: currentService.name,
        serviceUrl: currentService.url,
        timestamp: Date.now()
      };

      setToken(tokenData);
      return true;
    } catch (err) {
      // Create detailed error object for network/other errors
      const networkError = new Error(`Network error occurred during login`) as Error & {
        originalError?: any;
        type?: string;
        url?: string;
        timestamp?: number;
        requestUrl?: string;
        requestMethod?: string;
        requestBody?: any;
        statusCode?: number;
        statusText?: string;
        isNetworkError?: boolean;
        isTimeout?: boolean;
        isAbortError?: boolean;
      };

      const loginUrl = `${API_BASE}/auth/login`;

      if (err instanceof Error) {
        networkError.originalError = {
          message: err.message,
          stack: err.stack,
          name: err.name
        };
        networkError.type = err.name;
        
        // Detect specific error types
        if (err.name === 'TypeError') {
          networkError.isNetworkError = true;
          if (err.message.includes('fetch')) {
            networkError.message = `Failed to connect to server at ${API_BASE}`;
          } else if (err.message.includes('network')) {
            networkError.message = `Network connection error while contacting ${API_BASE}`;
          }
        } else if (err.name === 'AbortError') {
          networkError.isAbortError = true;
          networkError.message = `Login request timed out for ${loginUrl}`;
        }
      } else {
        networkError.originalError = err;
        networkError.type = typeof err;
      }

      networkError.requestUrl = loginUrl;
      networkError.requestMethod = 'POST';
      networkError.requestBody = { password: '[REDACTED]' };
      networkError.url = API_BASE;
      networkError.timestamp = Date.now();

      setError(networkError);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentService, setToken]);

  const logout = useCallback(async () => {
    if (!currentService) return;

    try {
      // Get the token for the current service
      const currentToken = getToken(currentService.id);

      // Call logout endpoint (optional, mainly for consistency)
      if (currentToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken.token}`,
          },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Remove token for the current service
      if (currentService) {
        removeToken(currentService.id);
      }
    }
  }, [currentService, getToken, removeToken]);

  const verifyToken = useCallback(async (): Promise<boolean> => {
    if (!currentService) return false;

    // Get token for the current service
    const currentToken = getToken(currentService.id);
    if (!currentToken) return false;

    // Check if token is expired
    if (isTokenExpired(currentToken)) {
      removeToken(currentService.id);
      return false;
    }

    try {
      const actualToken = extractToken(currentToken);
      if (!actualToken) {
        removeToken(currentService.id);
        return false;
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: actualToken }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || !data.valid) {
        // Only remove token if it's actually invalid (401)
        if (response.status === 401) {
          removeToken(currentService.id);
        }
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Token verification error:', err);

      // Don't remove token for network errors, only for authentication errors
      if (err.name === 'AbortError') {
        // Request timed out - this is a network issue, not auth issue
        console.warn('Token verification request timed out');
        return false; // Don't remove token
      }

      if (err instanceof TypeError && (
        err.message.includes('fetch') ||
        err.message.includes('network') ||
        err.message.includes('Failed to fetch')
      )) {
        // Network error - don't remove token
        console.warn('Network error during token verification, keeping token');
        return false; // Don't remove token
      }

      // For other errors, remove token to be safe
      removeToken(currentService.id);
      return false;
    }
  }, [currentService, getToken, removeToken]);

  // Auto refresh token function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!currentService || isRefreshing) return false;

    const currentToken = getToken(currentService.id);
    if (!currentToken || isTokenExpired(currentToken)) {
      return false;
    }

    // Check if token needs refresh
    if (!shouldRefreshTokenUtil(currentToken)) {
      return true; // Token is still valid
    }

    setIsRefreshing(true);
    try {
      const actualToken = extractToken(currentToken);
      if (!actualToken) {
        return false;
      }

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: actualToken }),
      });

      if (!response.ok) {
        console.error('Token refresh failed:', response.status);
        return false;
      }

      const data = await response.json();

      if (data.success && data.token) {
        if (data.refreshed) {
          // Update the stored token with the new one
          const newTokenData = {
            ...currentToken,
            token: data.token,
            timestamp: Date.now(),
          };
          setToken(newTokenData);
          console.log('Token refreshed successfully');
        }
        return true;
      }

      return false;
    } catch (err) {
      console.error('Token refresh error:', err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [currentService, getToken, isRefreshing, setToken]);

  // Setup automatic token refresh
  useEffect(() => {
    if (!currentService || !isAuthenticated) {
      // Clear timer if no service or not authenticated
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    // Check for token refresh every 5 minutes
    refreshTimerRef.current = setInterval(async () => {
      const now = Date.now();

      // Don't check too frequently (at least 2 minutes between checks)
      if (now - lastRefreshCheckRef.current < 2 * 60 * 1000) {
        return;
      }

      lastRefreshCheckRef.current = now;

      const currentToken = getToken(currentService.id);
      if (currentToken && shouldRefreshTokenUtil(currentToken)) {
        console.log('Auto-refreshing token...');
        await refreshToken();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [currentService, isAuthenticated, getToken, refreshToken]);

  // Check for refresh on initial load and when service changes
  useEffect(() => {
    if (!currentService || !isAuthenticated) return;

    const checkAndRefresh = async () => {
      const currentToken = getToken(currentService.id);
      if (currentToken && shouldRefreshTokenUtil(currentToken)) {
        console.log('Token needs refresh on service change...');
        await refreshToken();
      }
    };

    checkAndRefresh();
  }, [currentService?.id]); // Only depend on service ID

  return {
    token,
    isAuthenticated,
    isLoading,
    error,
    isRefreshing,
    login,
    logout,
    verifyToken,
    refreshToken,
  };
}
