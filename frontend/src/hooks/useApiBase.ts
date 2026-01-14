import { useMemo } from 'react';
import { useBackendServices } from './useBackendServices';

/**
 * Hook to get the current API base URL dynamically
 *
 * NOTE: Currently NOT in use. The app uses window.location.reload() when switching services,
 * so the static API_BASE from config.ts is sufficient. This hook is kept as a future-proof
 * alternative if we want to switch services without page reload.
 *
 * This ensures the API base is always up-to-date with the current service selection,
 * allowing seamless service switching without page refresh.
 *
 * @returns The current API base URL (e.g., "http://127.0.0.1:4936/api")
 */
export function useApiBase(): string {
  const { currentService } = useBackendServices();

  return useMemo(() => {
    if (import.meta.env.VITE_API_BASE) {
      return import.meta.env.VITE_API_BASE;
    }

    if (currentService) {
      return `${currentService.url}/api`;
    }

    // Default fallback
    return 'http://127.0.0.1:4936/api';
  }, [currentService?.url]);
}
