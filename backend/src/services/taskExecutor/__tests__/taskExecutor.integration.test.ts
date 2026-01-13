/**
 * Task Executor Integration Tests
 *
 * Tests the unified task executor with A2A tasks and scheduled tasks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BuiltinTaskExecutor } from '../BuiltinExecutor.js';
import type { TaskDefinition, TaskResult } from '../types.js';

describe('TaskExecutor Integration', () => {
  let executor: BuiltinTaskExecutor;

  beforeEach(() => {
    executor = new BuiltinTaskExecutor({
      maxConcurrent: 2,
      defaultTimeoutMs: 10000,
      maxMemoryMb: 256,
    });
  });

  afterEach(async () => {
    await executor.stop();
  });

  describe('Initialization', () => {
    it('should start successfully', async () => {
      await executor.start();
      expect(executor.isHealthy()).toBe(true);
    });

    it('should report correct stats after start', async () => {
      await executor.start();
      const stats = executor.getStats();

      expect(stats.mode).toBe('builtin');
      expect(stats.runningTasks).toBe(0);
      expect(stats.queuedTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);
    });
  });

  describe('Task Submission', () => {
    beforeEach(async () => {
      await executor.start();
    });

    it('should accept a task submission', async () => {
      const task: TaskDefinition = {
        id: 'test-task-1',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Hello, world!',
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      };

      await expect(executor.submitTask(task)).resolves.not.toThrow();
    });

    it('should reject task submission when not started', async () => {
      const stoppedExecutor = new BuiltinTaskExecutor();
      const task: TaskDefinition = {
        id: 'test-task-2',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Test',
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      };

      await expect(stoppedExecutor.submitTask(task)).rejects.toThrow('Executor not started');
    });
  });

  describe('Task Cancellation', () => {
    beforeEach(async () => {
      await executor.start();
    });

    it('should cancel a queued task', async () => {
      // Submit 3 tasks (maxConcurrent is 2, so 1 should be queued)
      const tasks: TaskDefinition[] = [
        {
          id: 'task-1',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Long task 1',
          timeoutMs: 30000,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'task-2',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Long task 2',
          timeoutMs: 30000,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'task-3',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Long task 3',
          timeoutMs: 30000,
          createdAt: new Date().toISOString(),
        },
      ];

      // Submit all tasks
      for (const task of tasks) {
        await executor.submitTask(task);
      }

      // Wait a bit for queue to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to cancel task-3 (should be queued)
      const canceled = await executor.cancelTask('task-3');
      expect(canceled).toBe(true);
    });

    it('should return false when canceling non-existent task', async () => {
      const canceled = await executor.cancelTask('non-existent-task');
      expect(canceled).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should report healthy when running', async () => {
      await executor.start();
      expect(executor.isHealthy()).toBe(true);
    });

    it('should report unhealthy when stopped', async () => {
      await executor.start();
      await executor.stop();
      expect(executor.isHealthy()).toBe(false);
    });
  });

  describe('Concurrent Execution', () => {
    beforeEach(async () => {
      await executor.start();
    });

    it('should respect maxConcurrent limit', async () => {
      const maxConcurrent = 2;
      const taskCount = 5;

      // Submit more tasks than maxConcurrent
      for (let i = 0; i < taskCount; i++) {
        const task: TaskDefinition = {
          id: `concurrent-task-${i}`,
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: `Task ${i}`,
          timeoutMs: 30000,
          createdAt: new Date().toISOString(),
        };

        await executor.submitTask(task);
      }

      // Wait for queue to process
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = executor.getStats();
      // Running tasks should not exceed maxConcurrent
      expect(stats.runningTasks).toBeLessThanOrEqual(maxConcurrent);
      // Remaining tasks should be queued
      expect(stats.queuedTasks).toBeGreaterThanOrEqual(taskCount - maxConcurrent);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should stop without errors', async () => {
      await executor.start();

      // Submit a task
      const task: TaskDefinition = {
        id: 'shutdown-task',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Quick task',
        timeoutMs: 1000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Stop should complete without errors
      await expect(executor.stop()).resolves.not.toThrow();
    });

    it('should clear all resources after stop', async () => {
      await executor.start();

      // Submit tasks
      for (let i = 0; i < 3; i++) {
        const task: TaskDefinition = {
          id: `stop-task-${i}`,
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: `Task ${i}`,
          timeoutMs: 5000,
          createdAt: new Date().toISOString(),
        };

        await executor.submitTask(task);
      }

      await executor.stop();

      const stats = executor.getStats();
      expect(stats.runningTasks).toBe(0);
      expect(stats.queuedTasks).toBe(0);
    });
  });
});
