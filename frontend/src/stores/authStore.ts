import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TokenData {
  token: string;
  serviceId?: string;
  serviceName?: string;
  serviceUrl?: string;
  timestamp: number;
}

interface AuthState {
  token: string | TokenData | null;
  isAuthenticated: boolean;
  setToken: (token: string | TokenData | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      logout: () => set({ token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // LocalStorage key
    }
  )
);
