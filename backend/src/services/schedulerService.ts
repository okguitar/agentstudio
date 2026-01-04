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
import { query, Options as ClaudeOptions } from '@anthropic-ai/claude-agent-sdk';
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

  // Create execution record (include agentId and projectPath for "continue chat" functionality)
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

  console.info(`[Scheduler] Executing task ${taskId} (${task.name}), execution: ${executionId}`);

  try {
    // Execute the agent
    const result = await executeAgentTask(task);

    // Update execution record with logs
    updateTaskExecution(taskId, executionId, {
      status: 'success',
      completedAt: new Date().toISOString(),
      responseSummary: result.summary,
      sessionId: result.sessionId,
      logs: result.logs,
    });

    updateTaskRunStatus(taskId, 'success');
    console.info(`[Scheduler] Task ${taskId} completed successfully`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Try to get logs from the error context if available
    const errorLogs: ExecutionLogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'system',
        message: `Execution failed: ${errorMessage}`,
        data: { stack: errorStack },
      }
    ];

    updateTaskExecution(taskId, executionId, {
      status: 'error',
      completedAt: new Date().toISOString(),
      error: errorMessage,
      errorStack: errorStack,
      logs: errorLogs,
    });

    updateTaskRunStatus(taskId, 'error', errorMessage);
    console.error(`[Scheduler] Task ${taskId} failed:`, error);

  } finally {
    runningTaskCount--;

    // Update next run time (only for recurring tasks)
    if (task.schedule.type !== 'once') {
      const cronExpression = getCronExpression(task);
      if (cronExpression) {
        const nextRunAt = getNextRunTime(cronExpression);
        updateTaskNextRunAt(taskId, nextRunAt);
      }
    }
  }
}

/**
 * Execute agent task using Claude SDK
 */
async function executeAgentTask(task: ScheduledTask): Promise<{
  summary: string;
  sessionId?: string;
  logs: ExecutionLogEntry[];
}> {
  const logs: ExecutionLogEntry[] = [];
  
  const addLog = (level: ExecutionLogEntry['level'], type: string, message: string, data?: Record<string, unknown>) => {
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      type,
      message,
      data,
    });
  };

  // Get agent configuration
  const agent = agentStorage.getAgent(task.agentId);
  if (!agent) {
    addLog('error', 'system', `Agent not found: ${task.agentId}`);
    throw new Error(`Agent not found: ${task.agentId}`);
  }

  addLog('info', 'system', `Using agent: ${agent.name} (${agent.id})`);
  addLog('info', 'system', `Working directory: ${task.projectPath}`);
  addLog('info', 'system', `Trigger message: ${task.triggerMessage}`);

  // Determine the model to use (override or agent default)
  let modelToUse = agent.model;
  if (task.modelOverride?.modelId) {
    modelToUse = task.modelOverride.modelId;
    addLog('info', 'system', `Model override applied: ${modelToUse} (from task config)`);
    if (task.modelOverride.versionId) {
      addLog('info', 'system', `Using supplier/version: ${task.modelOverride.versionId}`);
    }
  }

  // Build query options
  // NOTE: Scheduled tasks run unattended, so we MUST use bypassPermissions mode
  // to avoid waiting for user confirmation that will never come
  const queryOptions: ClaudeOptions = {
    cwd: task.projectPath,
    permissionMode: 'bypassPermissions', // Force bypass for unattended execution
    model: modelToUse,
    maxTurns: agent.maxTurns || 10, // Default to 10 turns to prevent infinite loops
  };

  addLog('info', 'system', `Query options: permissionMode=bypassPermissions, model=${modelToUse}, maxTurns=${queryOptions.maxTurns}`);

  // Handle system prompt - SDK supports both string and preset object
  if (agent.systemPrompt) {
    if (typeof agent.systemPrompt === 'string') {
      queryOptions.systemPrompt = agent.systemPrompt;
      addLog('info', 'system', 'Using custom system prompt (string)');
    } else if (agent.systemPrompt.type === 'preset') {
      // Pass the preset object directly to SDK - it supports this format natively
      queryOptions.systemPrompt = agent.systemPrompt;
      addLog('info', 'system', `Using preset system prompt: ${agent.systemPrompt.preset}${agent.systemPrompt.append ? ' (with append)' : ''}`);
    }
  } else {
    addLog('info', 'system', 'No system prompt configured, using SDK default');
  }

  // Collect response
  let fullResponse = '';
  let sessionId: string | undefined;

  addLog('info', 'system', 'Starting Claude Code query...');

  try {
    for await (const message of query({
      prompt: task.triggerMessage,
      options: queryOptions,
    })) {
      // Capture session ID
      if (message.session_id && !sessionId) {
        sessionId = message.session_id;
        addLog('info', 'system', `Session ID: ${sessionId}`);
      }

      // Log different message types
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
            addLog('info', 'assistant', block.text);
          } else if (block.type === 'tool_use') {
            addLog('info', 'tool_use', `Tool: ${block.name}`, { 
              tool: block.name, 
              input: block.input 
            });
          }
        }
      } else if (message.type === 'result') {
        addLog('info', 'result', `Execution completed`, {
          costUsd: message.total_cost_usd,
          durationMs: message.duration_ms,
          numTurns: message.num_turns,
        });
      } else if (message.type === 'system') {
        // System messages might contain error info
        addLog('info', 'system', `System: ${JSON.stringify(message)}`);
      }
    }
  } catch (queryError) {
    const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
    const errorStack = queryError instanceof Error ? queryError.stack : undefined;
    addLog('error', 'system', `Query failed: ${errorMessage}`, { stack: errorStack });
    throw queryError;
  }

  addLog('info', 'system', 'Query completed successfully');

  // Create summary (first 500 chars)
  const summary = fullResponse.length > 500
    ? fullResponse.slice(0, 497) + '...'
    : fullResponse;

  return { summary, sessionId, logs };
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
