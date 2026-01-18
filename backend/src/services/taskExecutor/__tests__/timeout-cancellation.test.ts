/**
 * Task Timeout and Cancellation Tests
 *
 * Comprehensive tests for task timeout handling and cancellation scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BuiltinTaskExecutor } from '../BuiltinExecutor.js';
import type { TaskDefinition } from '../types.js';

describe('Task Timeout and Cancellation', () => {
  let executor: BuiltinTaskExecutor;

  beforeEach(async () => {
    executor = new BuiltinTaskExecutor({
      maxConcurrent: 2,
      defaultTimeoutMs: 5000, // Short timeout for testing
      maxMemoryMb: 256,
    });
    await executor.start();
  });

  afterEach(async () => {
    await executor.stop();
  });

  describe('Task Timeout', () => {
    it('should timeout task after specified duration', async () => {
      const veryShortTimeout = 500; // 500ms
      const task: TaskDefinition = {
        id: 'timeout-test-1',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Simulate long running task',
        timeoutMs: veryShortTimeout,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Wait for timeout to occur
      await new Promise(resolve => setTimeout(resolve, veryShortTimeout + 500));

      const stats = executor.getStats();
      // Task should have timed out and been marked as failed
      expect(stats.failedTasks).toBeGreaterThan(0);
    });

    it('should use default timeout when not specified', async () => {
      const taskWithoutTimeout: TaskDefinition = {
        id: 'default-timeout-test',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Test default timeout',
        timeoutMs: 0, // Use 0 to indicate default (executor will use defaultTimeoutMs)
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(taskWithoutTimeout);

      const status = await executor.getTaskStatus('default-timeout-test');
      expect(status).not.toBeNull();
    });

    it('should handle tasks with different timeouts', async () => {
      const shortTask: TaskDefinition = {
        id: 'short-timeout',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Short timeout task',
        timeoutMs: 1000,
        createdAt: new Date().toISOString(),
      };

      const longTask: TaskDefinition = {
        id: 'long-timeout',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Long timeout task',
        timeoutMs: 30000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(shortTask);
      await executor.submitTask(longTask);

      const stats = executor.getStats();
      expect(stats.runningTasks + stats.queuedTasks).toBe(2);
    });

    it('should update task status to failed on timeout', async () => {
      const timeoutMs = 800;
      const task: TaskDefinition = {
        id: 'timeout-status-test',
        type: 'a2a_async',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Task that will timeout',
        timeoutMs,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, timeoutMs + 500));

      const stats = executor.getStats();
      expect(stats.failedTasks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Task Cancellation', () => {
    it('should cancel a pending task in queue', async () => {
      // Submit more tasks than maxConcurrent to ensure some are queued
      const tasks: TaskDefinition[] = Array.from({ length: 5 }, (_, i) => ({
        id: `cancel-queue-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Task ${i}`,
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      // Wait for queue to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cancel a task that's likely in the queue
      const canceled = await executor.cancelTask('cancel-queue-4');
      expect(canceled).toBe(true);

      const stats = executor.getStats();
      expect(stats.canceledTasks).toBeGreaterThan(0);
    });

    it('should cancel a running task', async () => {
      const task: TaskDefinition = {
        id: 'cancel-running',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Long running task to cancel',
        timeoutMs: 30000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Wait for task to start
      await new Promise(resolve => setTimeout(resolve, 200));

      // Cancel the running task
      const canceled = await executor.cancelTask('cancel-running');
      expect(canceled).toBe(true);

      const stats = executor.getStats();
      expect(stats.canceledTasks).toBe(1);
    });

    it('should return false when canceling non-existent task', async () => {
      const canceled = await executor.cancelTask('non-existent-task-id');
      expect(canceled).toBe(false);
    });

    it('should handle multiple cancellations', async () => {
      const tasks: TaskDefinition[] = Array.from({ length: 6 }, (_, i) => ({
        id: `multi-cancel-${i}`,
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

      await new Promise(resolve => setTimeout(resolve, 100));

      // Cancel multiple tasks
      const cancelResults = await Promise.all([
        executor.cancelTask('multi-cancel-1'),
        executor.cancelTask('multi-cancel-3'),
        executor.cancelTask('multi-cancel-5'),
      ]);

      expect(cancelResults.every(r => r === true)).toBe(true);

      const stats = executor.getStats();
      expect(stats.canceledTasks).toBeGreaterThanOrEqual(3);
    });

    it('should allow cancellation during executor shutdown', async () => {
      const tasks: TaskDefinition[] = Array.from({ length: 3 }, (_, i) => ({
        id: `shutdown-cancel-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Task ${i}`,
        timeoutMs: 20000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      // Cancel one task before shutdown
      await executor.cancelTask('shutdown-cancel-1');

      // Shutdown should complete without hanging
      await expect(executor.stop()).resolves.not.toThrow();

      const stats = executor.getStats();
      expect(stats.runningTasks).toBe(0);
      expect(stats.queuedTasks).toBe(0);
    });
  });

  describe('Cancellation Edge Cases', () => {
    it('should handle cancellation of already completed task', async () => {
      const quickTask: TaskDefinition = {
        id: 'quick-complete',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Quick task',
        timeoutMs: 100,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(quickTask);

      // Wait for task to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try to cancel completed task
      const canceled = await executor.cancelTask('quick-complete');
      expect(canceled).toBe(false);
    });

    it('should handle cancellation immediately after submission', async () => {
      const task: TaskDefinition = {
        id: 'immediate-cancel',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Task to cancel immediately',
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Cancel immediately
      const canceled = await executor.cancelTask('immediate-cancel');
      expect(canceled).toBe(true);
    });

    it('should handle rapid submit-cancel cycles', async () => {
      for (let i = 0; i < 10; i++) {
        const task: TaskDefinition = {
          id: `rapid-cycle-${i}`,
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: `Task ${i}`,
          timeoutMs: 5000,
          createdAt: new Date().toISOString(),
        };

        await executor.submitTask(task);
        await executor.cancelTask(`rapid-cycle-${i}`);
      }

      const stats = executor.getStats();
      expect(stats.canceledTasks).toBeGreaterThan(0);
      expect(executor.isHealthy()).toBe(true);
    });
  });

  describe('Timeout vs Cancellation', () => {
    it('should prefer cancellation over timeout', async () => {
      const task: TaskDefinition = {
        id: 'cancel-vs-timeout',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'Task that will be canceled',
        timeoutMs: 2000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Cancel before timeout
      await new Promise(resolve => setTimeout(resolve, 500));
      await executor.cancelTask('cancel-vs-timeout');

      // Wait past original timeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      const stats = executor.getStats();
      expect(stats.canceledTasks).toBe(1);
      // Should not be counted as failed (timeout)
      expect(stats.failedTasks).toBe(0);
    });
  });

  describe('Health Check During Timeout/Cancellation', () => {
    it('should maintain executor health after timeouts', async () => {
      const tasks: TaskDefinition[] = Array.from({ length: 3 }, (_, i) => ({
        id: `health-timeout-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Task ${i}`,
        timeoutMs: 500, // Very short, will timeout
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      // Wait for all to timeout
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Executor should still be healthy
      expect(executor.isHealthy()).toBe(true);

      // Should be able to accept new tasks
      const newTask: TaskDefinition = {
        id: 'after-timeouts',
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: 'New task after timeouts',
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      };

      await expect(executor.submitTask(newTask)).resolves.not.toThrow();
    });

    it('should maintain executor health after cancellations', async () => {
      const tasks: TaskDefinition[] = Array.from({ length: 5 }, (_, i) => ({
        id: `health-cancel-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Task ${i}`,
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      // Cancel all tasks
      for (const task of tasks) {
        await executor.cancelTask(task.id);
      }

      // Executor should still be healthy
      expect(executor.isHealthy()).toBe(true);

      const stats = executor.getStats();
      expect(stats.canceledTasks).toBe(5);
    });
  });
});
