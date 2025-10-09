import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { API_BASE } from '../lib/config.js';

export function useAuth() {
  const { token, isAuthenticated, setToken, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

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
        setError(data.error || 'Login failed');
        return false;
      }

      setToken(data.token);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint (optional, mainly for consistency)
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear local state
      storeLogout();
    }
  };

  const verifyToken = async (): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        storeLogout();
        return false;
      }

      return true;
    } catch (err) {
      console.error('Token verification error:', err);
      storeLogout();
      return false;
    }
  };

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
