import { useMutation, useQuery } from '@tanstack/react-query';
import type { AgentConfig, ChatContext, ImageData } from '../types/index.js';

const API_BASE = '/api';

// Agent management hooks
export const useAgents = (enabled?: boolean, type?: string) => {
  return useQuery<{ agents: AgentConfig[] }>({
    queryKey: ['agents', enabled, type],
    queryFn: async () => {
      const url = new URL(`${window.location.origin}${API_BASE}/agents`);
      if (enabled !== undefined) {
        url.searchParams.append('enabled', String(enabled));
      }
      if (type) {
        url.searchParams.append('type', type);
      }
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      return response.json();
    }
  });
};

export const useAgent = (agentId: string) => {
  return useQuery<{ agent: AgentConfig }>({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/agents/${agentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent');
      }
      return response.json();
    },
    enabled: !!agentId
  });
};

export const useCreateAgent = () => {
  return useMutation({
    mutationFn: async (agentData: Omit<AgentConfig, 'createdAt' | 'updatedAt'>) => {
      const response = await fetch(`${API_BASE}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentData)
      });

      if (!response.ok) {
        throw new Error('Failed to create agent');
      }

      return response.json();
    }
  });
};

export const useUpdateAgent = () => {
  return useMutation({
    mutationFn: async ({ agentId, data }: { agentId: string; data: Partial<AgentConfig> }) => {
      const response = await fetch(`${API_BASE}/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      return response.json();
    }
  });
};

export const useDeleteAgent = () => {
  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await fetch(`${API_BASE}/agents/${agentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      return response.json();
    }
  });
};

// Agent session hooks
export const useAgentSessions = (agentId: string, searchTerm?: string, projectPath?: string) => {
  return useQuery({
    queryKey: ['agent-sessions', agentId, searchTerm, projectPath],
    queryFn: async () => {
      const url = new URL(`${window.location.origin}${API_BASE}/sessions/${agentId}`);
      if (searchTerm && searchTerm.trim()) {
        url.searchParams.append('search', searchTerm.trim());
      }
      if (projectPath) {
        url.searchParams.set('projectPath', projectPath);
      }
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch agent sessions');
      }
      return response.json();
    },
    enabled: !!agentId
  });
};


// Get agent session messages
export const useAgentSessionMessages = (agentId: string, sessionId: string | null, projectPath?: string) => {
  console.log('🎣 useAgentSessionMessages hook called:', {
    agentId,
    sessionId,
    projectPath,
    enabled: !!agentId && !!sessionId
  });
  
  return useQuery({
    queryKey: ['agent-session-messages', agentId, sessionId, projectPath],
    queryFn: async () => {
      console.log('🎣 Fetching session messages for:', { agentId, sessionId, projectPath });
      
      if (!sessionId) {
        return { messages: [] };
      }

      const url = new URL(`${window.location.origin}${API_BASE}/sessions/${agentId}/${sessionId}/messages`);
      if (projectPath) {
        url.searchParams.set('projectPath', projectPath);
      }
      
      console.log('🎣 Fetching from URL:', url.toString());
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error('🎣 Fetch failed:', response.status, response.statusText);
        throw new Error('Failed to fetch agent session messages');
      }

      const data = await response.json();
      
      console.log('🎣 Raw API response:', { messageCount: data.messages?.length });
      
      // Convert timestamps from number to Date objects to match ChatMessage interface
      const convertedMessages = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      console.log('🎣 Converted messages:', { messageCount: convertedMessages.length });
      
      return {
        ...data,
        messages: convertedMessages
      };
    },
    enabled: !!agentId && !!sessionId
  });
};

// Agent-specific AI chat hook
export const useAgentChat = () => {
  return {
    mutateAsync: async ({ 
      agentId,
      message, 
      images,
      context, 
      sessionId,
      projectPath,
      mcpTools,
      permissionMode,
      model,
      abortController,
      onMessage, 
      onError 
    }: { 
      agentId: string;
      message: string; 
      images?: ImageData[];
      context?: ChatContext; 
      sessionId?: string | null;
      projectPath?: string;
      mcpTools?: string[];
      permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
      model?: 'sonnet' | 'opus';
      abortController?: AbortController;
      onMessage?: (data: unknown) => void;
      onError?: (error: unknown) => void;
    }) => {
      try {
        console.log('🚀 Starting SSE request to:', `${API_BASE}/agents/chat`);
        const response = await fetch(`${API_BASE}/agents/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ agentId, message, images, context, sessionId, projectPath, mcpTools, permissionMode, model }),
          signal: abortController?.signal
        });

        console.log('🚀 SSE response received:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          throw new Error(`Agent chat request failed: ${response.status} ${response.statusText}`);
        }

        // Create EventSource for SSE
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        console.log('🚀 Starting SSE stream reading...');

        while (true) {
          // Check if request was aborted
          if (abortController?.signal.aborted) {
            reader.cancel();
            throw new DOMException('Request aborted', 'AbortError');
          }
          
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = line.slice(6);
                console.log('🔄 Raw SSE data:', jsonData.length > 200 ? jsonData.substring(0, 200) + '...' : jsonData);
                const data = JSON.parse(jsonData);
                console.log('🔄 Parsed SSE event:', {
                  type: data.type,
                  subtype: data.subtype,
                  hasMessage: !!data.message,
                  messageContentBlocks: data.message?.content?.length || 0
                });
                onMessage?.(data);
              } catch (error) {
                console.error('❌ Failed to parse SSE data:', line, 'Error:', error);
              }
            } else if (line.trim()) {
              console.log('🔄 Non-data SSE line:', line);
            }
          }
        }

      } catch (error) {
        console.error('Agent SSE error:', error);
        onError?.(error);
        throw error;
      }
    }
  };
};

// Create new project
export const useCreateProject = () => {
  return useMutation({
    mutationFn: async ({ agentId, projectName, parentDirectory }: { 
      agentId: string; 
      projectName: string;
      parentDirectory?: string;
    }) => {
      const response = await fetch(`${API_BASE}/agents/projects/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId, projectName, parentDirectory })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      return response.json();
    }
  });
};

// Get projects for a specific agent
export const useAgentProjects = (agentId: string) => {
  return useQuery({
    queryKey: ['agent-projects', agentId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/projects/agents/${agentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent projects');
      }
      return response.json();
    },
    enabled: !!agentId
  });
};