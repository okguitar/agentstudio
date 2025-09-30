import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SlashCommand, SlashCommandCreate, SlashCommandUpdate, SlashCommandFilter } from '../types/commands';
import { API_BASE, isApiUnavailableError } from '../lib/config';


// API functions
const fetchCommands = async (filter: SlashCommandFilter = {}): Promise<SlashCommand[]> => {
  try {
    const params = new URLSearchParams();
    if (filter.scope && filter.scope !== 'all') params.append('scope', filter.scope);
    if (filter.namespace) params.append('namespace', filter.namespace);
    if (filter.search) params.append('search', filter.search);

    const response = await fetch(`${API_BASE}/commands?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch commands');
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

const fetchCommand = async (id: string): Promise<SlashCommand> => {
  const response = await fetch(`${API_BASE}/commands/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch command');
  }
  return response.json();
};

const createCommand = async (command: SlashCommandCreate): Promise<SlashCommand> => {
  const response = await fetch(`${API_BASE}/commands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create command');
  }
  
  return response.json();
};

const updateCommand = async (id: string, updates: SlashCommandUpdate): Promise<SlashCommand> => {
  const response = await fetch(`${API_BASE}/commands/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update command');
  }
  
  return response.json();
};

const deleteCommand = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/commands/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete command');
  }
};

// React Query hooks
export const useCommands = (filter?: SlashCommandFilter) => {
  return useQuery({
    queryKey: ['commands', filter],
    queryFn: () => fetchCommands(filter),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Disable auto retry for list pages
  });
};

export const useCommand = (id: string) => {
  return useQuery({
    queryKey: ['commands', id],
    queryFn: () => fetchCommand(id),
    enabled: !!id,
  });
};

export const useCreateCommand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCommand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands'] });
    },
  });
};

export const useUpdateCommand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: SlashCommandUpdate }) =>
      updateCommand(id, updates),
    onSuccess: (updatedCommand) => {
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      queryClient.setQueryData(['commands', updatedCommand.id], updatedCommand);
    },
  });
};

export const useDeleteCommand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCommand,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      queryClient.removeQueries({ queryKey: ['commands', deletedId] });
    },
  });
};

// Project-specific commands
const fetchProjectCommands = async (projectIdentifier: string, filter: Omit<SlashCommandFilter, 'scope'> = {}): Promise<SlashCommand[]> => {
  if (!projectIdentifier) {
    return [];
  }

  let projectPath: string;

  // Check if projectIdentifier is already a path (starts with /)
  if (projectIdentifier.startsWith('/')) {
    projectPath = projectIdentifier;
  } else {
    // It's a project ID, need to resolve to path
    const projectResponse = await fetch(`/api/projects`);
    if (!projectResponse.ok) {
      throw new Error('Failed to fetch project info');
    }
    const projectsData = await projectResponse.json();
    const project = projectsData.projects.find((p: any) => p.id === projectIdentifier);
    
    if (!project) {
      throw new Error('Project not found');
    }
    projectPath = project.path;
  }

  const params = new URLSearchParams();
  params.append('scope', 'project');
  params.append('projectPath', projectPath);
  if (filter.namespace) params.append('namespace', filter.namespace);
  if (filter.search) params.append('search', filter.search);

  const response = await fetch(`${API_BASE}/commands?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch project commands');
  }
  return response.json();
};

export const useProjectCommands = (filter: { projectId: string; search?: string }) => {
  return useQuery({
    queryKey: ['commands', 'project', filter.projectId, filter.search],
    queryFn: () => fetchProjectCommands(filter.projectId, { search: filter.search }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Project-specific command creation
const createProjectCommand = async (projectId: string, command: SlashCommandCreate): Promise<SlashCommand> => {
  // First get the project info to get the path
  const projectResponse = await fetch(`/api/agents/projects`);
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

  const response = await fetch(`${API_BASE}/commands?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create command');
  }
  
  return response.json();
};

// Project-specific command update
const updateProjectCommand = async (projectId: string, data: { id: string; updates: SlashCommandUpdate }): Promise<SlashCommand> => {
  // First get the project info to get the path
  const projectResponse = await fetch(`/api/agents/projects`);
  if (!projectResponse.ok) {
    throw new Error('Failed to fetch project info');
  }
  const projectsData = await projectResponse.json();
  const project = projectsData.projects.find((p: any) => p.id === projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }

  const { id, updates } = data;
  const params = new URLSearchParams();
  params.append('projectPath', project.path);

  const response = await fetch(`${API_BASE}/commands/${encodeURIComponent(id)}?${params}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update command');
  }
  
  return response.json();
};

// Project-specific command deletion
const deleteProjectCommand = async (projectId: string, id: string): Promise<void> => {
  // First get the project info to get the path
  const projectResponse = await fetch(`/api/agents/projects`);
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

  const response = await fetch(`${API_BASE}/commands/${encodeURIComponent(id)}?${params}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete command');
  }
};

export const useCreateProjectCommand = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: SlashCommandCreate) => createProjectCommand(projectId, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands', 'project', projectId] });
    },
  });
};

export const useUpdateProjectCommand = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; updates: SlashCommandUpdate }) =>
      updateProjectCommand(projectId, data),
    onSuccess: (updatedCommand) => {
      queryClient.invalidateQueries({ queryKey: ['commands', 'project', projectId] });
      queryClient.setQueryData(['commands', updatedCommand.id], updatedCommand);
    },
  });
};

export const useDeleteProjectCommand = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProjectCommand(projectId, id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['commands', 'project', projectId] });
      queryClient.removeQueries({ queryKey: ['commands', deletedId] });
    },
  });
};