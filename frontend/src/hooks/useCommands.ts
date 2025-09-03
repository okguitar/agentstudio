import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SlashCommand, SlashCommandCreate, SlashCommandUpdate, SlashCommandFilter } from '../types/commands';

const API_BASE = 'http://localhost:3002/api';

// API functions
const fetchCommands = async (filter: SlashCommandFilter = {}): Promise<SlashCommand[]> => {
  const params = new URLSearchParams();
  if (filter.scope && filter.scope !== 'all') params.append('scope', filter.scope);
  if (filter.namespace) params.append('namespace', filter.namespace);
  if (filter.search) params.append('search', filter.search);

  const response = await fetch(`${API_BASE}/commands?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch commands');
  }
  return response.json();
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