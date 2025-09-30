import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Subagent, SubagentCreate, SubagentUpdate, SubagentFilter } from '../types/subagents';
import { API_BASE, isApiUnavailableError } from '../lib/config';

// API functions
const fetchSubagents = async (filter: SubagentFilter = {}): Promise<Subagent[]> => {
  try {
    const params = new URLSearchParams();
    if (filter.search) params.append('search', filter.search);

    const response = await fetch(`${API_BASE}/subagents?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch subagents');
    }
    return response.json();
  } catch (error) {
    // If it's an API unavailable error, return empty data instead of throwing
    if (isApiUnavailableError(error)) {
      return [];
    }
    // For other errors, still throw
    throw error;
  }
};

const fetchSubagent = async (id: string): Promise<Subagent> => {
  const response = await fetch(`${API_BASE}/subagents/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch subagent');
  }
  return response.json();
};

const createSubagent = async (subagent: SubagentCreate): Promise<Subagent> => {
  const response = await fetch(`${API_BASE}/subagents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subagent),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create subagent');
  }
  return response.json();
};

const updateSubagent = async ({ id, ...updates }: { id: string } & SubagentUpdate): Promise<Subagent> => {
  const response = await fetch(`${API_BASE}/subagents/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update subagent');
  }
  return response.json();
};

const deleteSubagent = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/subagents/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete subagent');
  }
};

// Hooks
export const useSubagents = (filter: SubagentFilter = {}) => {
  return useQuery({
    queryKey: ['subagents', filter],
    queryFn: () => fetchSubagents(filter),
    retry: false, // Disable auto retry for list pages
  });
};

export const useSubagent = (id: string) => {
  return useQuery({
    queryKey: ['subagent', id],
    queryFn: () => fetchSubagent(id),
    enabled: !!id,
  });
};

export const useCreateSubagent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubagent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subagents'] });
    },
  });
};

export const useUpdateSubagent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSubagent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subagents'] });
      queryClient.invalidateQueries({ queryKey: ['subagent', data.id] });
    },
  });
};

export const useDeleteSubagent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSubagent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subagents'] });
    },
  });
};

// Project-specific subagents
const fetchProjectSubagents = async (projectId: string, filter: SubagentFilter = {}): Promise<Subagent[]> => {
  // First get the project info to get the path
  const projectResponse = await fetch(`${API_BASE}/projects`);
  if (!projectResponse.ok) {
    throw new Error('Failed to fetch project info');
  }
  const projectsData = await projectResponse.json();
  const project = projectsData.projects.find((p: any) => p.id === projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }

  const params = new URLSearchParams();
  params.append('projectPath', project.path);
  if (filter.search) params.append('search', filter.search);

  const response = await fetch(`${API_BASE}/subagents?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch project subagents');
  }
  return response.json();
};

export const useProjectSubagents = (filter: { projectId: string; search?: string }) => {
  return useQuery({
    queryKey: ['subagents', 'project', filter.projectId, filter.search],
    queryFn: () => fetchProjectSubagents(filter.projectId, { search: filter.search }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Project-specific subagent creation
const createProjectSubagent = async (projectId: string, subagent: SubagentCreate): Promise<Subagent> => {
  // First get the project info to get the path
  const projectResponse = await fetch(`${API_BASE}/projects`);
  if (!projectResponse.ok) {
    throw new Error('Failed to fetch project info');
  }
  const projectsData = await projectResponse.json();
  const project = projectsData.projects.find((p: any) => p.id === projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }

  const params = new URLSearchParams();
  params.append('projectPath', project.path);

  const response = await fetch(`${API_BASE}/subagents?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subagent),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create subagent');
  }
  return response.json();
};

// Project-specific subagent update
const updateProjectSubagent = async (projectId: string, data: { id: string } & SubagentUpdate): Promise<Subagent> => {
  // First get the project info to get the path
  const projectResponse = await fetch(`${API_BASE}/projects`);
  if (!projectResponse.ok) {
    throw new Error('Failed to fetch project info');
  }
  const projectsData = await projectResponse.json();
  const project = projectsData.projects.find((p: any) => p.id === projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }

  const { id, ...updates } = data;
  const params = new URLSearchParams();
  params.append('projectPath', project.path);

  const response = await fetch(`${API_BASE}/subagents/${id}?${params}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update subagent');
  }
  return response.json();
};

// Project-specific subagent deletion
const deleteProjectSubagent = async (projectId: string, id: string): Promise<void> => {
  // First get the project info to get the path
  const projectResponse = await fetch(`${API_BASE}/projects`);
  if (!projectResponse.ok) {
    throw new Error('Failed to fetch project info');
  }
  const projectsData = await projectResponse.json();
  const project = projectsData.projects.find((p: any) => p.id === projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }

  const params = new URLSearchParams();
  params.append('projectPath', project.path);

  const response = await fetch(`${API_BASE}/subagents/${id}?${params}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete subagent');
  }
};

export const useCreateProjectSubagent = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subagent: SubagentCreate) => createProjectSubagent(projectId, subagent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subagents', 'project', projectId] });
    },
  });
};

export const useUpdateProjectSubagent = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string } & SubagentUpdate) => updateProjectSubagent(projectId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subagents', 'project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['subagent', data.id] });
    },
  });
};

export const useDeleteProjectSubagent = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProjectSubagent(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subagents', 'project', projectId] });
    },
  });
};
