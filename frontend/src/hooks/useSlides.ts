import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SlidesResponse, SlideContent } from '../types/index.js';

const API_BASE = '/api';

// Fetch all slides
export const useSlides = () => {
  return useQuery<SlidesResponse>({
    queryKey: ['slides'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/slides`);
      if (!response.ok) {
        throw new Error('Failed to fetch slides');
      }
      return response.json();
    }
  });
};

// Fetch specific slide content
export const useSlideContent = (index: number | null) => {
  return useQuery<SlideContent>({
    queryKey: ['slide', index],
    queryFn: async () => {
      if (index === null) throw new Error('No slide index provided');
      const response = await fetch(`${API_BASE}/slides/${index}`);
      if (!response.ok) {
        throw new Error('Failed to fetch slide content');
      }
      return response.json();
    },
    enabled: index !== null
  });
};

// Update slide content
export const useUpdateSlide = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ index, content }: { index: number; content: string }) => {
      const response = await fetch(`${API_BASE}/slides/${index}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update slide');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['slide', variables.index] });
      queryClient.invalidateQueries({ queryKey: ['slides'] });
    }
  });
};

// Create new slide
export const useCreateSlide = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ content, slideIndex }: { content: string; slideIndex?: number }) => {
      const response = await fetch(`${API_BASE}/slides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, slideIndex })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create slide');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slides'] });
    }
  });
};

// Delete slide
export const useDeleteSlide = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (index: number) => {
      const response = await fetch(`${API_BASE}/slides/${index}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete slide');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slides'] });
    }
  });
};