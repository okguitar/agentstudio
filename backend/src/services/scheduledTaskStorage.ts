/**
 * Scheduled Task Storage Service
 * 
 * Manages persistence of scheduled tasks and execution history.
 * Uses JSON file storage in ~/.claude-agent/scheduled-tasks/
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ScheduledTask,
  TaskExecution,
  CreateScheduledTaskRequest,
  UpdateScheduledTaskRequest,
} from '../types/scheduledTasks.js';
import {
  SCHEDULED_TASKS_DIR,
  SCHEDULED_TASKS_FILE,
  SCHEDULED_TASKS_HISTORY_DIR,
} from '../config/paths.js';

/**
 * Ensure scheduled tasks directories exist
 */
function ensureDirectoriesExist(): void {
  if (!fs.existsSync(SCHEDULED_TASKS_DIR)) {
    fs.mkdirSync(SCHEDULED_TASKS_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCHEDULED_TASKS_HISTORY_DIR)) {
    fs.mkdirSync(SCHEDULED_TASKS_HISTORY_DIR, { recursive: true });
  }
}

/**
 * Load all scheduled tasks from storage
 */
export function loadScheduledTasks(): ScheduledTask[] {
  ensureDirectoriesExist();
  
  if (!fs.existsSync(SCHEDULED_TASKS_FILE)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(SCHEDULED_TASKS_FILE, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ScheduledTaskStorage] Error loading tasks:', error);
    return [];
  }
}

/**
 * Save all scheduled tasks to storage
 */
function saveScheduledTasks(tasks: ScheduledTask[]): void {
  ensureDirectoriesExist();
  
  try {
    fs.writeFileSync(SCHEDULED_TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (error) {
    console.error('[ScheduledTaskStorage] Error saving tasks:', error);
    throw error;
  }
}

/**
 * Get a scheduled task by ID
 */
export function getScheduledTask(taskId: string): ScheduledTask | null {
  const tasks = loadScheduledTasks();
  return tasks.find(t => t.id === taskId) || null;
}

/**
 * Create a new scheduled task
 */
export function createScheduledTask(request: CreateScheduledTaskRequest): ScheduledTask {
  const tasks = loadScheduledTasks();
  const now = new Date().toISOString();
  
  const newTask: ScheduledTask = {
    id: `task_${uuidv4().slice(0, 8)}`,
    name: request.name,
    description: request.description,
    agentId: request.agentId,
    projectPath: request.projectPath,
    schedule: request.schedule,
    triggerMessage: request.triggerMessage,
    enabled: request.enabled ?? true,
    modelOverride: request.modelOverride,  // 保存模型覆盖配置
    createdAt: now,
    updatedAt: now,
  };
  
  tasks.push(newTask);
  saveScheduledTasks(tasks);
  
  console.info(`[ScheduledTaskStorage] Created task: ${newTask.id} (${newTask.name})`);
  return newTask;
}

/**
 * Update an existing scheduled task
 */
export function updateScheduledTask(
  taskId: string,
  request: UpdateScheduledTaskRequest
): ScheduledTask | null {
  const tasks = loadScheduledTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index === -1) {
    return null;
  }
  
  const updatedTask: ScheduledTask = {
    ...tasks[index],
    ...request,
    updatedAt: new Date().toISOString(),
  };
  
  tasks[index] = updatedTask;
  saveScheduledTasks(tasks);
  
  console.info(`[ScheduledTaskStorage] Updated task: ${taskId}`);
  return updatedTask;
}

/**
 * Delete a scheduled task
 */
export function deleteScheduledTask(taskId: string): boolean {
  const tasks = loadScheduledTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index === -1) {
    return false;
  }
  
  tasks.splice(index, 1);
  saveScheduledTasks(tasks);
  
  // Also delete execution history
  const historyFile = path.join(SCHEDULED_TASKS_HISTORY_DIR, `${taskId}.json`);
  if (fs.existsSync(historyFile)) {
    fs.unlinkSync(historyFile);
  }
  
  console.info(`[ScheduledTaskStorage] Deleted task: ${taskId}`);
  return true;
}

/**
 * Toggle task enabled state
 */
export function toggleScheduledTask(taskId: string): ScheduledTask | null {
  const tasks = loadScheduledTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index === -1) {
    return null;
  }
  
  tasks[index].enabled = !tasks[index].enabled;
  tasks[index].updatedAt = new Date().toISOString();
  
  saveScheduledTasks(tasks);
  
  console.info(`[ScheduledTaskStorage] Toggled task: ${taskId} -> enabled=${tasks[index].enabled}`);
  return tasks[index];
}

/**
 * Update task run status
 */
export function updateTaskRunStatus(
  taskId: string,
  status: 'running' | 'success' | 'error' | 'stopped',
  error?: string
): void {
  const tasks = loadScheduledTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index === -1) {
    return;
  }
  
  tasks[index].lastRunAt = new Date().toISOString();
  tasks[index].lastRunStatus = status;
  tasks[index].lastRunError = error;
  tasks[index].updatedAt = new Date().toISOString();
  
  saveScheduledTasks(tasks);
}

/**
 * Update task's next run time
 */
