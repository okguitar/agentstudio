import { useMutation, useQuery } from '@tanstack/react-query';
import type { AIModelsResponse, ChatContext } from '../types/index.js';
import { API_BASE } from '../lib/config.js';
import { authFetch } from '../lib/authFetch';

// Get available AI models
export const useAIModels = () => {
  return useQuery<AIModelsResponse>({
    queryKey: ['ai-models'],
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/ai/models`);
      if (!response.ok) {
        throw new Error('Failed to fetch AI models');
      }
      return response.json();
    }
  });
};

// AI Chat with SSE streaming (backward compatibility - defaults to PPT agent)
export const useAIChat = () => {
  return {
    mutateAsync: async ({
      message,
      context,
      sessionId,
      abortController,
      onMessage,
      onError
    }: {
      message: string;
      context?: ChatContext;
      sessionId?: string | null;
      abortController?: AbortController;
      onMessage?: (data: unknown) => void;
      onError?: (error: unknown) => void;
    }) => {
      try {
        const response = await authFetch(`${API_BASE}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ agentId: 'ppt-editor', message, context, sessionId }),
          signal: abortController?.signal
        });

        if (!response.ok) {
          throw new Error('AI chat request failed');
        }

        // Create EventSource for SSE
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          // Check if request was aborted
          if (abortController?.signal.aborted) {
            reader.cancel();
            throw new DOMException('Request aborted', 'AbortError');
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onMessage?.(data);
              } catch {
                console.warn('Failed to parse SSE data:', line);
              }
            }
          }
        }

      } catch (error) {
        console.error('SSE error:', error);
        onError?.(error);
        throw error;
      }
    }
  };
};

// AI Edit Slide
export const useAIEditSlide = () => {
  return useMutation({
    mutationFn: async ({
      slideIndex,
      currentContent,
      instruction,
      preserveStyle = true
    }: {
      slideIndex: number;
      currentContent: string;
      instruction: string;
      preserveStyle?: boolean;
    }) => {
      const response = await authFetch(`${API_BASE}/ai/edit-slide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slideIndex,
          currentContent,
          instruction,
          preserveStyle
        })
      });

      if (!response.ok) {
        throw new Error('AI edit request failed');
      }

      return response;
    }
  });
};

// AI Generate Slide
export const useAIGenerateSlide = () => {
  return useMutation({
    mutationFn: async ({
      topic,
      style = 'professional',
      includeImages = false
    }: {
      topic: string;
      style?: string;
      includeImages?: boolean;
    }) => {
      const response = await authFetch(`${API_BASE}/ai/generate-slide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic,
          style,
          includeImages
        })
      });

      if (!response.ok) {
        throw new Error('AI generation request failed');
      }

      return response;
    }
  });
};

// Session management hooks (backward compatibility - PPT agent)
export const useSessions = (searchTerm?: string) => {
  return useQuery({
    queryKey: ['sessions', searchTerm],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/sessions/ppt-editor`);
      if (searchTerm && searchTerm.trim()) {
        url.searchParams.append('search', searchTerm.trim());
      }
      const response = await authFetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      return response.json();
    }
  });
};

export const useCreateSession = () => {
  return useMutation({
    mutationFn: async (title?: string) => {
      const response = await authFetch(`${API_BASE}/sessions/ppt-editor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      return response.json();
    }
  });
};

export const useDeleteSession = () => {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await authFetch(`${API_BASE}/sessions/ppt-editor/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      return response.json();
    }
  });
};

// Get session messages (backward compatibility - PPT agent)
export const useSessionMessages = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['session-messages', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        return { messages: [] };
      }

      const response = await authFetch(`${API_BASE}/sessions/ppt-editor/${sessionId}/messages`);

      if (!response.ok) {
        throw new Error('Failed to fetch session messages');
      }

      const data = await response.json();

      // Convert timestamps from number to Date objects to match ChatMessage interface
      const convertedMessages = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      return {
        ...data,
        messages: convertedMessages
      };
    },
    enabled: !!sessionId
  });
};

// Fix stuck tools (deprecated - keeping for backward compatibility)
export const useFixStuckTools = () => {
  return useMutation({
    mutationFn: async () => {
      // This functionality is now handled per-agent
      console.warn('useFixStuckTools is deprecated - use agent-specific session management');
      return { success: true, message: 'Function deprecated' };
    }
  });
};