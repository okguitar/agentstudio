import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../lib/config';

/**
 * A2A Configuration Interface
 *
 * Represents project-level A2A configuration
 */
export interface A2AConfig {
  allowedAgents: AllowedAgent[];
  taskTimeout: number;
  maxConcurrentTasks: number;
}

/**
 * Allowed External Agent Interface
 */
export interface AllowedAgent {
  name: string;
  url: string;
  apiKey: string;
  description?: string;
  enabled: boolean;
}

/**
 * Fetch A2A configuration for a project
 *
 * @param projectId - Project identifier
 * @returns Promise resolving to A2AConfig
 */
const fetchA2AConfig = async (projectId: string): Promise<A2AConfig> => {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/a2a-config`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Return default config if not found
      return {
        allowedAgents: [],
        taskTimeout: 300000, // 5 minutes
        maxConcurrentTasks: 5
      };
    }

    throw new Error(`Failed to fetch A2A config: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Update A2A configuration for a project
 *
 * @param projectId - Project identifier
 * @param config - New A2A configuration
 * @returns Promise resolving to success response
 */
const updateA2AConfig = async (
  projectId: string,
  config: A2AConfig
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/a2a-config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update A2A config');
  }

  return response.json();
};

/**
 * React Query hook for fetching A2A configuration
 *
 * @param projectId - Project identifier
 * @returns Query result with A2AConfig data
 */
export const useA2AConfig = (projectId: string) => {
  return useQuery({
    queryKey: ['a2aConfig', projectId],
    queryFn: () => fetchA2AConfig(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
};

/**
 * React Query mutation hook for updating A2A configuration
 *
 * @returns Mutation function and state
 */
export const useUpdateA2AConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, config }: { projectId: string; config: A2AConfig }) =>
      updateA2AConfig(projectId, config),
    onSuccess: (_, variables) => {
      // Invalidate and refetch A2A config query
      queryClient.invalidateQueries({ queryKey: ['a2aConfig', variables.projectId] });
    }
  });
};

/**
 * React Query mutation hook for adding an allowed agent
 *
 * @returns Mutation function to add agent to allowlist
 */
export const useAddAllowedAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      agent
    }: {
      projectId: string;
      agent: AllowedAgent;
    }) => {
      // Fetch current config
      const currentConfig = await fetchA2AConfig(projectId);

      // Add new agent
      const updatedConfig: A2AConfig = {
        ...currentConfig,
        allowedAgents: [...currentConfig.allowedAgents, agent]
      };

      // Update config
      return updateA2AConfig(projectId, updatedConfig);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['a2aConfig', variables.projectId] });
    }
  });
};

/**
 * React Query mutation hook for removing an allowed agent
 *
 * @returns Mutation function to remove agent from allowlist
 */
export const useRemoveAllowedAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      agentUrl
    }: {
      projectId: string;
      agentUrl: string;
    }) => {
      // Fetch current config
      const currentConfig = await fetchA2AConfig(projectId);

      // Remove agent by URL
      const updatedConfig: A2AConfig = {
        ...currentConfig,
        allowedAgents: currentConfig.allowedAgents.filter(
          (agent) => agent.url !== agentUrl
        )
      };

      // Update config
      return updateA2AConfig(projectId, updatedConfig);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['a2aConfig', variables.projectId] });
    }
  });
};

/**
 * React Query mutation hook for toggling agent enabled state
 *
 * @returns Mutation function to enable/disable agent
 */
export const useToggleAllowedAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      agentUrl,
      enabled
    }: {
      projectId: string;
      agentUrl: string;
      enabled: boolean;
    }) => {
      // Fetch current config
      const currentConfig = await fetchA2AConfig(projectId);

      // Update agent enabled state
      const updatedConfig: A2AConfig = {
        ...currentConfig,
        allowedAgents: currentConfig.allowedAgents.map((agent) =>
          agent.url === agentUrl ? { ...agent, enabled } : agent
        )
      };

      // Update config
      return updateA2AConfig(projectId, updatedConfig);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['a2aConfig', variables.projectId] });
    }
  });
};

export default useA2AConfig;
