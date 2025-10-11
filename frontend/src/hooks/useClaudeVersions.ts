import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClaudeVersion, ClaudeVersionCreate, ClaudeVersionUpdate, ClaudeVersionResponse } from '@agentstudio/shared/types/claude-versions';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';
import { useBackendServices } from './useBackendServices';
import { getClaudeSetupStatus, setClaudeSetupCompleted } from '../utils/onboardingStorage';
import { useEffect, useRef } from 'react';

// 获取所有Claude版本
export const useClaudeVersions = (options?: { forSetupWizard?: boolean }) => {
  const { currentServiceId } = useBackendServices();
  const hasMarkedRef = useRef(false);
  const forSetupWizard = options?.forSetupWizard ?? false;

  // Only apply setup check restriction when explicitly used for setup wizard
  // By default, always allow querying (for chat interface, settings page, etc.)
  const shouldQuery = forSetupWizard
    ? currentServiceId ? !getClaudeSetupStatus(currentServiceId) : false
    : true;

  const query = useQuery<ClaudeVersionResponse>({
    queryKey: ['claude-versions', currentServiceId], // Include serviceId in queryKey
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/settings/claude-versions`);
      if (!response.ok) {
        throw new Error('Failed to fetch Claude versions');
      }
      return response.json();
    },
    enabled: shouldQuery, // By default always query, only restrict for setup wizard
    retry: false, // Disable auto retry
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false, // Disable refetch on reconnect
    staleTime: forSetupWizard ? Infinity : 30000, // Setup wizard: never expire; Others: 30s cache
  });

  // Mark as completed after query finishes (success or error)
  // Only mark when in setup wizard mode
  useEffect(() => {
    if (!forSetupWizard || !currentServiceId || hasMarkedRef.current || shouldQuery === false) return;

    if (query.isError && !query.isLoading) {
      // API failed, mark as skipped
      setClaudeSetupCompleted(currentServiceId, true);
      hasMarkedRef.current = true;
    }
  }, [query.isError, query.isLoading, currentServiceId, shouldQuery, forSetupWizard]);

  return query;
};

// 创建新版本
export const useCreateClaudeVersion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ClaudeVersionCreate): Promise<ClaudeVersion> => {
      const response = await authFetch(`${API_BASE}/settings/claude-versions`, {
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
      const response = await authFetch(`${API_BASE}/settings/claude-versions/${id}`, {
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
      const response = await authFetch(`${API_BASE}/settings/claude-versions/${id}`, {
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
      const response = await authFetch(`${API_BASE}/settings/claude-versions/${id}/set-default`, {
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
