/**
 * A2A Task Cleanup Service
 *
 * Handles cleanup of orphaned tasks on server startup.
 * Orphaned tasks are tasks with status='running' that were left
 * in that state due to server crash or restart.
 *
 * This service scans all projects' task directories and marks
 * any running tasks as 'failed' with an appropriate error message.
 */

import fs from 'fs/promises';
import path from 'path';
import { A2ATask } from '../../types/a2a.js';
import { taskManager } from './taskManager.js';

// ============================================================================
// Constants
// ============================================================================

const PROJECTS_BASE_DIR = path.join(process.cwd(), 'projects');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all project directories
 */
async function getAllProjectDirs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(PROJECTS_BASE_DIR, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // Projects directory doesn't exist yet
    }
    throw error;
  }
}

/**
 * Check if a task directory exists for a project
 */
async function taskDirectoryExists(projectId: string): Promise<boolean> {
  try {
    const tasksDir = path.join(PROJECTS_BASE_DIR, projectId, '.a2a', 'tasks');
    await fs.access(tasksDir);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Main Cleanup Function
// ============================================================================

/**
 * Clean up orphaned tasks across all projects
 *
 * Scans all projects' .a2a/tasks/ directories and marks any tasks
 * with status='running' as 'failed' (indicating they were orphaned
 * due to server restart).
 *
 * @returns Count of tasks cleaned up
 */
export async function cleanupOrphanedTasks(): Promise<number> {
  console.info('[TaskCleanup] Starting orphaned task cleanup...');

  let totalCleaned = 0;
  const startTime = Date.now();

  try {
    // Get all project directories
    const projectIds = await getAllProjectDirs();

    console.info(`[TaskCleanup] Scanning ${projectIds.length} projects...`);

    // Process each project
    for (const projectId of projectIds) {
      // Check if project has tasks directory
      const hasTasksDir = await taskDirectoryExists(projectId);

      if (!hasTasksDir) {
        continue; // No tasks for this project
      }

      try {
        // Get all running tasks for this project
        const runningTasks = await taskManager.listTasks(projectId, 'running');

        if (runningTasks.length === 0) {
          continue; // No orphaned tasks
        }

        console.info(`[TaskCleanup] Found ${runningTasks.length} orphaned tasks in project ${projectId}`);

        // Mark each running task as failed
        for (const task of runningTasks) {
          try {
            await taskManager.updateTaskStatus(projectId, task.id, 'failed', {
              errorDetails: {
                message: 'Task was orphaned due to server restart',
                code: 'TASK_ORPHANED',
              },
              completedAt: new Date().toISOString(),
            });

            totalCleaned++;

            console.info(`[TaskCleanup] Cleaned orphaned task: ${task.id}`);
          } catch (error) {
            console.error(`[TaskCleanup] Failed to clean task ${task.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`[TaskCleanup] Error processing project ${projectId}:`, error);
      }
    }

    const duration = Date.now() - startTime;

    console.info(`[TaskCleanup] Cleanup complete. Cleaned ${totalCleaned} tasks in ${duration}ms`);

    return totalCleaned;
  } catch (error) {
    console.error('[TaskCleanup] Fatal error during cleanup:', error);
    throw error;
  }
}

/**
 * Clean up timed-out tasks across all projects
 *
 * Scans all projects and marks tasks that have exceeded their timeout
 * as 'failed'. This is called periodically by the timeout monitor.
 *
 * @returns Count of tasks marked as timed out
 */
export async function cleanupTimedOutTasks(): Promise<number> {
  let totalTimedOut = 0;
  const now = Date.now();

  try {
    // Get all project directories
    const projectIds = await getAllProjectDirs();

    // Process each project
    for (const projectId of projectIds) {
      // Check if project has tasks directory
      const hasTasksDir = await taskDirectoryExists(projectId);

      if (!hasTasksDir) {
        continue;
      }

      try {
        // Get all running tasks for this project
        const runningTasks = await taskManager.listTasks(projectId, 'running');

        // Check each task for timeout
        for (const task of runningTasks) {
          const createdTime = new Date(task.createdAt).getTime();
          const elapsedMs = now - createdTime;

          if (elapsedMs > task.timeoutMs) {
            // Task has timed out
            try {
              await taskManager.updateTaskStatus(projectId, task.id, 'failed', {
                errorDetails: {
                  message: `Task timed out after ${task.timeoutMs}ms (elapsed: ${elapsedMs}ms)`,
                  code: 'TASK_TIMEOUT',
                },
                completedAt: new Date().toISOString(),
              });

              totalTimedOut++;

              console.warn(`[TaskCleanup] Task timed out: ${task.id} (elapsed: ${elapsedMs}ms)`);
            } catch (error) {
              console.error(`[TaskCleanup] Failed to mark task ${task.id} as timed out:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`[TaskCleanup] Error checking timeouts for project ${projectId}:`, error);
      }
    }

    if (totalTimedOut > 0) {
      console.info(`[TaskCleanup] Marked ${totalTimedOut} tasks as timed out`);
    }

    return totalTimedOut;
  } catch (error) {
    console.error('[TaskCleanup] Fatal error during timeout cleanup:', error);
    throw error;
  }
}
