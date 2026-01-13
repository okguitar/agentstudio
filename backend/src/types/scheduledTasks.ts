/**
 * Scheduled Tasks Types
 * 
 * Type definitions for scheduled task management.
 * Scheduled tasks allow agents to be triggered automatically
 * based on time intervals or cron expressions.
 */

/**
 * Schedule configuration for a task
 */
export interface TaskSchedule {
  /**
   * Type of schedule
   * - 'interval': Execute every N minutes
   * - 'cron': Execute based on cron expression
   * - 'once': Execute once at a specific time
   */
  type: 'interval' | 'cron' | 'once';

  /**
   * Interval in minutes (for 'interval' type)
   * e.g., 30 = every 30 minutes
   */
  intervalMinutes?: number;

  /**
   * Cron expression (for 'cron' type)
   * Examples: "0 9 * * *" (every day at 9:00 AM)
   */
  cronExpression?: string;

  /**
   * ISO 8601 timestamp for one-time execution (for 'once' type)
   * Examples: "2026-01-05T14:30:00.000Z"
   */
  executeAt?: string;
}

/**
 * Status of a scheduled task execution
 */
export type TaskRunStatus = 'running' | 'success' | 'error' | 'stopped';

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
  /** Unique task identifier */
  id: string;

  /** Human-readable task name */
  name: string;

  /** Optional task description */
  description?: string;

  /** Target agent ID to execute */
  agentId: string;

  /** Project path for agent execution context */
  projectPath: string;

  /** Schedule configuration */
  schedule: TaskSchedule;

  /** Message to send to the agent when triggered */
  triggerMessage: string;

  /** Whether the task is enabled */
  enabled: boolean;

  /** Model override configuration (optional) */
  modelOverride?: ModelOverride;

  /** ISO 8601 timestamp of last execution */
  lastRunAt?: string;

  /** Status of last execution */
  lastRunStatus?: TaskRunStatus;

  /** Error message from last execution (if failed) */
  lastRunError?: string;

  /** ISO 8601 timestamp of next scheduled execution */
  nextRunAt?: string;

  /** ISO 8601 timestamp of creation */
  createdAt: string;

  /** Task timeout in milliseconds (optional) */
  timeoutMs?: number;

  /** Maximum number of turns for agent execution (optional) */
  maxTurns?: number;


  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

/**
 * Task execution history record
 */
export interface TaskExecution {
  /** Unique execution identifier */
  id: string;

  /** Task ID that was executed */
  taskId: string;

  /** ISO 8601 timestamp of execution start */
  startedAt: string;

  /** ISO 8601 timestamp of execution completion */
  completedAt?: string;

  /** Execution status */
  status: TaskRunStatus;

  /** Error message (if failed) */
  error?: string;

  /** Full error stack trace (if failed) */
  errorStack?: string;

  /** Summary of agent response */
  responseSummary?: string;

  /** Session ID from agent execution */
  sessionId?: string;

  /** Full execution logs (Claude messages, tool calls, etc.) */
  logs?: ExecutionLogEntry[];

  /** Agent ID used for this execution (for "continue chat" functionality) */
  agentId?: string;

  /** Project path used for this execution (for "continue chat" functionality) */
  projectPath?: string;
}

/**
 * Log entry for task execution
 */
export interface ExecutionLogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  
  /** Log level */
  level: 'info' | 'debug' | 'warn' | 'error';
  
  /** Message type (e.g., 'assistant', 'tool_use', 'tool_result', 'system') */
  type: string;
  
  /** Log message content */
  message: string;
  
  /** Optional additional data */
  data?: Record<string, unknown>;
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
  description?: string;
  agentId?: string;
  projectPath?: string;
  schedule?: TaskSchedule;
  triggerMessage?: string;
  enabled?: boolean;
  modelOverride?: ModelOverride;
}

/**
 * Scheduler service configuration
 */
export interface SchedulerConfig {
  /** Maximum number of concurrent task executions */
  maxConcurrent: number;
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrent: 20,
};
