import { useQuery } from '@tanstack/react-query';

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
}

export interface SessionsResponse {
  activeSessionCount: number;
  sessions: SessionInfo[];
  message: string;
}

const fetchSessions = async (): Promise<SessionsResponse> => {
  const response = await fetch('/api/agents/sessions');
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }
  return response.json();
};

export const useSessions = () => {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
};

export const closeSession = async (sessionId: string): Promise<void> => {
  const response = await fetch(`/api/agents/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to close session');
  }
};

export const cleanupSession = async (agentId: string, sessionId: string): Promise<void> => {
  const response = await fetch(`/api/sessions/${agentId}/${sessionId}/cleanup`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to cleanup session');
  }
};