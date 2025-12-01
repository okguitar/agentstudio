/**
 * A2A Task Manager Service
 *
 * Manages the lifecycle of A2A asynchronous tasks with file-based persistence.
 * Tasks are stored as JSON files in projects/:projectId/.a2a/tasks/:taskId.json
 *
 * State Transitions:
 * - pending → running
 * - running → completed | failed | canceled
 * - pending → canceled
 *
 * All state transitions are validated and atomic using file locking.
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import lockfile from 'proper-lockfile';
import { A2ATask, TaskStatus, TaskInput, TaskOutput, TaskError } from '../../types/a2a.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes
const LOCK_OPTIONS = {
  retries: {
    retries: 5,
    minTimeout: 50,
    maxTimeout: 1000,
  },
  stale: 10000, // Consider lock stale after 10 seconds
};

// ============================================================================
// Types
// ============================================================================

interface CreateTaskParams {
  projectId: string;
  agentId: string;
  a2aAgentId: string;
  input: TaskInput;
  timeoutMs?: number;
}

interface UpdateTaskParams {
  output?: TaskOutput;
  errorDetails?: TaskError;
  startedAt?: string;
  completedAt?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the directory path for tasks in a project
 */
function getTasksDirectory(projectId: string): string {
  return path.join(process.cwd(), 'projects', projectId, '.a2a', 'tasks');
}

/**
 * Get the file path for a specific task
 */
function getTaskFilePath(projectId: string, taskId: string): string {
  return path.join(getTasksDirectory(projectId), `${taskId}.json`);
}

/**
 * Validate state transition is legal
 * @throws Error if transition is invalid
 */
function validateStateTransition(currentStatus: TaskStatus, newStatus: TaskStatus): void {
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    pending: ['running', 'canceled'],
    running: ['completed', 'failed', 'canceled'],
    completed: [], // Terminal state
    failed: [], // Terminal state
    canceled: [], // Terminal state
  };

  const allowedNext = validTransitions[currentStatus];

  if (!allowedNext.includes(newStatus)) {
    throw new Error(
      `Invalid state transition: ${currentStatus} → ${newStatus}. ` +
      `Allowed transitions from ${currentStatus}: ${allowedNext.join(', ')}`
    );
  }
}

/**
 * Ensure tasks directory exists
 */
async function ensureTasksDirectory(projectId: string): Promise<void> {
  const tasksDir = getTasksDirectory(projectId);
  await fs.mkdir(tasksDir, { recursive: true });
}

// ============================================================================
// TaskManager Class
// ============================================================================

/**
 * Task Manager Service
 * Handles all task CRUD operations with file-based persistence
 */
export class TaskManager {
  /**
   * Create a new task
   * Task starts in 'pending' state
   *
   * @param params - Task creation parameters
   * @returns Created task object
   * @throws Error if task creation fails
   */
  async createTask(params: CreateTaskParams): Promise<A2ATask> {
    const { projectId, agentId, a2aAgentId, input, timeoutMs = DEFAULT_TIMEOUT_MS } = params;

    // Generate unique task ID
    const taskId = uuidv4();

    // Ensure directory exists
    await ensureTasksDirectory(projectId);

    // Create task object
    const now = new Date().toISOString();
    const task: A2ATask = {
      id: taskId,
      projectId,
      agentId,
      a2aAgentId,
      status: 'pending',
      input,
      timeoutMs,
      createdAt: now,
      updatedAt: now,
    };

    // Write task file with locking
    const taskFilePath = getTaskFilePath(projectId, taskId);
    const taskContent = JSON.stringify(task, null, 2);

    await fs.writeFile(taskFilePath, taskContent, 'utf-8');

    console.info('[TaskManager] Task created:', {
      taskId,
      projectId,
      agentId,
      timeoutMs,
    });

    return task;
  }

  /**
   * Get task by ID
   *
   * @param projectId - Project ID
   * @param taskId - Task ID
   * @returns Task object or null if not found
   */
  async getTask(projectId: string, taskId: string): Promise<A2ATask | null> {
    try {
      const taskFilePath = getTaskFilePath(projectId, taskId);
      const taskContent = await fs.readFile(taskFilePath, 'utf-8');
      const task: A2ATask = JSON.parse(taskContent);
      return task;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // Task not found
      }
      throw error;
    }
  }

  /**
   * Update task status and related fields
   * Validates state transitions and uses file locking for atomicity
   *
   * @param projectId - Project ID
   * @param taskId - Task ID
   * @param newStatus - New task status
   * @param updates - Additional fields to update
   * @throws Error if task not found or invalid transition
   */
  async updateTaskStatus(
    projectId: string,
    taskId: string,
    newStatus: TaskStatus,
    updates?: UpdateTaskParams
  ): Promise<A2ATask> {
    const taskFilePath = getTaskFilePath(projectId, taskId);

    // First check if task exists before trying to lock
    const task = await this.getTask(projectId, taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Acquire lock for atomic update
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lockfile.lock(taskFilePath, LOCK_OPTIONS);

      // Validate state transition
      validateStateTransition(task.status, newStatus);

      // Update task
      const now = new Date().toISOString();
      const updatedTask: A2ATask = {
        ...task,
        status: newStatus,
        updatedAt: now,
        ...updates,
      };

      // Write updated task
      const taskContent = JSON.stringify(updatedTask, null, 2);
      await fs.writeFile(taskFilePath, taskContent, 'utf-8');

      console.info('[TaskManager] Task status updated:', {
        taskId,
        projectId,
        oldStatus: task.status,
        newStatus,
      });

      return updatedTask;
    } finally {
      // Release lock
      if (release) {
        await release();
      }
    }
  }

  /**
   * Cancel a task
   * Only pending or running tasks can be canceled
   *
   * @param projectId - Project ID
   * @param taskId - Task ID
   * @returns Updated task object
   * @throws Error if task cannot be canceled
   */
  async cancelTask(projectId: string, taskId: string): Promise<A2ATask> {
    const task = await this.getTask(projectId, taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Check if task can be canceled
    if (['completed', 'failed', 'canceled'].includes(task.status)) {
      throw new Error(
        `Cannot cancel task in ${task.status} state. Only pending or running tasks can be canceled.`
      );
    }

    // Update status to canceled
    return this.updateTaskStatus(projectId, taskId, 'canceled', {
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * List all tasks for a project
   *
   * @param projectId - Project ID
   * @param statusFilter - Optional status filter
   * @returns Array of tasks
   */
  async listTasks(projectId: string, statusFilter?: TaskStatus): Promise<A2ATask[]> {
    try {
      const tasksDir = getTasksDirectory(projectId);
      const files = await fs.readdir(tasksDir);

      const tasks: A2ATask[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const taskId = file.replace('.json', '');
        const task = await this.getTask(projectId, taskId);

        if (task && (!statusFilter || task.status === statusFilter)) {
          tasks.push(task);
        }
      }

      // Sort by creation time (newest first)
      tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return tasks;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return []; // No tasks directory yet
      }
      throw error;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of TaskManager
 */
export const taskManager = new TaskManager();
