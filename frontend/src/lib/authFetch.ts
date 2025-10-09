/**
 * Authenticated fetch wrapper
 * Automatically adds Authorization header with JWT token
 */

import { useAuthStore } from '../stores/authStore';
import { extractToken } from '../utils/authHelpers';

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = useAuthStore.getState().token;
  const actualToken = extractToken(token);

  const headers = new Headers(options.headers || {});

  // Add Authorization header if token exists
  if (actualToken) {
    headers.set('Authorization', `Bearer ${actualToken}`);
  }

  // Merge headers back into options
  const authOptions: RequestInit = {
    ...options,
    headers,
  };

  return fetch(url, authOptions);
}
