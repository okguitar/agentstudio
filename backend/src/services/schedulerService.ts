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
import { buildQueryOptions } from '../utils/claudeUtils.js';

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
  const tasks = loadScheduledTasks();
  let cleanedCount = 0;

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

  // Create AbortController for this execution
  const abortController = new AbortController();

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

  // Track running execution
  runningExecutions.set(executionId, {
    taskId,
    executionId,
    abortController,
    startedAt,
  });

  console.info(`[Scheduler] Executing task ${taskId} (${task.name}), execution: ${executionId}`);

  try {
    // Execute the agent with abort signal
    const result = await executeAgentTask(task, abortController.signal);

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
    // Remove from running executions
    runningExecutions.delete(executionId);

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
 * Extract MCP tools from agent's allowedTools configuration
 * Follows the same logic as frontend's useToolSelector.ts
 */
function extractMcpToolsFromAgent(agent: any): string[] {
  const mcpTools: string[] = [];
  
  if (!agent.allowedTools || !Array.isArray(agent.allowedTools)) {
    return mcpTools;
  }
  
  for (const tool of agent.allowedTools) {
    if (!tool.enabled) continue;
    
    const toolName = tool.name;
    
    if (toolName.includes('.') && !toolName.startsWith('mcp__')) {
      // MCP tool format: serverName.toolName -> mcp__serverName__toolName
      const [serverName, ...toolNameParts] = toolName.split('.');
      const mcpToolId = `mcp__${serverName}__${toolNameParts.join('.')}`;
      mcpTools.push(mcpToolId);
    } else if (toolName.startsWith('mcp__')) {
      // Already formatted MCP tool
      mcpTools.push(toolName);
    }
  }
  
  return mcpTools;
}

/**
 * Execute agent task using Claude SDK
 */
async function executeAgentTask(
  task: ScheduledTask,
  abortSignal?: AbortSignal
): Promise<{
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

  // Determine the model to use
  // Priority: task.modelOverride > project/provider config (handled by buildQueryOptions)
  let modelToUse: string | undefined = undefined;
  
  if (task.modelOverride?.modelId) {
    modelToUse = task.modelOverride.modelId;
    addLog('info', 'system', `Model override applied: ${modelToUse} (from task config)`);
  } else {
    addLog('info', 'system', `No model override, will use project/provider defaults`);
  }
  
  // Determine Claude version to use (from task override)
  // Note: AgentConfig doesn't have claudeVersionId, it's only in AgentSession
  const claudeVersionToUse = task.modelOverride?.versionId;
  if (claudeVersionToUse) {
    addLog('info', 'system', `Using supplier/version: ${claudeVersionToUse}`);
  } else {
    addLog('info', 'system', `No supplier/version specified, using default`);
  }

  // Extract MCP tools from agent configuration
  const mcpTools = extractMcpToolsFromAgent(agent);
  if (mcpTools.length > 0) {
    addLog('info', 'system', `MCP tools extracted from agent config: ${mcpTools.join(', ')}`);
  } else {
    addLog('info', 'system', 'No MCP tools configured for this agent');
  }

  // Build query options using the shared utility function
  // This handles: MCP tools, environment variables, Claude version, A2A integration
  // NOTE: Scheduled tasks run unattended, so we MUST use bypassPermissions mode
  addLog('info', 'system', 'Building query options with MCP and environment support...');

  // For scheduled tasks, use bypassPermissions mode (unattended execution)
  const permissionMode = 'bypassPermissions';
  addLog('info', 'system', `Using 'bypassPermissions' mode for scheduled task`);

  const { queryOptions } = await buildQueryOptions(
    agent,
    task.projectPath,
    mcpTools.length > 0 ? mcpTools : undefined,
    permissionMode,
    modelToUse,
    claudeVersionToUse,
    undefined, // defaultEnv - will be loaded from Claude version config
    undefined, // userEnv - scheduled tasks don't have user-provided env vars
    undefined, // sessionIdForAskUser - scheduled tasks don't support user interaction
    undefined  // agentIdForAskUser
  );

  // Override maxTurns for scheduled tasks to prevent infinite loops
  queryOptions.maxTurns = agent.maxTurns || 10;

  // Get the actual resolved model from queryOptions
  const resolvedModel = queryOptions.model || 'sonnet';
  addLog('info', 'system', `Query options built: permissionMode=bypassPermissions, model=${resolvedModel}, maxTurns=${queryOptions.maxTurns}`);

  // Model compatibility check
  // Some models may have limitations with bypassPermissions mode
  const modelLower = resolvedModel.toLowerCase();
  const isGlmModel = modelLower.includes('glm') ||
                     modelLower.includes('zhipu') ||
                     modelLower.includes('chatglm') ||
                     modelLower.startsWith('glm');
  
  if (isGlmModel) {
    addLog('warn', 'system', `GLM model detected: ${resolvedModel}. GLM models may have compatibility issues with scheduled tasks.`);
    addLog('warn', 'system', `If this task fails, consider using Claude models (Sonnet, Haiku, Opus) instead.`);
  }
  
  const knownClaudeModels = ['sonnet', 'haiku', 'opus', 'claude'];
  const isKnownClaudeModel = knownClaudeModels.some(m => modelLower.includes(m));
  if (!isKnownClaudeModel && !isGlmModel) {
    addLog('warn', 'system', `Warning: Model "${resolvedModel}" may not support bypassPermissions mode required for scheduled tasks`);
  }

  // Log MCP servers if configured
  if (queryOptions.mcpServers) {
    const mcpServerNames = Object.keys(queryOptions.mcpServers);
    addLog('info', 'system', `MCP servers configured: ${mcpServerNames.join(', ')}`);

    // Log detailed MCP server config for debugging
    for (const [serverName, serverConfig] of Object.entries(queryOptions.mcpServers)) {
      addLog('info', 'system', `  - ${serverName}: ${JSON.stringify(serverConfig)}`);
    }
  } else {
    addLog('warn', 'system', `No MCP servers configured in queryOptions (mcpTools passed: ${mcpTools.join(', ') || 'none'})`);
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
      // Check if execution was aborted
      if (abortSignal?.aborted) {
        addLog('warn', 'system', 'Execution aborted by user');
        throw new Error('Execution aborted by user');
      }

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
