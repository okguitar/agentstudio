/**
 * Unified Task Executor - Factory and Initialization
 *
 * Provides a factory function to create the appropriate task executor
 * implementation based on environment configuration.
 */

import type { ITaskExecutor, TaskExecutorConfig } from './types.js';
import { BuiltinTaskExecutor } from './BuiltinExecutor.js';

// ============================================================================
// Global State
// ============================================================================

let executorInstance: ITaskExecutor | null = null;
let isInitializing = false;

// ============================================================================
// Configuration
// ============================================================================

/**
 * Load executor configuration from environment
 */
function loadConfigFromEnv(): Partial<TaskExecutorConfig> {
  const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_TASKS || '5', 10);
  const defaultTimeoutMs = parseInt(process.env.TASK_TIMEOUT_DEFAULT || '300000', 10);
  const maxMemoryMb = parseInt(process.env.TASK_MAX_MEMORY_MB || '512', 10);
  const maxRetries = parseInt(process.env.TASK_MAX_RETRIES || '0', 10);
  const retryDelayMs = parseInt(process.env.TASK_RETRY_DELAY_MS || '5000', 10);

  return {
    maxConcurrent: isNaN(maxConcurrent) ? 5 : maxConcurrent,
    defaultTimeoutMs: isNaN(defaultTimeoutMs) ? 300000 : defaultTimeoutMs,
    maxMemoryMb: isNaN(maxMemoryMb) ? 512 : maxMemoryMb,
    maxRetries: isNaN(maxRetries) ? 0 : maxRetries,
    retryDelayMs: isNaN(retryDelayMs) ? 5000 : retryDelayMs,
  };
}

/**
 * Get executor mode from environment
 */
function getExecutorMode(): string {
  return process.env.TASK_EXECUTOR_MODE || 'builtin';
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Initialize the task executor
 *
 * Creates and starts the appropriate executor implementation based on
 * TASK_EXECUTOR_MODE environment variable:
 *
 * - 'builtin' (default): Uses worker threads pool
 * - 'bullmq': Uses BullMQ with Redis (requires REDIS_URL)
 *
 * @returns Initialized task executor instance
 * @throws Error if configuration is invalid
 */
export async function initializeTaskExecutor(): Promise<ITaskExecutor> {
  // Return existing instance if already initialized
  if (executorInstance) {
    console.warn('[TaskExecutor] Already initialized, returning existing instance');
    return executorInstance;
  }

  // Prevent concurrent initialization
  if (isInitializing) {
    throw new Error('Task executor initialization already in progress');
  }

  isInitializing = true;

  try {
    const mode = getExecutorMode();
    const config = loadConfigFromEnv();

    console.info(`[TaskExecutor] Initializing with mode: ${mode}`);
    console.info(`[TaskExecutor] Config: maxConcurrent=${config.maxConcurrent}, defaultTimeoutMs=${config.defaultTimeoutMs}`);

    // Create executor based on mode
    let executor: ITaskExecutor;

    switch (mode) {
      case 'builtin':
        executor = new BuiltinTaskExecutor(config);
        break;

      case 'bullmq':
        // TODO: Implement BullMQTaskExecutor
        if (!process.env.REDIS_URL) {
          throw new Error('REDIS_URL is required for bullmq mode');
        }
        throw new Error('BullMQ mode not yet implemented. Please use builtin mode or set TASK_EXECUTOR_MODE=builtin');

      default:
        throw new Error(`Unknown task executor mode: ${mode}. Valid options: builtin, bullmq`);
    }

    // Start the executor
    await executor.start();

    executorInstance = executor;

    console.info(`[TaskExecutor] Successfully initialized with mode: ${mode}`);
    return executorInstance;
  } catch (error) {
    console.error('[TaskExecutor] Initialization failed:', error);
    isInitializing = false;
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Get the current task executor instance
 *
 * @returns Task executor instance
 * @throws Error if executor not initialized
 */
export function getTaskExecutor(): ITaskExecutor {
  if (!executorInstance) {
    throw new Error('Task executor not initialized. Call initializeTaskExecutor() first.');
  }
  return executorInstance;
}

/**
 * Check if task executor is initialized
 */
export function isTaskExecutorInitialized(): boolean {
  return executorInstance !== null;
}

/**
 * Shutdown the task executor
 *
 * Stops all running tasks and cleans up resources.
 */
export async function shutdownTaskExecutor(): Promise<void> {
  if (!executorInstance) {
    console.warn('[TaskExecutor] No executor to shutdown');
    return;
  }

  console.info('[TaskExecutor] Shutting down...');

  try {
    await executorInstance.stop();
    executorInstance = null;
    console.info('[TaskExecutor] Shutdown complete');
  } catch (error) {
    console.error('[TaskExecutor] Error during shutdown:', error);
    throw error;
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export * from './types.js';
export { BuiltinTaskExecutor } from './BuiltinExecutor.js';