export function updateTaskNextRunAt(taskId: string, nextRunAt: string | undefined): void {
  const tasks = loadScheduledTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index === -1) {
    return;
  }
  
  tasks[index].nextRunAt = nextRunAt;
  saveScheduledTasks(tasks);
}

// ============================================================================
// Execution History Management
// ============================================================================

/**
 * Get execution history for a task
 */
export function getTaskExecutionHistory(taskId: string, limit: number = 50): TaskExecution[] {
  const historyFile = path.join(SCHEDULED_TASKS_HISTORY_DIR, `${taskId}.json`);
  
  if (!fs.existsSync(historyFile)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(historyFile, 'utf-8');
    const executions: TaskExecution[] = JSON.parse(content);
    
    // Sort by startedAt descending and limit
    return executions
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error(`[ScheduledTaskStorage] Error loading execution history for ${taskId}:`, error);
    return [];
  }
}

/**
 * Add execution record to history
 */
export function addTaskExecution(execution: TaskExecution): void {
  ensureDirectoriesExist();
  
  const historyFile = path.join(SCHEDULED_TASKS_HISTORY_DIR, `${execution.taskId}.json`);
  
  let executions: TaskExecution[] = [];
  if (fs.existsSync(historyFile)) {
    try {
      const content = fs.readFileSync(historyFile, 'utf-8');
      executions = JSON.parse(content);
    } catch (error) {
      console.error(`[ScheduledTaskStorage] Error reading execution history:`, error);
    }
  }
  
  executions.push(execution);
  
  // Keep only last 100 executions
  if (executions.length > 100) {
    executions = executions
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 100);
  }
  
  try {
    fs.writeFileSync(historyFile, JSON.stringify(executions, null, 2), 'utf-8');
  } catch (error) {
    console.error(`[ScheduledTaskStorage] Error saving execution history:`, error);
  }
}

/**
 * Update execution record
 */
export function updateTaskExecution(
  taskId: string,
  executionId: string,
  updates: Partial<TaskExecution>
): void {
  const historyFile = path.join(SCHEDULED_TASKS_HISTORY_DIR, `${taskId}.json`);
  
  if (!fs.existsSync(historyFile)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(historyFile, 'utf-8');
    const executions: TaskExecution[] = JSON.parse(content);
    
    const index = executions.findIndex(e => e.id === executionId);
    if (index !== -1) {
      executions[index] = { ...executions[index], ...updates };
      fs.writeFileSync(historyFile, JSON.stringify(executions, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error(`[ScheduledTaskStorage] Error updating execution record:`, error);
  }
}

/**
 * Clean up orphaned execution records
 * 
 * Marks any "running" executions as "error" if they were started before the current
 * server startup time. This handles the case where the server was restarted while
 * tasks were still running.
 * 
 * @param serverStartTime - The time the server started (ISO string)
 * @returns The number of orphaned executions cleaned up
 */
export function cleanupOrphanedExecutions(serverStartTime: string): number {
  const tasks = loadScheduledTasks();
  let cleanedCount = 0;
  const serverStartMs = new Date(serverStartTime).getTime();

  console.info(`[ScheduledTaskStorage] Cleaning up orphaned executions (server started at ${serverStartTime})`);

  for (const task of tasks) {
    const historyFile = path.join(SCHEDULED_TASKS_HISTORY_DIR, `${task.id}.json`);
    
    if (!fs.existsSync(historyFile)) {
      continue;
    }

    try {
      const content = fs.readFileSync(historyFile, 'utf-8');
      const executions: TaskExecution[] = JSON.parse(content);
      let modified = false;

      for (const execution of executions) {
        // Check if execution is stuck in "running" state
        if (execution.status === 'running') {
          const executionStartMs = new Date(execution.startedAt).getTime();
          
          // If the execution started before the server started, it's orphaned
          if (executionStartMs < serverStartMs) {
            execution.status = 'error';
            execution.completedAt = serverStartTime;
            execution.error = 'Server restarted while task was running';
            execution.logs = execution.logs || [];
            execution.logs.push({
              timestamp: serverStartTime,
              level: 'error',
              type: 'system',
              message: 'Execution marked as failed due to server restart',
            });
            modified = true;
            cleanedCount++;

            console.info(`[ScheduledTaskStorage] Cleaned orphaned execution: ${execution.id} (task: ${task.id})`);
          }
        }
      }

      // Also check and update task's lastRunStatus if it's "running"
      if (task.lastRunStatus === 'running' && task.lastRunAt) {
        const lastRunMs = new Date(task.lastRunAt).getTime();
        if (lastRunMs < serverStartMs) {
          updateTaskRunStatus(task.id, 'error', 'Server restarted while task was running');
          console.info(`[ScheduledTaskStorage] Updated task ${task.id} status from 'running' to 'error'`);
        }
      }

      if (modified) {
        fs.writeFileSync(historyFile, JSON.stringify(executions, null, 2), 'utf-8');
      }
    } catch (error) {
      console.error(`[ScheduledTaskStorage] Error cleaning orphaned executions for ${task.id}:`, error);
    }
  }

  console.info(`[ScheduledTaskStorage] Orphaned execution cleanup complete. Cleaned ${cleanedCount} executions.`);
  return cleanedCount;
}
