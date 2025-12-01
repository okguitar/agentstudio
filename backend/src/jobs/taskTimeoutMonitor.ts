/**
 * A2A Task Timeout Monitor
 *
 * Background job that periodically checks for timed-out tasks
 * and marks them as 'failed' with appropriate error messages.
 *
 * Runs every 30 seconds to scan all projects' tasks and detect
 * tasks where Date.now() - createdAt > timeoutMs.
 */

import { cleanupTimedOutTasks } from '../services/a2a/taskCleanup.js';

// ============================================================================
// Configuration
// ============================================================================

const CHECK_INTERVAL_MS = 30000; // 30 seconds

// ============================================================================
// Monitor State
// ============================================================================

let monitorInterval: NodeJS.Timeout | null = null;
let isRunning = false;

// ============================================================================
// Monitor Functions
// ============================================================================

/**
 * Check for timed-out tasks
 * Called by interval timer
 */
async function checkTimedOutTasks(): Promise<void> {
  if (isRunning) {
    console.debug('[TaskTimeoutMonitor] Previous check still running, skipping...');
    return;
  }

  isRunning = true;

  try {
    const timedOutCount = await cleanupTimedOutTasks();

    if (timedOutCount > 0) {
      console.info(`[TaskTimeoutMonitor] Check complete: ${timedOutCount} tasks timed out`);
    }
  } catch (error) {
    console.error('[TaskTimeoutMonitor] Error checking for timed-out tasks:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the task timeout monitor
 * Begins periodic checking for timed-out tasks
 */
export function startTaskTimeoutMonitor(): void {
  if (monitorInterval) {
    console.warn('[TaskTimeoutMonitor] Monitor already running');
    return;
  }

  console.info(`[TaskTimeoutMonitor] Starting monitor (check interval: ${CHECK_INTERVAL_MS}ms)`);

  // Run initial check immediately
  checkTimedOutTasks().catch(error => {
    console.error('[TaskTimeoutMonitor] Initial check failed:', error);
  });

  // Set up periodic checks
  monitorInterval = setInterval(() => {
    checkTimedOutTasks().catch(error => {
      console.error('[TaskTimeoutMonitor] Periodic check failed:', error);
    });
  }, CHECK_INTERVAL_MS);

  console.info('[TaskTimeoutMonitor] Monitor started successfully');
}

/**
 * Stop the task timeout monitor
 * Stops periodic checking (for graceful shutdown)
 */
export function stopTaskTimeoutMonitor(): void {
  if (!monitorInterval) {
    console.warn('[TaskTimeoutMonitor] Monitor not running');
    return;
  }

  console.info('[TaskTimeoutMonitor] Stopping monitor...');

  clearInterval(monitorInterval);
  monitorInterval = null;

  console.info('[TaskTimeoutMonitor] Monitor stopped');
}

/**
 * Get monitor status
 * @returns Whether monitor is running
 */
export function isTaskTimeoutMonitorRunning(): boolean {
  return monitorInterval !== null;
}
