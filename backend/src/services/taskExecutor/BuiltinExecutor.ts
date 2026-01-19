/**
 * Builtin Task Executor - Worker Pool Implementation
 *
 * Implements task execution using Node.js worker_threads for non-blocking execution.
 * Each task runs in an isolated worker thread with resource limits.
 *
 * This is the default implementation (TASK_EXECUTOR_MODE=builtin)
 */

import { Worker } from 'worker_threads';
import path from 'path';
import { existsSync } from 'fs';
import type {
  ITaskExecutor,
  TaskDefinition,
  TaskResult,
  TaskStatus,
  TaskExecutorConfig,
  TaskExecutorStats,
} from './types.js';

// Use __dirname directly in CommonJS environment
// TypeScript compiles to CommonJS, so __dirname is available at runtime
const _dirname = __dirname;

// ============================================================================
// Types
// ============================================================================

interface WorkerInstance {
  worker: Worker;
  task: TaskDefinition;
  startTime: number;
  timeout?: NodeJS.Timeout;
}

interface QueuedTask {
  task: TaskDefinition;
  resolve: () => void;
  reject: (error: Error) => void;
}

// ============================================================================
// BuiltinTaskExecutor
// ============================================================================

export class BuiltinTaskExecutor implements ITaskExecutor {
  private config: TaskExecutorConfig;
  private workers: Map<string, WorkerInstance> = new Map();
  private taskQueue: QueuedTask[] = [];
  private stats: TaskExecutorStats;
  private startTime: number;
  private isRunning = false;
  private processTimer?: NodeJS.Timeout;
  private workerHealthChecks: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<TaskExecutorConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 5,
      defaultTimeoutMs: config.defaultTimeoutMs ?? 300000, // 5 minutes
      maxMemoryMb: config.maxMemoryMb ?? 512,
      maxRetries: config.maxRetries ?? 0,
      retryDelayMs: config.retryDelayMs ?? 5000,
    };

    this.startTime = Date.now();
    this.stats = {
      mode: 'builtin',
      runningTasks: 0,
      queuedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      canceledTasks: 0,
      uptimeMs: 0,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[TaskExecutor] Already started');
      return;
    }

    console.info(`[TaskExecutor] Starting builtin executor with maxConcurrent=${this.config.maxConcurrent}`);
    this.isRunning = true;
    this.startTime = Date.now();

    // Start queue processor
    this.processTimer = setInterval(() => {
      this.processQueue().catch((err) => {
        console.error('[TaskExecutor] Error processing queue:', err);
      });
    }, 1000); // Check every second

    console.info('[TaskExecutor] Builtin executor started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.info('[TaskExecutor] Stopping builtin executor...');

    // Stop queue processor
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = undefined;
    }

    // Terminate all workers
    const terminationPromises: Promise<void>[] = [];
    for (const [taskId, workerInstance] of this.workers) {
      terminationPromises.push(
        new Promise<void>((resolve) => {
          workerInstance.worker.terminate().then(() => {
            console.debug(`[TaskExecutor] Terminated worker for task: ${taskId}`);
            resolve();
          });
        })
      );
    }

    await Promise.all(terminationPromises);
    this.workers.clear();

    // Reject queued tasks
    for (const queued of this.taskQueue) {
      queued.reject(new Error('Executor shutting down'));
    }
    this.taskQueue = [];

    this.isRunning = false;
    console.info('[TaskExecutor] Builtin executor stopped');
  }

  async submitTask(task: TaskDefinition): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Executor not started');
    }

    return new Promise<void>((resolve, reject) => {
      this.taskQueue.push({
        task,
        resolve,
        reject,
      });

      this.updateStats();
      this.processQueue().catch(reject);
    });
  }

  async cancelTask(taskId: string): Promise<boolean> {
    console.info(`[TaskExecutor] Attempting to cancel task: ${taskId}`);

    // Check running workers
    const workerInstance = this.workers.get(taskId);
    if (workerInstance) {
      console.info(`[TaskExecutor] Terminating worker for running task: ${taskId}`);

      try {
        // Clear health check timer
        const healthCheckTimer = this.workerHealthChecks.get(taskId);
        if (healthCheckTimer) {
          clearTimeout(healthCheckTimer);
          this.workerHealthChecks.delete(taskId);
        }

        // Terminate worker gracefully
        await workerInstance.worker.terminate();
        this.workers.delete(taskId);

        this.stats.canceledTasks++;
        this.updateStats();

        console.info(`[TaskExecutor] Successfully canceled running task: ${taskId}`);
        return true;
      } catch (error) {
        console.error(`[TaskExecutor] Error canceling task ${taskId}:`, error);
        return false;
      }
    }

    // Check queued tasks
    const queueIndex = this.taskQueue.findIndex((qt) => qt.task.id === taskId);
    if (queueIndex !== -1) {
      const queued = this.taskQueue.splice(queueIndex, 1)[0];
      queued.reject(new Error('Task canceled'));
      this.stats.canceledTasks++;
      this.updateStats();

      console.info(`[TaskExecutor] Successfully canceled queued task: ${taskId}`);
      return true;
    }

    console.warn(`[TaskExecutor] Task not found for cancellation: ${taskId}`);
    return false;
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    // Check running workers
    const workerInstance = this.workers.get(taskId);
    if (workerInstance) {
      return {
        taskId,
        status: 'running',
        createdAt: workerInstance.task.createdAt,
        startedAt: new Date(workerInstance.startTime).toISOString(),
      };
    }

    // Check queued tasks
    const queued = this.taskQueue.find((qt) => qt.task.id === taskId);
    if (queued) {
      return {
        taskId,
        status: 'pending',
        createdAt: queued.task.createdAt,
      };
    }

    // Task not found in executor (may have completed)
    return null;
  }

  isHealthy(): boolean {
    return this.isRunning;
  }

  getStats(): TaskExecutorStats {
    this.updateStats();
    return { ...this.stats };
  }

  getConfig(): TaskExecutorConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<TaskExecutorConfig>): void {
    if (newConfig.maxConcurrent !== undefined) {
      if (newConfig.maxConcurrent < 1 || newConfig.maxConcurrent > 10) {
        throw new Error('maxConcurrent must be between 1 and 10');
      }
      this.config.maxConcurrent = newConfig.maxConcurrent;
      console.info(`[TaskExecutor] Updated maxConcurrent to ${newConfig.maxConcurrent}`);
    }
    if (newConfig.defaultTimeoutMs !== undefined) {
      if (newConfig.defaultTimeoutMs < 10000 || newConfig.defaultTimeoutMs > 3600000) {
        throw new Error('defaultTimeoutMs must be between 10 seconds and 1 hour');
      }
      this.config.defaultTimeoutMs = newConfig.defaultTimeoutMs;
      console.info(`[TaskExecutor] Updated defaultTimeoutMs to ${newConfig.defaultTimeoutMs}`);
    }
    if (newConfig.maxMemoryMb !== undefined) {
      this.config.maxMemoryMb = newConfig.maxMemoryMb;
      console.info(`[TaskExecutor] Updated maxMemoryMb to ${newConfig.maxMemoryMb}`);
    }
    // Trigger queue processing in case new concurrency allows more tasks
    this.processQueue();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async processQueue(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Check if we can start more tasks
    while (this.workers.size < this.config.maxConcurrent && this.taskQueue.length > 0) {
      const queued = this.taskQueue.shift();
      if (!queued) break;

      try {
        await this.startTask(queued.task);
        queued.resolve();
      } catch (error) {
        queued.reject(error as Error);
      }
    }

    this.updateStats();
  }

  private async startTask(task: TaskDefinition): Promise<void> {
    console.info(`[TaskExecutor] Starting task: ${task.id} (type=${task.type})`);

    // Worker Threads require compiled JavaScript files
    // The worker file path resolution strategy:
    // 1. Check current directory (works when running from dist/)
    // 2. Check dist directory (works when running from src/ during tests)
    //
    // Note: We cannot use .ts files directly in Workers because:
    // - Workers run in isolated threads without access to the parent's TypeScript loader
    // - Even with tsx/ts-node, configuring loaders for Workers is unreliable
    // - Best practice: Run `pnpm run build` before testing

    let workerPath = path.join(_dirname, 'taskWorker.js');

    if (!existsSync(workerPath)) {
      // If not found in current directory, try the dist directory
      // This handles the case when tests run from src/ but need dist/ workers
      const distPath = _dirname.replace('/src/', '/dist/');
      workerPath = path.join(distPath, 'taskWorker.js');

      if (!existsSync(workerPath)) {
        throw new Error(
          `Worker file not found at ${workerPath}. ` +
          `Please run 'pnpm run build' to compile TypeScript files.`
        );
      }
    }

    // Create worker with the compiled JavaScript file
    const worker = new Worker(workerPath, {
      workerData: task,
      resourceLimits: {
        maxOldGenerationSizeMb: this.config.maxMemoryMb,
      },
    });

    const startTime = Date.now();

    // Set up timeout
    const timeoutMs = task.timeoutMs || this.config.defaultTimeoutMs;
    const timeout = setTimeout(() => {
      console.warn(`[TaskExecutor] Task ${task.id} timed out after ${timeoutMs}ms`);
      worker.terminate();
    }, timeoutMs);

    // Store worker instance
    this.workers.set(task.id, {
      worker,
      task,
      startTime,
      timeout,
    });

    // Set up health check timer
    this.setupWorkerHealthCheck(task.id, worker);

    // Handle messages from worker
    worker.on('message', (message: { type: string; data?: unknown }) => {
      if (message.type === 'log') {
        // Log message - could be stored or emitted
        console.debug(`[TaskWorker:${task.id}]`, message.data);
      } else if (message.type === 'complete') {
        const result = message.data as TaskResult;
        this.handleTaskComplete(task.id, result);
      } else if (message.type === 'error') {
        const error = message.data as Partial<TaskResult>;
        this.handleTaskComplete(task.id, {
          taskId: task.id,
          status: 'failed',
          error: error.error || 'Unknown error',
          completedAt: error.completedAt || new Date().toISOString(),
          executionTimeMs: error.executionTimeMs || 0,
        });
      }
    });

    // Handle worker errors
    worker.on('error', (error) => {
      console.error(`[TaskExecutor] Worker error for task ${task.id}:`, error);
      this.handleTaskComplete(task.id, {
        taskId: task.id,
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      });
    });

    // Handle worker exit
    worker.on('exit', (code) => {
      if (code !== 0 && !this.workers.has(task.id)) {
        // Worker already terminated by timeout handler
        return;
      }

      if (code !== 0) {
        console.error(`[TaskExecutor] Worker stopped with exit code ${code} for task ${task.id}`);
        this.handleTaskComplete(task.id, {
          taskId: task.id,
          status: 'failed',
          error: `Worker stopped with exit code ${code}`,
          completedAt: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
        });
      }
    });
  }

  private handleTaskComplete(taskId: string, result: TaskResult): void {
    const workerInstance = this.workers.get(taskId);
    if (!workerInstance) {
      return; // Already handled
    }

    // Clear timeout
    if (workerInstance.timeout) {
      clearTimeout(workerInstance.timeout);
    }

    // Terminate worker
    workerInstance.worker.terminate().catch((err) => {
      console.warn(`[TaskExecutor] Error terminating worker for task ${taskId}:`, err);
    });

    // Remove from workers map
    this.workers.delete(taskId);

    // Update stats
    if (result.status === 'completed') {
      this.stats.completedTasks++;
    } else if (result.status === 'failed') {
      this.stats.failedTasks++;
    } else if (result.status === 'canceled') {
      this.stats.canceledTasks++;
    }

    this.updateStats();

    console.info(
      `[TaskExecutor] Task ${taskId} completed: status=${result.status}, time=${result.executionTimeMs}ms`
    );

    // Store result (for A2A tasks or scheduled tasks)
    this.storeResult(workerInstance.task, result).catch((err) => {
      console.error(`[TaskExecutor] Error storing result for task ${taskId}:`, err);
    });

    // Process next task in queue
    setImmediate(() => {
      this.processQueue().catch((err) => {
        console.error('[TaskExecutor] Error processing queue after task completion:', err);
      });
    });
  }

  private async storeResult(task: TaskDefinition, result: TaskResult): Promise<void> {
    try {
      if (task.type === 'a2a_async') {
        // Store result for A2A task
        const { taskManager } = await import('../a2a/taskManager.js');

        // First, ensure task is in 'running' state (pending → running transition)
        // This is needed because the task was created as 'pending' and we need
        // a valid state transition: pending → running → completed/failed
        try {
          const currentTask = await taskManager.getTask(task.projectPath, task.id);
          if (currentTask && currentTask.status === 'pending') {
            await taskManager.updateTaskStatus(
              task.projectPath,
              task.id,
              'running',
              { startedAt: task.createdAt }
            );
          }
        } catch (transitionError) {
          console.warn(`[TaskExecutor] Could not transition A2A task ${task.id} to running:`, transitionError);
        }

        // Prepare output and error for storage and webhook
        let taskOutput: { result: string } | undefined;
        let taskError: { message: string; code: string; stack?: string } | undefined;

        // Now update to final state
        if (result.status === 'completed') {
          taskOutput = { result: result.output || '' };
          await taskManager.updateTaskStatus(
            task.projectPath,
            task.id,
            'completed',
            {
              output: taskOutput,
              completedAt: result.completedAt,
            }
          );
        } else {
          taskError = {
            message: result.error || 'Unknown error',
            code: 'EXECUTION_ERROR',
            stack: result.errorStack,
          };
          await taskManager.updateTaskStatus(
            task.projectPath,
            task.id,
            'failed',
            {
              errorDetails: taskError,
              completedAt: result.completedAt,
            }
          );
        }

        // Send webhook callback if configured (fire and forget, don't block)
        if (task.pushNotificationConfig?.url) {
          this.sendWebhookCallback(task, result.status, taskOutput, taskError).catch(err => {
            console.error(`[TaskExecutor] Webhook callback failed for task ${task.id}:`, err);
          });
        }
      } else if (task.type === 'scheduled') {
        // Store result for scheduled task
        const {
          updateTaskExecution,
          updateTaskRunStatus,
        } = await import('../scheduledTaskStorage.js');
        const { onScheduledTaskComplete } = await import('../schedulerService.js');

        // Use scheduledTaskId (original task ID) for storage updates
        // task.id is the executionId, task.scheduledTaskId is the original scheduled task ID
        const scheduledTaskId = task.scheduledTaskId || task.id;
        const executionId = task.id;

        await updateTaskExecution(scheduledTaskId, executionId, {
          status: result.status === 'completed' ? 'success' : 'error',
          completedAt: result.completedAt,
          responseSummary: result.output?.substring(0, 500),
          sessionId: result.sessionId,
          error: result.error,
          errorStack: result.errorStack,
          logs: result.logs,
        });

        await updateTaskRunStatus(
          scheduledTaskId,
          result.status === 'completed' ? 'success' : 'error',
          result.error
        );

        // Notify scheduler that task execution is complete
        // This updates runningTaskCount and runningExecutions tracking
        // Pass executionId (task.id) because that's what's tracked in runningExecutions
        onScheduledTaskComplete(executionId);
      }
    } catch (error) {
      console.error(`[TaskExecutor] Error storing result:`, error);
      throw error;
    }
  }

  private updateStats(): void {
    this.stats.runningTasks = this.workers.size;
    this.stats.queuedTasks = this.taskQueue.length;
    this.stats.uptimeMs = Date.now() - this.startTime;
  }

  /**
   * Send webhook callback for completed A2A task
   */
  private async sendWebhookCallback(
    task: TaskDefinition,
    status: 'completed' | 'failed' | 'canceled',
    output?: { result: string },
    errorDetails?: { message: string; code: string; stack?: string }
  ): Promise<void> {
    if (!task.pushNotificationConfig?.url) {
      return;
    }

    const { sendTaskCompletionWebhook } = await import('../a2a/webhookService.js');

    console.info(`[TaskExecutor] Sending webhook callback for task ${task.id} to ${task.pushNotificationConfig.url}`);

    const result = await sendTaskCompletionWebhook(
      task.pushNotificationConfig,
      task.id,
      status,
      output,
      errorDetails
    );

    if (result.success) {
      console.info(`[TaskExecutor] Webhook callback sent successfully for task ${task.id} (${result.attempts} attempts)`);
    } else {
      console.error(`[TaskExecutor] Webhook callback failed for task ${task.id}: ${result.error} (${result.attempts} attempts)`);
    }
  }

  /**
   * Set up health check for a worker
   * Monitors worker execution time and logs warnings for long-running tasks
   */
  private setupWorkerHealthCheck(taskId: string, worker: Worker): void {
    // Check worker health every 30 seconds
    const healthCheckInterval = 30000;

    const healthCheckTimer = setTimeout(() => {
      const workerInstance = this.workers.get(taskId);
      if (!workerInstance) {
        return; // Worker already completed
      }

      const elapsedMs = Date.now() - workerInstance.startTime;
      const elapsedMin = Math.floor(elapsedMs / 60000);

      console.warn(
        `[TaskExecutor] Health check: Task ${taskId} has been running for ${elapsedMin}m (${elapsedMs}ms)`
      );

      // Schedule next health check
      this.setupWorkerHealthCheck(taskId, worker);
    }, healthCheckInterval);

    this.workerHealthChecks.set(taskId, healthCheckTimer);
  }
}
