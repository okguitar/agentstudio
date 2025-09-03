import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Subagent, SubagentCreate, SubagentUpdate, SubagentFilter } from '../types/subagents';

const API_BASE = 'http://localhost:3002/api';

// API functions
const fetchSubagents = async (filter: SubagentFilter = {}): Promise<Subagent[]> => {
  const params = new URLSearchParams();
  if (filter.search) params.append('search', filter.search);

  const response = await fetch(`${API_BASE}/subagents?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch subagents');
  }
  return response.json();
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
