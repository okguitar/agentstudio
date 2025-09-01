import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SlidesResponse, SlideContent } from '../../../types/index.js';

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
export const useSlideContent = (slideIndex: number) => {
  return useQuery<SlideContent>({
    queryKey: ['slide-content', slideIndex],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/slides/${slideIndex}`);
      if (!response.ok) {
        throw new Error('Failed to fetch slide content');
      }
      return response.json();
    },
    enabled: slideIndex >= 0, // Only fetch if slideIndex is valid
  });
};

// Create new slide
export const useCreateSlide = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { title: string; content?: string }) => {
      const response = await fetch(`${API_BASE}/slides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create slide');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch slides
      queryClient.invalidateQueries({ queryKey: ['slides'] });
    },
  });
};

// Update slide content
export const useUpdateSlide = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ slideIndex, content }: { slideIndex: number; content: string }) => {
      const response = await fetch(`${API_BASE}/slides/${slideIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update slide');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate specific slide content and slides list
      queryClient.invalidateQueries({ queryKey: ['slide-content', variables.slideIndex] });
      queryClient.invalidateQueries({ queryKey: ['slides'] });
    },
  });
};

// Delete slide
export const useDeleteSlide = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (slideIndex: number) => {
      const response = await fetch(`${API_BASE}/slides/${slideIndex}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete slide');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch slides
      queryClient.invalidateQueries({ queryKey: ['slides'] });
    },
  });
};
