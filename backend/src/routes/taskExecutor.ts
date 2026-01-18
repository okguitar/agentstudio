/**
 * Task Executor Routes
 *
 * Provides monitoring and management endpoints for the unified task executor.
 */

import express, { Router, Response } from 'express';
import { z } from 'zod';
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
// GET /api/task-executor/config - Get Executor Configuration
// ============================================================================

/**
 * Get current task executor configuration
 *
 * @route GET /api/task-executor/config
 * @access Authenticated
 * @response 200 - Current configuration
 * @response 503 - Executor not initialized
 */
router.get('/config', async (req: express.Request, res: Response) => {
  try {
    if (!isTaskExecutorInitialized()) {
      return res.status(503).json({
        error: 'Task executor not initialized',
        code: 'EXECUTOR_NOT_INITIALIZED',
      });
    }

    const executor = getTaskExecutor();
    const config = executor.getConfig();

    res.json({
      maxConcurrent: config.maxConcurrent,
      defaultTimeoutMs: config.defaultTimeoutMs,
      maxMemoryMb: config.maxMemoryMb,
    });
  } catch (error) {
    console.error('[TaskExecutor API] Error getting config:', error);
    res.status(500).json({
      error: 'Failed to get executor configuration',
      code: 'CONFIG_ERROR',
    });
  }
});

// ============================================================================
// PATCH /api/task-executor/config - Update Executor Configuration
// ============================================================================

const UpdateConfigSchema = z.object({
  maxConcurrent: z.number().int().min(1).max(10).optional(),
  defaultTimeoutMs: z.number().int().min(10000).max(3600000).optional(),
  maxMemoryMb: z.number().int().min(128).max(4096).optional(),
});

/**
 * Update task executor configuration dynamically
 *
 * @route PATCH /api/task-executor/config
 * @access Authenticated
 * @body { maxConcurrent?: number, defaultTimeoutMs?: number, maxMemoryMb?: number }
 * @response 200 - Updated configuration
 * @response 400 - Invalid request body
 * @response 503 - Executor not initialized
 */
router.patch('/config', async (req: express.Request, res: Response) => {
  try {
    if (!isTaskExecutorInitialized()) {
      return res.status(503).json({
        error: 'Task executor not initialized',
        code: 'EXECUTOR_NOT_INITIALIZED',
      });
    }

    const validation = UpdateConfigSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid configuration',
        details: validation.error.errors,
      });
    }

    const executor = getTaskExecutor();
    executor.updateConfig(validation.data);

    const newConfig = executor.getConfig();

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        maxConcurrent: newConfig.maxConcurrent,
        defaultTimeoutMs: newConfig.defaultTimeoutMs,
        maxMemoryMb: newConfig.maxMemoryMb,
      },
    });
  } catch (error) {
    console.error('[TaskExecutor API] Error updating config:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      error: errorMessage,
      code: 'CONFIG_UPDATE_ERROR',
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
