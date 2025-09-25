import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClaudeVersion, ClaudeVersionCreate, ClaudeVersionUpdate, ClaudeVersionResponse } from '../../../shared/types/claude-versions';

// 获取所有Claude版本
export const useClaudeVersions = () => {
  return useQuery<ClaudeVersionResponse>({
    queryKey: ['claude-versions'],
    queryFn: async () => {
      const response = await fetch('/api/settings/claude-versions');
      if (!response.ok) {
        throw new Error('Failed to fetch Claude versions');
      }
      return response.json();
    },
  });
};

// 创建新版本
export const useCreateClaudeVersion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ClaudeVersionCreate): Promise<ClaudeVersion> => {
      const response = await fetch('/api/settings/claude-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create Claude version');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-versions'] });
    },
  });
};

// 更新版本
export const useUpdateClaudeVersion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClaudeVersionUpdate }): Promise<ClaudeVersion> => {
      const response = await fetch(`/api/settings/claude-versions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update Claude version');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-versions'] });
    },
  });
};

// 删除版本
export const useDeleteClaudeVersion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/settings/claude-versions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete Claude version');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-versions'] });
    },
  });
};

// 设置默认版本
export const useSetDefaultClaudeVersion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/settings/claude-versions/${id}/set-default`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set default Claude version');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-versions'] });
    },
  });
};
