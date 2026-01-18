/**
 * Scheduler Service
 * 
 * Manages scheduled task execution using cron-like scheduling.
 * Supports both interval-based and cron expression-based scheduling.
 * 
 * Features:
 * - Concurrent task execution with configurable limit
 * - Automatic task recovery on startup
 * - Execution history tracking
 * - Integration with Agent execution
 */

import cron, { ScheduledTask as CronTask } from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import {
  ScheduledTask,
  TaskExecution,
  ExecutionLogEntry,
  SchedulerConfig,
  DEFAULT_SCHEDULER_CONFIG,
} from '../types/scheduledTasks.js';
import {
  loadScheduledTasks,
  getScheduledTask,
  updateTaskRunStatus,
  updateTaskNextRunAt,
  addTaskExecution,
  updateTaskExecution,
} from './scheduledTaskStorage.js';
import { AgentStorage } from './agentStorage.js';
import { getTaskExecutor } from './taskExecutor/index.js';

// ============================================================================
// Types
// ============================================================================

interface ActiveJob {
  task: ScheduledTask;
  cronJob?: CronTask;
  timeout?: NodeJS.Timeout; // For one-time execution
}

// Scheduler enabled state (independent from initialization)
let schedulerEnabled = false;

// ============================================================================
// Service State
// ============================================================================

let isInitialized = false;
let config: SchedulerConfig = { ...DEFAULT_SCHEDULER_CONFIG };
const activeJobs: Map<string, ActiveJob> = new Map();
let runningTaskCount = 0;
const agentStorage = new AgentStorage();

// Track running executions for stop functionality
interface RunningExecution {
  taskId: string;
  executionId: string;
  abortController: AbortController;
  startedAt: string;
}
const runningExecutions: Map<string, RunningExecution> = new Map();

// ============================================================================
// Orphaned Task Cleanup
// ============================================================================

/**
 * Clean up orphaned "running" tasks from previous server runs
 * When the server restarts, any tasks that were "running" are now orphaned
 * since the actual execution is lost. Mark them as "error" with a clear message.
 */
