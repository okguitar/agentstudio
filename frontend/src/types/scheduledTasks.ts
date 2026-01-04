/**
 * Scheduled Tasks Types (Frontend)
 * 
 * Type definitions for scheduled task management.
 */

/**
 * Schedule configuration for a task
 */
export interface TaskSchedule {
  type: 'interval' | 'cron' | 'once';
  intervalMinutes?: number;
  cronExpression?: string;
  /** ISO 8601 timestamp for one-time execution (for 'once' type) */
  executeAt?: string;
}

/**
 * Status of a scheduled task execution
 */
export type TaskRunStatus = 'running' | 'success' | 'error';

/**
 * Model override configuration for scheduled tasks
 */
export interface ModelOverride {
  /** Claude version/supplier ID to use (optional, uses agent default if not specified) */
  versionId?: string;
  /** Model ID to use (e.g., 'sonnet', 'opus') */
  modelId?: string;
}

/**
 * Scheduled task configuration
 */
export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  agentId: string;
  projectPath: string;
  schedule: TaskSchedule;
  triggerMessage: string;
  enabled: boolean;
  /** Model override configuration (optional) */
  modelOverride?: ModelOverride;
  lastRunAt?: string;
  lastRunStatus?: TaskRunStatus;
  lastRunError?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Log entry for task execution
 */
export interface ExecutionLogEntry {
  timestamp: string;
  level: 'info' | 'debug' | 'warn' | 'error';
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Task execution history record
 */
export interface TaskExecution {
  id: string;
  taskId: string;
  startedAt: string;
  completedAt?: string;
  status: TaskRunStatus;
  error?: string;
  errorStack?: string;
  responseSummary?: string;
  sessionId?: string;
  logs?: ExecutionLogEntry[];
  /** Agent ID used for this execution (for "continue chat" functionality) */
  agentId?: string;
  /** Project path used for this execution (for "continue chat" functionality) */
  projectPath?: string;
}

/**
 * Request body for creating a new scheduled task
 */
export interface CreateScheduledTaskRequest {
  name: string;
  description?: string;
  agentId: string;
  projectPath: string;
  schedule: TaskSchedule;
  triggerMessage: string;
  enabled?: boolean;
  modelOverride?: ModelOverride;
}

/**
 * Request body for updating a scheduled task
 */
export interface UpdateScheduledTaskRequest {
  name?: string;
  description?: string | null;
  agentId?: string;
  projectPath?: string;
  schedule?: TaskSchedule;
  triggerMessage?: string;
  enabled?: boolean;
  modelOverride?: ModelOverride;
}

/**
 * Scheduler status response
 */
export interface SchedulerStatus {
  isInitialized: boolean;
  /** Whether the scheduler is enabled (not disabled by ENABLE_SCHEDULER=false) */
  enabled: boolean;
  config: {
    maxConcurrent: number;
  };
  activeTaskCount: number;
  runningTaskCount: number;
}

/**
 * Common cron presets for UI
 */
export const CRON_PRESETS = [
  { label: '每 5 分钟', value: '*/5 * * * *' },
  { label: '每 15 分钟', value: '*/15 * * * *' },
  { label: '每 30 分钟', value: '*/30 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 18:00', value: '0 18 * * *' },
  { label: '每周一 9:00', value: '0 9 * * 1' },
  { label: '每月 1 日 9:00', value: '0 9 1 * *' },
] as const;
