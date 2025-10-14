import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SlidesResponse, SlideContent } from '../../../types/index.js';
import { API_BASE } from '../../../lib/config.js';

// Helper function to parse slides configuration from content
const parseSlidesConfig = (configContent: string): { slides: string[], title: string } => {
  // Try to extract slides array and title from various formats
  
  // Format 1: window.presentationConfig
  let slidesMatch = configContent.match(/window\.presentationConfig\s*=\s*\{[\s\S]*?slides:\s*\[([\s\S]*?)\]/);
  const titleMatch = configContent.match(/title:\s*["']([^"']+)["']/);
  
  // Format 2: presentationConfig (without window)
  if (!slidesMatch) {
    slidesMatch = configContent.match(/presentationConfig\s*=\s*\{[\s\S]*?slides:\s*\[([\s\S]*?)\]/);
  }
  
  // Format 3: direct slides array
  if (!slidesMatch) {
    slidesMatch = configContent.match(/slides:\s*\[([\s\S]*?)\]/);
  }
  
  // Format 4: window.slidesConfig
  if (!slidesMatch) {
    slidesMatch = configContent.match(/window\.slidesConfig\s*=\s*\[([\s\S]*?)\]/);
  }
  
  // Format 5: slidesConfig
  if (!slidesMatch) {
    slidesMatch = configContent.match(/slidesConfig\s*=\s*\[([\s\S]*?)\]/);
  }
  
  if (!slidesMatch) {
    throw new Error('Invalid slides configuration format');
  }

  // Extract slide paths
  const slidesArrayContent = slidesMatch[1];
  const slideMatches = slidesArrayContent.match(/"([^"]+)"/g);
  const slides = slideMatches ? slideMatches.map(match => match.replace(/"/g, '')) : [];
  
  // Extract title, fallback to default
  const title = titleMatch ? titleMatch[1] : 'Presentation';
  
  return { slides, title };
};

// Helper function to extract title from HTML content
const extractTitleFromHtml = (content: string): string => {
  const titleMatch = content.match(/<title>(.*?)<\/title>/i) || 
                    content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (titleMatch) {
    return titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }
  return '';
};

// Fetch all slides
export const useSlides = (projectPath?: string) => {
  return useQuery<SlidesResponse>({
    queryKey: ['slides', projectPath],
    queryFn: async () => {
      // First, read the slides configuration file
      const configUrl = new URL(`${API_BASE}/files/read`, window.location.origin);
      configUrl.searchParams.set('path', 'slides.js');
      if (projectPath) {
        configUrl.searchParams.set('projectPath', projectPath);
      }
      const configResponse = await fetch(configUrl);
      
      // If slides.js doesn't exist, return empty slides response
      if (!configResponse.ok) {
        if (configResponse.status === 404) {
          return {
            slides: [],
            title: 'Presentation',
            total: 0
          };
        }
        throw new Error('Failed to fetch slides configuration');
      }
      
      const configData = await configResponse.json();
      const { slides: slidePaths, title } = parseSlidesConfig(configData.content);

      // Then, read all slide files to get metadata
      const slidesUrl = new URL(`${API_BASE}/files/read-multiple`, window.location.origin);
      if (projectPath) {
        slidesUrl.searchParams.set('projectPath', projectPath);
      }
      const slidesResponse = await fetch(slidesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paths: slidePaths
        })
      });

      if (!slidesResponse.ok) {
        throw new Error('Failed to fetch slide files');
      }

      const slidesData = await slidesResponse.json();
      
      // Build slides with metadata
      const slidesWithMetadata = slidePaths.map((slidePath, index) => {
        const slideFile = slidesData.files.find((file: any) => 
          file.path === slidePath
        );
        
        let slideTitle = slidePath.split('/').pop()?.replace('.html', '') || `Slide ${index + 1}`;
        
        // Try to extract title from HTML if file exists and has content
        if (slideFile?.exists && slideFile.content) {
          const extractedTitle = extractTitleFromHtml(slideFile.content);
          if (extractedTitle) {
            slideTitle = extractedTitle;
          }
        }

        return {
          path: slidePath,
          title: slideTitle,
          exists: slideFile?.exists || false,
          index
        };
      });

      return {
        slides: slidesWithMetadata,
        total: slidePaths.length,
        title: title
      };
    }
  });
};

// Fetch specific slide content
export const useSlideContent = (slideIndex: number, projectPath?: string) => {
  return useQuery<SlideContent>({
    queryKey: ['slide-content', slideIndex, projectPath],
    queryFn: async () => {
      // First get the slides configuration to find the path
      const configUrl = new URL(`${API_BASE}/files/read`, window.location.origin);
      configUrl.searchParams.set('path', 'slides.js');
      if (projectPath) {
        configUrl.searchParams.set('projectPath', projectPath);
      }
      const configResponse = await fetch(configUrl);
      if (!configResponse.ok) {
        if (configResponse.status === 404) {
          throw new Error('No slides configuration found. Please create slides.js file first.');
        }
        throw new Error('Failed to fetch slides configuration');
      }
      
      const configData = await configResponse.json();
      const { slides: slidePaths } = parseSlidesConfig(configData.content);

      if (slideIndex >= slidePaths.length) {
        throw new Error('Slide not found');
      }

      const slidePath = slidePaths[slideIndex];

      // Then read the specific slide file
      const slideUrl = new URL(`${API_BASE}/files/read`, window.location.origin);
      slideUrl.searchParams.set('path', slidePath);
      if (projectPath) {
        slideUrl.searchParams.set('projectPath', projectPath);
      }
      const slideResponse = await fetch(slideUrl);
      if (!slideResponse.ok) {
        throw new Error('Failed to fetch slide content');
      }

      const slideData = await slideResponse.json();

      return {
        content: slideData.content,
        path: slidePath,
        index: slideIndex
      };
    },
    enabled: slideIndex >= 0, // Only fetch if slideIndex is valid
  });
};

// Update slide content
export const useUpdateSlide = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ slideIndex, content, projectPath }: { slideIndex: number; content: string; projectPath?: string }) => {
      // First get the slides configuration to find the path
      const configUrl = new URL(`${API_BASE}/files/read`, window.location.origin);
      configUrl.searchParams.set('path', 'slides.js');
      if (projectPath) {
        configUrl.searchParams.set('projectPath', projectPath);
      }
      const configResponse = await fetch(configUrl);
      if (!configResponse.ok) {
        if (configResponse.status === 404) {
          throw new Error('No slides configuration found. Please create slides.js file first.');
        }
        throw new Error('Failed to fetch slides configuration');
      }
      
      const configData = await configResponse.json();
      const { slides: slidePaths } = parseSlidesConfig(configData.content);

      if (slideIndex >= slidePaths.length) {
        throw new Error('Slide not found');
      }

      const slidePath = slidePaths[slideIndex];

      // Then write the slide content
      const writeUrl = new URL(`${API_BASE}/files/write`, window.location.origin);
      if (projectPath) {
        writeUrl.searchParams.set('projectPath', projectPath);
      }
      const response = await fetch(writeUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          path: slidePath,
          content 
        }),
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
