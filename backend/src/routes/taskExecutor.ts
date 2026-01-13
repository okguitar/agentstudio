/**
 * Task Executor Routes
 *
 * Provides monitoring and management endpoints for the unified task executor.
 */

import express, { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getTaskExecutor, isTaskExecutorInitialized } from '../services/taskExecutor/index.js';

const router: Router = express.Router({ mergeParams: true });

// ============================================================================
// Middleware
// ============================================================================

// All routes require authentication
router.use(authMiddleware);

// ============================================================================
// GET /api/task-executor/stats - Get Executor Statistics
// ============================================================================

/**
 * Get task executor statistics and health status
 *
 * @route GET /api/task-executor/stats
 * @access Authenticated
 * @response 200 - Executor statistics
 * @response 503 - Executor not initialized
 */
router.get('/stats', async (req: express.Request, res: Response) => {
  try {
    if (!isTaskExecutorInitialized()) {
      return res.status(503).json({
        error: 'Task executor not initialized',
        code: 'EXECUTOR_NOT_INITIALIZED',
      });
    }

    const executor = getTaskExecutor();
    const stats = executor.getStats();

    res.json({
      mode: stats.mode,
      runningTasks: stats.runningTasks,
      queuedTasks: stats.queuedTasks,
      completedTasks: stats.completedTasks,
      failedTasks: stats.failedTasks,
      canceledTasks: stats.canceledTasks,
      uptimeMs: stats.uptimeMs,
      uptimeFormatted: formatUptime(stats.uptimeMs),
      healthy: executor.isHealthy(),
    });
  } catch (error) {
    console.error('[TaskExecutor API] Error getting stats:', error);
    res.status(500).json({
      error: 'Failed to get executor statistics',
      code: 'STATS_ERROR',
    });
  }
});

// ============================================================================
// GET /api/task-executor/health - Health Check
// ============================================================================

/**
 * Check if task executor is healthy
 *
 * @route GET /api/task-executor/health
 * @access Authenticated
 * @response 200 - Executor is healthy
 * @response 503 - Executor is unhealthy or not initialized
 */
router.get('/health', async (req: express.Request, res: Response) => {
  try {
    if (!isTaskExecutorInitialized()) {
      return res.status(503).json({
        healthy: false,
        reason: 'Executor not initialized',
      });
    }

    const executor = getTaskExecutor();
    const healthy = executor.isHealthy();

    if (healthy) {
      res.json({
        healthy: true,
        mode: executor.getStats().mode,
      });
    } else {
      res.status(503).json({
        healthy: false,
        reason: 'Executor reported unhealthy status',
      });
    }
  } catch (error) {
    console.error('[TaskExecutor API] Error checking health:', error);
    res.status(503).json({
      healthy: false,
      reason: 'Health check failed',
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format uptime in milliseconds to human-readable string
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours % 24 > 0) {
    parts.push(`${hours % 24}h`);
  }
  if (minutes % 60 > 0) {
    parts.push(`${minutes % 60}m`);
  }
  if (seconds % 60 > 0 || parts.length === 0) {
    parts.push(`${seconds % 60}s`);
  }

  return parts.join(' ');
}

// ============================================================================
// Export Router
// ============================================================================

export default router;
