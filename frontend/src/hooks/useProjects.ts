import { useQuery } from '@tanstack/react-query';
import { API_BASE, isApiUnavailableError } from '../lib/config';
import { authFetch } from '../lib/authFetch';

export interface Project {
  id: string;
  dirName: string;
  name: string;
  path: string;
  description?: string;
  tags: string[];
  agents: string[];
  defaultAgent?: string;
  createdAt: string;
  lastAccessed?: string;
  metadata?: Record<string, any>;
}

interface ProjectsResponse {
  projects: Project[];
}

const fetchProjects = async (): Promise<ProjectsResponse> => {
  try {
    const response = await authFetch(`${API_BASE}/projects`);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    return response.json();
  } catch (error) {
    if (isApiUnavailableError(error)) {
      return { projects: [] };
    }
    throw error;
  }
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
};
