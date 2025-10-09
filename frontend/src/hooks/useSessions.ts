import { useQuery } from '@tanstack/react-query';
import { API_BASE, isApiUnavailableError } from '../lib/config';
import { authFetch } from '../lib/authFetch';

export interface SessionInfo {
  sessionId: string;
  agentId: string;
  isActive: boolean;
  lastActivity: number;
  idleTimeMs: number;
  lastHeartbeat: number | null;
  heartbeatTimedOut: boolean;
  status: 'confirmed' | 'pending';
  projectPath: string | null;
  claudeVersionId?: string;
}

export interface SessionsResponse {
  activeSessionCount: number;
  sessions: SessionInfo[];
  message: string;
}

const fetchSessions = async (): Promise<SessionsResponse> => {
  try {
    const response = await authFetch(`${API_BASE}/agents/sessions`);
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    return response.json();
  } catch (error) {
    // If it's an API unavailable error, return empty data instead of throwing
    if (isApiUnavailableError(error)) {
      return {
        activeSessionCount: 0,
        sessions: [],
        message: 'API service unavailable'
      };
    }
    // For other errors, still throw
    throw error;
  }
};

export const useSessions = () => {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    refetchInterval: 5000, // Normal refresh every 5 seconds
    retry: (failureCount, error) => {
      // Don't retry if it's an API unavailable error (though this shouldn't happen now)
      if (isApiUnavailableError(error)) {
        return false;
      }
      // For other errors, retry up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const closeSession = async (sessionId: string): Promise<void> => {
  const response = await authFetch(`${API_BASE}/agents/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to close session');
  }
};

export const cleanupSession = async (agentId: string, sessionId: string): Promise<void> => {
  const response = await authFetch(`${API_BASE}/sessions/${agentId}/${sessionId}/cleanup`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to cleanup session');
  }
};