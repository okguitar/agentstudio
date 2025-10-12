import { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useBackendServices } from './useBackendServices';
import { API_BASE } from '../lib/config.js';
import { isTokenExpired, extractToken } from '../utils/authHelpers';

export function useAuth() {
  const { token, setToken, removeToken, getToken } = useAuthStore();
  const { currentService } = useBackendServices();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

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
      const networkError = new Error('Network error occurred during login') as Error & {
        originalError?: any;
        type?: string;
        url?: string;
        timestamp?: number;
      };

      if (err instanceof Error) {
        networkError.originalError = {
          message: err.message,
          stack: err.stack,
          name: err.name
        };
        networkError.type = err.name;
      } else {
        networkError.originalError = err;
        networkError.type = typeof err;
      }

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

      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: actualToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        removeToken(currentService.id);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Token verification error:', err);
      removeToken(currentService.id);
      return false;
    }
  }, [currentService, getToken, removeToken]);

  return {
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    verifyToken,
  };
}
