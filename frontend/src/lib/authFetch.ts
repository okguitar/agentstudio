/**
 * Authenticated fetch wrapper
 * Automatically adds Authorization header with JWT token
 */

import { useAuthStore } from '../stores/authStore';

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = useAuthStore.getState().token;

  const headers = new Headers(options.headers || {});

  // Add Authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Merge headers back into options
  const authOptions: RequestInit = {
    ...options,
    headers,
  };

  return fetch(url, authOptions);
}
