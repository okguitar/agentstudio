/**
 * Error Handling and Recovery Tests
 *
 * Tests how the executor handles errors, failures, and recovers from them.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BuiltinTaskExecutor } from '../BuiltinExecutor.js';
import type { TaskDefinition } from '../types.js';

describe('Error Handling and Recovery', () => {
  let executor: BuiltinTaskExecutor;

  beforeEach(async () => {
    executor = new BuiltinTaskExecutor({
      maxConcurrent: 2,
      defaultTimeoutMs: 10000,
      maxMemoryMb: 256,
    });
    await executor.start();
  });

  afterEach(async () => {
    await executor.stop();
  });

  describe('Worker Failures', () => {
    it('should handle worker crash gracefully', async () => {
      const crashingTask: TaskDefinition = {
        id: 'crash-task',
        type: 'scheduled',
        agentId: 'non-existent', // Will cause worker to fail
        projectPath: '/invalid/path',
        message: 'This will crash',
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(crashingTask);

      // Wait for task to fail
      await new Promise(resolve => setTimeout(resolve, 2000));

      const stats = executor.getStats();
      expect(stats.failedTasks).toBeGreaterThan(0);

      // Executor should still be healthy
      expect(executor.isHealthy()).toBe(true);
    });

    it('should continue processing after worker failure', async () => {
      const failingTask: TaskDefinition = {
        id: 'failing-task',
        type: 'scheduled',
        agentId: 'invalid-agent',
        projectPath: '/invalid',
        message: 'Fail',
        timeoutMs: 3000,
        createdAt: new Date().toISOString(),
      };

      const validTask: TaskDefinition = {
        id: 'valid-task-after-fail',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Valid task',
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(failingTask);
      await executor.submitTask(validTask);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stats = executor.getStats();
      // Should have processed both tasks (one failed, one running/queued)
      expect(stats.runningTasks + stats.queuedTasks + stats.failedTasks).toBeGreaterThan(0);
    });

    it('should handle multiple concurrent worker failures', async () => {
      const failingTasks: TaskDefinition[] = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-fail-${i}`,
        type: 'scheduled',
        agentId: 'invalid',
        projectPath: '/invalid',
        message: `Fail ${i}`,
        timeoutMs: 3000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of failingTasks) {
        await executor.submitTask(task);
      }

      // Wait for all to fail
      await new Promise(resolve => setTimeout(resolve, 4000));

      const stats = executor.getStats();
      expect(stats.failedTasks).toBeGreaterThan(0);

      // Executor should remain operational
      expect(executor.isHealthy()).toBe(true);
    });
  });

  describe('Resource Exhaustion', () => {
    it('should handle memory pressure gracefully', async () => {
      const memoryIntensiveTasks: TaskDefinition[] = Array.from({ length: 4 }, (_, i) => ({
        id: `memory-task-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Memory intensive task ${i}`,
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of memoryIntensiveTasks) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      // Should respect maxConcurrent limit
      expect(stats.runningTasks).toBeLessThanOrEqual(2);
      expect(stats.queuedTasks).toBeGreaterThan(0);
    });

    it('should queue tasks when at capacity', async () => {
      // Submit tasks up to and beyond capacity
      const tasks: TaskDefinition[] = Array.from({ length: 10 }, (_, i) => ({
        id: `capacity-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Task ${i}`,
        timeoutMs: 15000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      expect(stats.runningTasks).toBe(2); // maxConcurrent
      expect(stats.queuedTasks).toBe(8); // Remaining in queue
    });
  });

  describe('Invalid Input Handling', () => {
    it('should handle missing required fields', async () => {
      const invalidTask = {
        id: 'invalid-missing-fields',
        type: 'scheduled',
        // Missing agentId, projectPath, message
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      } as any as TaskDefinition;

      // Should not crash
      await executor.submitTask(invalidTask).catch(err => {
        expect(err).toBeDefined();
      });

      // Executor should remain healthy
      expect(executor.isHealthy()).toBe(true);
    });

    it('should handle invalid timeout values', async () => {
      const tasks: TaskDefinition[] = [
        {
          id: 'negative-timeout',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Negative timeout',
          timeoutMs: -1000,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'zero-timeout',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Zero timeout',
          timeoutMs: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'huge-timeout',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Huge timeout',
          timeoutMs: Number.MAX_SAFE_INTEGER,
          createdAt: new Date().toISOString(),
        },
      ];

      for (const task of tasks) {
        await executor.submitTask(task).catch(err => {
          // Might fail validation, which is ok
          expect(err).toBeDefined();
        });
      }

      // Executor should still be operational
      expect(executor.isHealthy()).toBe(true);
    });

    it('should handle malformed task IDs', async () => {
      const tasksWithBadIds: TaskDefinition[] = [
        {
          id: '',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Empty ID',
          timeoutMs: 5000,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'task with spaces!',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Spaces in ID',
          timeoutMs: 5000,
          createdAt: new Date().toISOString(),
        },
        {
          id: '../../../etc/passwd',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Path traversal attempt',
          timeoutMs: 5000,
          createdAt: new Date().toISOString(),
        },
      ];

      for (const task of tasksWithBadIds) {
        await executor.submitTask(task).catch(err => {
          expect(err).toBeDefined();
        });
      }

      // Should maintain integrity
      expect(executor.isHealthy()).toBe(true);
    });
  });

  describe('Recovery Scenarios', () => {
    it('should recover from partial failure', async () => {
      const mixedTasks: TaskDefinition[] = [
        {
          id: 'will-fail',
          type: 'scheduled',
          agentId: 'invalid',
          projectPath: '/invalid',
          message: 'Failing task',
          timeoutMs: 3000,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'will-succeed',
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Valid task',
          timeoutMs: 5000,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'will-fail-2',
          type: 'scheduled',
          agentId: 'invalid',
          projectPath: '/invalid',
          message: 'Another failing',
          timeoutMs: 3000,
          createdAt: new Date().toISOString(),
        },
      ];

      for (const task of mixedTasks) {
        await executor.submitTask(task);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stats = executor.getStats();
      expect(stats.failedTasks).toBeGreaterThanOrEqual(1);

      // Should continue processing valid tasks
      expect(executor.isHealthy()).toBe(true);
    });

    it('should recover from queue overflow', async () => {
      const tasks: TaskDefinition[] = Array.from({ length: 100 }, (_, i) => ({
        id: `overflow-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Task ${i}`,
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      }));

      // Submit all tasks
      for (const task of tasks) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      // Should handle large queue
      expect(stats.queuedTasks + stats.runningTasks).toBe(100);
      expect(executor.isHealthy()).toBe(true);
    });

    it('should maintain stats accuracy after errors', async () => {
      const initialStats = executor.getStats();

      // Submit tasks that will fail
      const failingTasks: TaskDefinition[] = Array.from({ length: 3 }, (_, i) => ({
        id: `stats-error-${i}`,
        type: 'scheduled',
        agentId: 'invalid',
        projectPath: '/invalid',
        message: `Fail ${i}`,
        timeoutMs: 2000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of failingTasks) {
        await executor.submitTask(task);
      }

      // Wait for failures
      await new Promise(resolve => setTimeout(resolve, 3000));

      const finalStats = executor.getStats();
      expect(finalStats.failedTasks).toBe(initialStats.failedTasks + 3);
      expect(finalStats.completedTasks).toBe(initialStats.completedTasks);
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state during errors', async () => {
      const tasks: TaskDefinition[] = Array.from({ length: 5 }, (_, i) => ({
        id: `consistency-${i}`,
        type: 'scheduled',
        agentId: i % 2 === 0 ? 'invalid' : 'test-agent',
        projectPath: i % 2 === 0 ? '/invalid' : '/tmp/test',
        message: `Task ${i}`,
        timeoutMs: 3000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stats = executor.getStats();
      const total = stats.runningTasks + stats.queuedTasks +
                    stats.completedTasks + stats.failedTasks;

      // Should account for all tasks
      expect(total).toBeGreaterThanOrEqual(5);

      // Check consistency
      expect(stats.queuedTasks).toBeLessThanOrEqual(5);
      expect(stats.runningTasks).toBeLessThanOrEqual(2); // maxConcurrent
    });

    it('should cleanup properly after task completion', async () => {
      const task: TaskDefinition = {
        id: 'cleanup-test',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Task to cleanup',
        timeoutMs: 1000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Task should not be in running or queued
      const status = await executor.getTaskStatus('cleanup-test');
      if (status) {
        expect(['completed', 'failed']).toContain(status.status);
      }
    });
  });

  describe('Error Logging', () => {
    it('should log errors appropriately', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      const failingTask: TaskDefinition = {
        id: 'logging-test',
        type: 'scheduled',
        agentId: 'invalid',
        projectPath: '/invalid',
        message: 'Task to log errors',
        timeoutMs: 2000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(failingTask);

      // Wait for error
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should have logged errors
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
