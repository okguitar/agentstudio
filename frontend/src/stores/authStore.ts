import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TokenData {
  token: string;
  serviceId: string;
  serviceName: string;
  serviceUrl: string;
  timestamp: number;
}

// Map of serviceId to TokenData
export type TokensMap = Record<string, TokenData>;

interface AuthState {
  // Legacy single token support (for migration)
  token: string | TokenData | null;
  // New multi-service tokens map
  tokens: TokensMap;
  isAuthenticated: boolean;

  // Get token for a specific service
  getToken: (serviceId: string) => TokenData | null;

  // Set token for a specific service
  setToken: (tokenData: TokenData) => void;

  // Remove token for a specific service
  removeToken: (serviceId: string) => void;

  // Clear all tokens (logout)
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      tokens: {},
      isAuthenticated: false,

      getToken: (serviceId: string) => {
        const { tokens } = get();
        return tokens[serviceId] || null;
      },

      setToken: (tokenData: TokenData) => {
        set((state) => ({
          tokens: {
            ...state.tokens,
            [tokenData.serviceId]: tokenData,
          },
          token: tokenData, // Keep legacy token for backward compatibility
          isAuthenticated: true,
        }));
      },

      removeToken: (serviceId: string) => {
        set((state) => {
          const newTokens = { ...state.tokens };
          delete newTokens[serviceId];

          // If the removed token was the current one, clear it
          const currentToken = state.token;
          const shouldClearCurrentToken =
            currentToken &&
            typeof currentToken === 'object' &&
            'serviceId' in currentToken &&
            currentToken.serviceId === serviceId;

          return {
            tokens: newTokens,
            token: shouldClearCurrentToken ? null : state.token,
            isAuthenticated: shouldClearCurrentToken ? false : state.isAuthenticated,
          };
        });
      },

      logout: () => set({ tokens: {}, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // LocalStorage key
      // Migration function to convert old single token to new format
      migrate: (persistedState: unknown, _version: number) => {
        const state = persistedState as { token?: unknown; tokens?: unknown };
        if (state.token && !state.tokens) {
          const token = state.token;
          if (typeof token === 'object' && token && 'serviceId' in token) {
            return {
              ...state,
              tokens: { [(token as { serviceId: string }).serviceId]: token },
            };
          }
        }
        return persistedState;
      },
    }
  )
);
