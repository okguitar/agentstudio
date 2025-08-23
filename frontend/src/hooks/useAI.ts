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

// AI Chat
export const useAIChat = () => {
  return useMutation({
    mutationFn: async ({ message, context }: { message: string; context?: ChatContext }) => {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, context })
      });

      if (!response.ok) {
        throw new Error('AI chat request failed');
      }

      return response;
    }
  });
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