function cleanupOrphanedRunningTasks(): void {
  const serverStartTime = new Date().toISOString();
  const tasks = loadScheduledTasks();
  let cleanedCount = 0;

  // Clean up task lastRunStatus
  for (const task of tasks) {
    if (task.lastRunStatus === 'running') {
      console.info(`[Scheduler] Cleaning up orphaned running task: ${task.id} (${task.name})`);
      updateTaskRunStatus(task.id, 'error', 'Server restarted while task was running');
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.info(`[Scheduler] Cleaned up ${cleanedCount} orphaned running tasks`);
  }

  // Also clean up orphaned execution records
  try {
    const { cleanupOrphanedExecutions } = require('./scheduledTaskStorage');
    const executionsCleanedCount = cleanupOrphanedExecutions(serverStartTime);
    if (executionsCleanedCount > 0) {
      console.info(`[Scheduler] Cleaned up ${executionsCleanedCount} orphaned execution records`);
    }
  } catch (error) {
    console.error('[Scheduler] Error cleaning orphaned execution records:', error);
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the scheduler service
 * Loads all enabled tasks and schedules them
 */
export function initializeScheduler(customConfig?: Partial<SchedulerConfig> & { enabled?: boolean }): void {
  if (isInitialized) {
    console.warn('[Scheduler] Already initialized');
    return;
  }

  if (customConfig) {
    config = { ...config, ...customConfig };
  }

  console.info(`[Scheduler] Initializing with config: maxConcurrent=${config.maxConcurrent}`);

  // Clean up orphaned "running" tasks from previous server runs
  cleanupOrphanedRunningTasks();

  // Load and schedule all enabled tasks
  const tasks = loadScheduledTasks();
  const enabledTasks = tasks.filter(t => t.enabled);

  console.info(`[Scheduler] Found ${enabledTasks.length} enabled tasks out of ${tasks.length} total`);

  // Set initial enabled state based on config
  const shouldEnable = customConfig?.enabled !== undefined ? customConfig.enabled : true;

  if (shouldEnable) {
    for (const task of enabledTasks) {
      scheduleTask(task);
    }
    schedulerEnabled = true;
    console.info('[Scheduler] Initialization complete - scheduler ENABLED');
  } else {
    schedulerEnabled = false;
    console.info('[Scheduler] Initialization complete - scheduler DISABLED (can be enabled via API)');
  }

  isInitialized = true;
}

/**
 * Shutdown the scheduler service
 * Stops all scheduled jobs
 */
export function shutdownScheduler(): void {
  console.info('[Scheduler] Shutting down...');

  for (const [taskId, activeJob] of activeJobs) {
    if (activeJob.cronJob) {
      activeJob.cronJob.stop();
    }
    if (activeJob.timeout) {
      clearTimeout(activeJob.timeout);
    }
    console.debug(`[Scheduler] Stopped job for task: ${taskId}`);
  }

  activeJobs.clear();
  isInitialized = false;
  schedulerEnabled = false;

  console.info('[Scheduler] Shutdown complete');
}

/**
 * Enable the scheduler (start executing scheduled tasks)
 */
export function enableScheduler(): void {
  if (!isInitialized) {
    console.warn('[Scheduler] Cannot enable: scheduler not initialized');
    return;
  }

  if (schedulerEnabled) {
    console.warn('[Scheduler] Already enabled');
    return;
  }

  console.info('[Scheduler] Enabling scheduler...');

  // Re-schedule all enabled tasks
  const tasks = loadScheduledTasks();
  const enabledTasks = tasks.filter(t => t.enabled);

  for (const task of enabledTasks) {
    if (!activeJobs.has(task.id)) {
      scheduleTask(task);
    }
  }

  schedulerEnabled = true;
  console.info('[Scheduler] Enabled');
}

/**
 * Disable the scheduler (stop executing scheduled tasks)
 */
export function disableScheduler(): void {
  if (!schedulerEnabled) {
    console.warn('[Scheduler] Already disabled');
    return;
  }

  console.info('[Scheduler] Disabling scheduler...');

  // Stop all scheduled jobs but keep them in memory
  for (const [taskId, activeJob] of activeJobs) {
    if (activeJob.cronJob) {
      activeJob.cronJob.stop();
    }
    if (activeJob.timeout) {
      clearTimeout(activeJob.timeout);
    }
    console.debug(`[Scheduler] Stopped job for task: ${taskId}`);
  }

  activeJobs.clear();
  schedulerEnabled = false;
  console.info('[Scheduler] Disabled');
}

// ============================================================================
// Task Scheduling
// ============================================================================

/**
 * Schedule a task for execution
 */
export function scheduleTask(task: ScheduledTask): boolean {
  // Stop existing job if any
  if (activeJobs.has(task.id)) {
    unscheduleTask(task.id);
  }

  if (!task.enabled) {
    console.debug(`[Scheduler] Task ${task.id} is disabled, not scheduling`);
    return false;
  }

  try {
    // Handle one-time execution
    if (task.schedule.type === 'once' && task.schedule.executeAt) {
      return scheduleOnceTask(task);
    }

    const cronExpression = getCronExpression(task);
    
    if (!cronExpression || !cron.validate(cronExpression)) {
      console.error(`[Scheduler] Invalid cron expression for task ${task.id}: ${cronExpression}`);
      return false;
    }

    const cronJob = cron.schedule(cronExpression, () => {
      executeTask(task.id).catch(error => {
        console.error(`[Scheduler] Error executing task ${task.id}:`, error);
      });
    });

    activeJobs.set(task.id, { task, cronJob });

    // Calculate and update next run time
    const nextRunAt = getNextRunTime(cronExpression);
    updateTaskNextRunAt(task.id, nextRunAt);

    console.info(`[Scheduler] Scheduled task ${task.id} (${task.name}) with cron: ${cronExpression}`);
    return true;
  } catch (error) {
    console.error(`[Scheduler] Failed to schedule task ${task.id}:`, error);
    return false;
  }
}

/**
 * Schedule a one-time task execution
 */
function scheduleOnceTask(task: ScheduledTask): boolean {
  const executeAt = task.schedule.executeAt;
  if (!executeAt) {
    console.error(`[Scheduler] No executeAt time for once task ${task.id}`);
    return false;
  }

  const executeTime = new Date(executeAt).getTime();
  const now = Date.now();
  const delay = executeTime - now;

  if (delay <= 0) {
    console.warn(`[Scheduler] Task ${task.id} executeAt time is in the past, skipping`);
    // Disable the task since it's already past
    import('./scheduledTaskStorage.js').then(storage => {
      storage.updateScheduledTask(task.id, { enabled: false });
    });
    return false;
  }

  // Maximum delay for setTimeout is ~24.8 days (2^31 - 1 ms)
  const MAX_DELAY = 2147483647;
  if (delay > MAX_DELAY) {
    // Schedule a check for later
    const checkDelay = MAX_DELAY;
    console.info(`[Scheduler] Task ${task.id} executeAt is too far in future, will re-check later`);
    
    const timeout = setTimeout(() => {
      // Re-schedule when timer fires
      const currentTask = getScheduledTask(task.id);
      if (currentTask && currentTask.enabled) {
        scheduleOnceTask(currentTask);
      }
    }, checkDelay);

    activeJobs.set(task.id, { task, timeout });
    updateTaskNextRunAt(task.id, executeAt);
    return true;
  }

  // Schedule the execution
  const timeout = setTimeout(async () => {
    try {
      await executeTask(task.id);
    } catch (error) {
      console.error(`[Scheduler] Error executing one-time task ${task.id}:`, error);
    }
    
    // Disable the task after execution
    import('./scheduledTaskStorage.js').then(storage => {
      storage.updateScheduledTask(task.id, { enabled: false });
      console.info(`[Scheduler] One-time task ${task.id} executed and disabled`);
    });
    
    // Remove from active jobs
    activeJobs.delete(task.id);
  }, delay);

  activeJobs.set(task.id, { task, timeout });
  updateTaskNextRunAt(task.id, executeAt);

  const delayMinutes = Math.round(delay / 60000);
  console.info(`[Scheduler] Scheduled one-time task ${task.id} (${task.name}) to execute at ${executeAt} (in ${delayMinutes} minutes)`);
  return true;
}

/**
 * Unschedule a task
 */
export function unscheduleTask(taskId: string): void {
  const activeJob = activeJobs.get(taskId);
  if (activeJob) {
    if (activeJob.cronJob) {
      activeJob.cronJob.stop();
    }
    if (activeJob.timeout) {
      clearTimeout(activeJob.timeout);
    }
    activeJobs.delete(taskId);
    updateTaskNextRunAt(taskId, undefined);
    console.info(`[Scheduler] Unscheduled task: ${taskId}`);
  }
}

/**
 * Reschedule a task (after update)
 */
export function rescheduleTask(taskId: string): boolean {
  const task = getScheduledTask(taskId);
  if (!task) {
    console.warn(`[Scheduler] Task not found for reschedule: ${taskId}`);
    return false;
  }

  return scheduleTask(task);
}

// ============================================================================
// Task Execution
// ============================================================================

/**
 * Execute a scheduled task
 *
 * NOTE: This function now submits the task to the unified task executor
 * instead of executing it directly in the main process.
 */
export async function executeTask(taskId: string): Promise<void> {
  const task = getScheduledTask(taskId);
  if (!task) {
    console.error(`[Scheduler] Task not found: ${taskId}`);
    return;
  }

  // Check concurrent limit
  if (runningTaskCount >= config.maxConcurrent) {
    console.warn(`[Scheduler] Concurrent limit reached (${config.maxConcurrent}), skipping task ${taskId}`);
    return;
  }

  // Check if task is already running (prevent double execution)
  if (task.lastRunStatus === 'running') {
    console.warn(`[Scheduler] Task ${taskId} is already running, skipping`);
    return;
  }

  const executionId = `exec_${uuidv4().slice(0, 8)}`;
  const startedAt = new Date().toISOString();

  // Create execution record
  const execution: TaskExecution = {
    id: executionId,
    taskId,
    startedAt,
    status: 'running',
    agentId: task.agentId,
    projectPath: task.projectPath,
  };

  addTaskExecution(execution);
  updateTaskRunStatus(taskId, 'running');
  runningTaskCount++;

  // Track running executions (for stop functionality)
  runningExecutions.set(executionId, {
    taskId,
    executionId,
    abortController: new AbortController(), // Not used by executor but kept for compatibility
    startedAt,
  });

  console.info(`[Scheduler] Submitting task ${taskId} (${task.name}) to executor, execution: ${executionId}`);

  try {
    // Get task executor
    const executor = getTaskExecutor();

    // Submit task to executor (runs in worker thread, not main process)
    await executor.submitTask({
      id: executionId, // Use executionId as the task identifier for executor
      type: 'scheduled',
      agentId: task.agentId,
      projectPath: task.projectPath,
      message: task.triggerMessage,
      timeoutMs: task.timeoutMs || 300000,
      maxTurns: task.maxTurns,
      modelId: task.modelOverride?.modelId,
      claudeVersionId: task.modelOverride?.versionId,
      permissionMode: 'bypassPermissions',
      createdAt: startedAt,
      scheduledFor: task.schedule.type === 'once' ? task.schedule.executeAt : undefined,
      scheduledTaskId: taskId, // Original scheduled task ID for status updates
    });

    console.info(`[Scheduler] Task ${taskId} submitted to executor successfully`);
  } catch (executorError) {
    const errorMessage = executorError instanceof Error ? executorError.message : String(executorError);

    // Update execution record as failed
    updateTaskExecution(taskId, executionId, {
      status: 'error',
      completedAt: new Date().toISOString(),
      error: `Failed to submit to executor: ${errorMessage}`,
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'system',
        message: `Executor submission failed: ${errorMessage}`,
      }],
    });

    updateTaskRunStatus(taskId, 'error', errorMessage);
    runningTaskCount--;
    runningExecutions.delete(executionId);

    console.error(`[Scheduler] Failed to submit task ${taskId} to executor:`, executorError);
  }
}

/**
 * Stop a running task execution
 * @param executionId - The execution ID to stop
 * @returns true if stopped successfully, false if not found or already completed
 */
export function stopExecution(executionId: string): { success: boolean; message: string } {
  const execution = runningExecutions.get(executionId);
  
  if (!execution) {
    return { success: false, message: 'Execution not found or already completed' };
  }

  console.info(`[Scheduler] Stopping execution: ${executionId} (task: ${execution.taskId})`);
  
  // Abort the execution
  execution.abortController.abort();
  
  // Update execution status
  updateTaskExecution(execution.taskId, executionId, {
    status: 'stopped',
    completedAt: new Date().toISOString(),
    error: 'Execution stopped by user',
    logs: [{
      timestamp: new Date().toISOString(),
      level: 'warn',
      type: 'system',
      message: 'Execution stopped by user',
    }],
  });

  // Update task status
  updateTaskRunStatus(execution.taskId, 'stopped', 'Stopped by user');
  
  // Remove from running executions
  runningExecutions.delete(executionId);
  runningTaskCount--;

  console.info(`[Scheduler] Execution ${executionId} stopped successfully`);
  
  return { success: true, message: 'Execution stopped successfully' };
}

/**
 * Get list of currently running executions
 */
export function getRunningExecutions(): Array<{
  executionId: string;
  taskId: string;
  startedAt: string;
}> {
  return Array.from(runningExecutions.values()).map(exec => ({
    executionId: exec.executionId,
    taskId: exec.taskId,
    startedAt: exec.startedAt,
  }));
}

/**
 * Called by task executor when a scheduled task execution completes
 * Updates internal tracking counters and cleans up running execution records
 *
 * @param executionId - The execution ID that completed (format: exec_XXXXXXXX)
 */
export function onScheduledTaskComplete(executionId: string): void {
  // Find the running execution by executionId
  const execution = runningExecutions.get(executionId);

  if (execution) {
    runningExecutions.delete(executionId);
    runningTaskCount--;

    console.debug(`[Scheduler] Task execution completed: ${executionId} (task: ${execution.taskId}), running count: ${runningTaskCount}`);

    // Update next run time for recurring tasks
    const task = getScheduledTask(execution.taskId);
    if (task && task.schedule.type !== 'once') {
      const cronExpression = getCronExpression(task);
      if (cronExpression) {
        const nextRunAt = getNextRunTime(cronExpression);
        updateTaskNextRunAt(execution.taskId, nextRunAt);
      }
    }
  } else {
    console.warn(`[Scheduler] onScheduledTaskComplete called for unknown execution: ${executionId}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert task schedule to cron expression
 */
function getCronExpression(task: ScheduledTask): string | null {
  const { schedule } = task;

  if (schedule.type === 'cron' && schedule.cronExpression) {
    return schedule.cronExpression;
  }

  if (schedule.type === 'interval' && schedule.intervalMinutes) {
    // Convert interval to cron expression
    // e.g., 30 minutes -> "*/30 * * * *"
    if (schedule.intervalMinutes < 60) {
      return `*/${schedule.intervalMinutes} * * * *`;
    } else {
      // For hourly or longer intervals
      const hours = Math.floor(schedule.intervalMinutes / 60);
      return `0 */${hours} * * *`;
    }
  }

  return null;
}

/**
 * Calculate next run time from cron expression
 */
function getNextRunTime(cronExpression: string): string | undefined {
  try {
    // node-cron doesn't have a built-in method to get next run time
    // We'll use a simple calculation based on the cron expression
    const now = new Date();
    const parts = cronExpression.split(' ');
    
    // For simple cases, calculate approximate next run
    if (parts[0].startsWith('*/')) {
      // Interval in minutes
      const interval = parseInt(parts[0].slice(2));
      const currentMinutes = now.getMinutes();
      const nextMinutes = Math.ceil(currentMinutes / interval) * interval;
      const next = new Date(now);
      
      if (nextMinutes >= 60) {
        next.setHours(next.getHours() + 1);
        next.setMinutes(nextMinutes - 60);
      } else if (nextMinutes === currentMinutes) {
        next.setMinutes(currentMinutes + interval);
      } else {
        next.setMinutes(nextMinutes);
      }
      next.setSeconds(0);
      next.setMilliseconds(0);
      
      return next.toISOString();
    }
    
    // For other patterns, return undefined (will be calculated on next check)
    return undefined;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Status Functions
// ============================================================================

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  isInitialized: boolean;
  enabled: boolean;
  config: SchedulerConfig;
  activeTaskCount: number;
  runningTaskCount: number;
} {
  return {
    isInitialized,
    enabled: schedulerEnabled,
    config,
    activeTaskCount: activeJobs.size,
    runningTaskCount,
  };
}

/**
 * Get list of active task IDs
 */
export function getActiveTaskIds(): string[] {
  return Array.from(activeJobs.keys());
}
