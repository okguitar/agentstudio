/**
 * Scheduled Tasks API Routes
 * 
 * RESTful API endpoints for managing scheduled tasks.
 */

import { Router, Request, Response, IRouter } from 'express';
import { z } from 'zod';
import {
  loadScheduledTasks,
  getScheduledTask,
  createScheduledTask,
  updateScheduledTask,
  deleteScheduledTask,
  toggleScheduledTask,
  getTaskExecutionHistory,
} from '../services/scheduledTaskStorage.js';
import {
  scheduleTask,
  unscheduleTask,
  rescheduleTask,
  executeTask,
  getSchedulerStatus,
  enableScheduler,
  disableScheduler,
} from '../services/schedulerService.js';

const router: IRouter = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const TaskScheduleSchema = z.object({
  type: z.enum(['interval', 'cron', 'once']),
  intervalMinutes: z.number().min(1).max(10080).optional(), // Max 1 week
  cronExpression: z.string().max(100).optional(),
  executeAt: z.string().optional(), // ISO 8601 timestamp for one-time execution
}).refine(
  data => {
    if (data.type === 'interval') return !!data.intervalMinutes;
    if (data.type === 'cron') return !!data.cronExpression;
    if (data.type === 'once') return !!data.executeAt;
    return false;
  },
  { message: 'intervalMinutes required for interval type, cronExpression required for cron type, executeAt required for once type' }
);

const ModelOverrideSchema = z.object({
  versionId: z.string().optional(),
  modelId: z.string().optional(),
}).optional();

const CreateTaskSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  agentId: z.string().min(1),
  projectPath: z.string().min(1),
  schedule: TaskScheduleSchema,
  triggerMessage: z.string().min(1).max(10000),
  enabled: z.boolean().optional(),
  modelOverride: ModelOverrideSchema,
});

const UpdateTaskSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  agentId: z.string().min(1).optional(),
  projectPath: z.string().min(1).optional(),
  schedule: TaskScheduleSchema.optional(),
  triggerMessage: z.string().min(1).max(10000).optional(),
  enabled: z.boolean().optional(),
  modelOverride: ModelOverrideSchema,
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/scheduled-tasks
 * Get all scheduled tasks
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const tasks = loadScheduledTasks();
    res.json(tasks);
  } catch (error) {
    console.error('[ScheduledTasks API] Error getting tasks:', error);
    res.status(500).json({ error: 'Failed to get scheduled tasks' });
  }
});

/**
 * GET /api/scheduled-tasks/status
 * Get scheduler status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = getSchedulerStatus();
    res.json(status);
  } catch (error) {
    console.error('[ScheduledTasks API] Error getting status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

/**
 * POST /api/scheduled-tasks/scheduler/enable
 * Enable the scheduler
 */
router.post('/scheduler/enable', (req: Request, res: Response) => {
  try {
    enableScheduler();
    const status = getSchedulerStatus();
    res.json({
      success: true,
      message: 'Scheduler enabled',
      status,
    });
  } catch (error) {
    console.error('[ScheduledTasks API] Error enabling scheduler:', error);
    res.status(500).json({ error: 'Failed to enable scheduler' });
  }
});

/**
 * POST /api/scheduled-tasks/scheduler/disable
 * Disable the scheduler
 */
router.post('/scheduler/disable', (req: Request, res: Response) => {
  try {
    disableScheduler();
    const status = getSchedulerStatus();
    res.json({
      success: true,
      message: 'Scheduler disabled',
      status,
    });
  } catch (error) {
    console.error('[ScheduledTasks API] Error disabling scheduler:', error);
    res.status(500).json({ error: 'Failed to disable scheduler' });
  }
});

/**
 * GET /api/scheduled-tasks/:id
 * Get a specific scheduled task
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const task = getScheduledTask(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('[ScheduledTasks API] Error getting task:', error);
    res.status(500).json({ error: 'Failed to get scheduled task' });
  }
});

/**
 * POST /api/scheduled-tasks
 * Create a new scheduled task
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const validation = CreateTaskSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }
    
    const task = createScheduledTask(validation.data);
    
    // Schedule if enabled
    if (task.enabled) {
      scheduleTask(task);
    }
    
    res.status(201).json(task);
  } catch (error) {
    console.error('[ScheduledTasks API] Error creating task:', error);
    res.status(500).json({ error: 'Failed to create scheduled task' });
  }
});

/**
 * PUT /api/scheduled-tasks/:id
 * Update a scheduled task
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const validation = UpdateTaskSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }
    
    const task = updateScheduledTask(req.params.id, validation.data);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Reschedule task
    if (task.enabled) {
      rescheduleTask(task.id);
    } else {
      unscheduleTask(task.id);
    }
    
    res.json(task);
  } catch (error) {
    console.error('[ScheduledTasks API] Error updating task:', error);
    res.status(500).json({ error: 'Failed to update scheduled task' });
  }
});

/**
 * DELETE /api/scheduled-tasks/:id
 * Delete a scheduled task
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    // Unschedule first
    unscheduleTask(req.params.id);
    
    const deleted = deleteScheduledTask(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[ScheduledTasks API] Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete scheduled task' });
  }
});

/**
 * POST /api/scheduled-tasks/:id/toggle
 * Toggle task enabled state
 */
router.post('/:id/toggle', (req: Request, res: Response) => {
  try {
    const task = toggleScheduledTask(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Schedule or unschedule based on new state
    if (task.enabled) {
      scheduleTask(task);
    } else {
      unscheduleTask(task.id);
    }
    
    res.json(task);
  } catch (error) {
    console.error('[ScheduledTasks API] Error toggling task:', error);
    res.status(500).json({ error: 'Failed to toggle scheduled task' });
  }
});

/**
 * POST /api/scheduled-tasks/:id/run
 * Manually run a scheduled task
 */
router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const task = getScheduledTask(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Execute task asynchronously
    executeTask(task.id).catch(error => {
      console.error(`[ScheduledTasks API] Manual execution failed for ${task.id}:`, error);
    });
    
    res.json({
      success: true,
      message: 'Task execution started',
      taskId: task.id,
    });
  } catch (error) {
    console.error('[ScheduledTasks API] Error running task:', error);
    res.status(500).json({ error: 'Failed to run scheduled task' });
  }
});

/**
 * GET /api/scheduled-tasks/:id/history
 * Get execution history for a task
 */
router.get('/:id/history', (req: Request, res: Response) => {
  try {
    const task = getScheduledTask(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    const history = getTaskExecutionHistory(req.params.id, limit);
    
    res.json(history);
  } catch (error) {
    console.error('[ScheduledTasks API] Error getting history:', error);
    res.status(500).json({ error: 'Failed to get execution history' });
  }
});

export default router;
