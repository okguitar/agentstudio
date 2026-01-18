/**
 * Scheduled Tasks Hooks
 * 
 * React Query hooks for scheduled task management.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../lib/config.js';
import { authFetch } from '../lib/authFetch';
import type {
  ScheduledTask,
  TaskExecution,
  CreateScheduledTaskRequest,
  UpdateScheduledTaskRequest,
  SchedulerStatus,
} from '../types/scheduledTasks';

// ============================================================================
// Query Keys
// ============================================================================

export const scheduledTasksKeys = {
  all: ['scheduled-tasks'] as const,
  lists: () => [...scheduledTasksKeys.all, 'list'] as const,
  list: () => [...scheduledTasksKeys.lists()] as const,
  details: () => [...scheduledTasksKeys.all, 'detail'] as const,
  detail: (id: string) => [...scheduledTasksKeys.details(), id] as const,
  history: (id: string) => [...scheduledTasksKeys.all, 'history', id] as const,
  status: () => [...scheduledTasksKeys.all, 'status'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all scheduled tasks
 */
export const useScheduledTasks = () => {
  return useQuery<ScheduledTask[]>({
    queryKey: scheduledTasksKeys.list(),
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled tasks');
      }
      return response.json();
    },
    refetchInterval: (query) => {
      // If any task is running, refresh every 3 seconds
      const data = query.state.data;
      const hasRunningTasks = data?.some((task) => task.lastRunStatus === 'running');
      return hasRunningTasks ? 3000 : false;
    },
  });
};

/**
 * Get a specific scheduled task
 */
export const useScheduledTask = (taskId: string) => {
  return useQuery<ScheduledTask>({
    queryKey: scheduledTasksKeys.detail(taskId),
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/${taskId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled task');
      }
      return response.json();
    },
    enabled: !!taskId,
  });
};

/**
 * Get task execution history
 */
export const useTaskExecutionHistory = (taskId: string, limit: number = 50) => {
  return useQuery<TaskExecution[]>({
    queryKey: scheduledTasksKeys.history(taskId),
    queryFn: async () => {
      const response = await authFetch(
        `${API_BASE}/scheduled-tasks/${taskId}/history?limit=${limit}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch task execution history');
      }
      return response.json();
    },
    enabled: !!taskId,
    refetchInterval: (query) => {
      // If any execution is running, refresh every 3 seconds
      const data = query.state.data;
      const hasRunningExecutions = data?.some((exec) => exec.status === 'running');
      return hasRunningExecutions ? 3000 : false;
    },
  });
};

/**
 * Get scheduler status
 */
export const useSchedulerStatus = () => {
  return useQuery<SchedulerStatus>({
    queryKey: scheduledTasksKeys.status(),
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch scheduler status');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new scheduled task
 */
export const useCreateScheduledTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduledTaskRequest): Promise<ScheduledTask> => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create scheduled task');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.status() });
    },
  });
};

/**
 * Update a scheduled task
 */
export const useUpdateScheduledTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateScheduledTaskRequest;
    }): Promise<ScheduledTask> => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update scheduled task');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.status() });
    },
  });
};

/**
 * Delete a scheduled task
 */
export const useDeleteScheduledTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete scheduled task');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.status() });
    },
  });
};

/**
 * Toggle task enabled state
 */
export const useToggleScheduledTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string): Promise<ScheduledTask> => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/${taskId}/toggle`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to toggle scheduled task');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.status() });
    },
  });
};

/**
 * Manually run a scheduled task
 */
export const useRunScheduledTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string): Promise<{ success: boolean; message: string }> => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/${taskId}/run`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to run scheduled task');
      }

      return response.json();
    },
    onSuccess: (_, taskId) => {
      // Refetch task to get updated status
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.history(taskId) });
    },
  });
};

/**
 * Stop a running execution
 */
export const useStopExecution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (executionId: string): Promise<{ success: boolean; message: string }> => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/executions/${executionId}/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to stop execution');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refetch all tasks and their histories
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.all });
    },
  });
};

/**
 * Get running executions
 */
export const useRunningExecutions = () => {
  return useQuery<{ executions: Array<{ executionId: string; taskId: string; startedAt: string }> }>({
    queryKey: [...scheduledTasksKeys.all, 'running'],
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/running`);
      if (!response.ok) {
        throw new Error('Failed to fetch running executions');
      }
      return response.json();
    },
    refetchInterval: 3000, // Refresh every 3 seconds
  });
};

/**
 * Enable the scheduler
 */
export const useEnableScheduler = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string; status: SchedulerStatus }> => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/scheduler/enable`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to enable scheduler');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.status() });
    },
  });
};

/**
 * Disable the scheduler
 */
export const useDisableScheduler = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string; status: SchedulerStatus }> => {
      const response = await authFetch(`${API_BASE}/scheduled-tasks/scheduler/disable`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to disable scheduler');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.status() });
    },
  });
};

// ============================================================================
// Task Executor Monitoring Hooks
// ============================================================================

/**
 * Task executor statistics
 */
export interface TaskExecutorStats {
  mode: 'builtin' | 'bullmq';
  runningTasks: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTimeMs: number;
  tasks: Array<{
    id: string;
    type: string;
    status: string;
    agentId: string;
    startedAt: string;
    elapsedMs: number;
  }>;
}

/**
 * Task executor health status
 */
export interface TaskExecutorHealth {
  healthy: boolean;
  mode: 'builtin' | 'bullmq';
  runningTasks: number;
  queuedTasks: number;
  timestamp: string;
}

export const taskExecutorKeys = {
  all: ['task-executor'] as const,
  stats: () => [...taskExecutorKeys.all, 'stats'] as const,
  health: () => [...taskExecutorKeys.all, 'health'] as const,
};

/**
 * Get task executor statistics
 */
export const useTaskExecutorStats = () => {
  return useQuery<TaskExecutorStats>({
    queryKey: taskExecutorKeys.stats(),
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/task-executor/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch task executor stats');
      }
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
};

/**
 * Get task executor health
 */
export const useTaskExecutorHealth = () => {
  return useQuery<TaskExecutorHealth>({
    queryKey: taskExecutorKeys.health(),
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/task-executor/health`);
      if (!response.ok) {
        throw new Error('Failed to fetch task executor health');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
};

/**
 * Task executor configuration
 */
export interface TaskExecutorConfig {
  maxConcurrent: number;
  defaultTimeoutMs: number;
  maxMemoryMb?: number;
}

/**
 * Get task executor configuration
 */
export const useTaskExecutorConfig = () => {
  return useQuery<TaskExecutorConfig>({
    queryKey: [...taskExecutorKeys.all, 'config'] as const,
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/task-executor/config`);
      if (!response.ok) {
        throw new Error('Failed to fetch task executor config');
      }
      return response.json();
    },
  });
};

/**
 * Update task executor configuration
 */
export const useUpdateTaskExecutorConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<TaskExecutorConfig>): Promise<{ success: boolean; config: TaskExecutorConfig }> => {
      const response = await authFetch(`${API_BASE}/task-executor/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update executor config');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskExecutorKeys.all });
    },
  });
};
