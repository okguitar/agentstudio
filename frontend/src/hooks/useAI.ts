import { useMutation, useQuery } from '@tanstack/react-query';
import type { AIModelsResponse, ChatContext } from '../types/index.js';

const API_BASE = '/api';

// Get available AI models
export const useAIModels = () => {
  return useQuery<AIModelsResponse>({
    queryKey: ['ai-models'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/ai/models`);
      if (!response.ok) {
        throw new Error('Failed to fetch AI models');
      }
      return response.json();
    }
  });
};

// AI Chat with SSE streaming
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
        const response = await fetch(`${API_BASE}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message, context, sessionId }),
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
      const response = await fetch(`${API_BASE}/ai/edit-slide`, {
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
      const response = await fetch(`${API_BASE}/ai/generate-slide`, {
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

// Session management hooks
export const useSessions = () => {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/ai/sessions`);
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
      const response = await fetch(`${API_BASE}/ai/sessions`, {
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
      const response = await fetch(`${API_BASE}/ai/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      return response.json();
    }
  });
};

// Get session messages
export const useSessionMessages = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['session-messages', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        return { messages: [] };
      }

      const response = await fetch(`${API_BASE}/ai/sessions/${sessionId}/messages`);
      
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

// Fix stuck tools
export const useFixStuckTools = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/ai/sessions/fix-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fix stuck tools');
      }

      return response.json();
    }
  });
};