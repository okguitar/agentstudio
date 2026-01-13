/**
 * A2A Async Task Integration Tests
 *
 * Tests A2A (Agent-to-Agent) async task execution through the unified executor.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BuiltinTaskExecutor } from '../BuiltinExecutor.js';
import type { TaskDefinition } from '../types.js';

// Mock the dependencies
vi.mock('../../a2a/taskManager.js', () => ({
  taskManager: {
    createTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    getTask: vi.fn(),
  },
}));

describe('A2A Async Task Execution', () => {
  let executor: BuiltinTaskExecutor;

  beforeEach(async () => {
    executor = new BuiltinTaskExecutor({
      maxConcurrent: 3,
      defaultTimeoutMs: 15000,
      maxMemoryMb: 512,
    });
    await executor.start();
  });

  afterEach(async () => {
    await executor.stop();
  });

  describe('A2A Task Submission', () => {
    it('should accept A2A async task', async () => {
      const task: TaskDefinition = {
        id: 'a2a-task-1',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Generate a REST API for user management',
        timeoutMs: 30000,
        createdAt: new Date().toISOString(),
      };

      await expect(executor.submitTask(task)).resolves.not.toThrow();

      const stats = executor.getStats();
      expect(stats.queuedTasks + stats.runningTasks).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple A2A tasks concurrently', async () => {
      const tasks: TaskDefinition[] = Array.from({ length: 5 }, (_, i) => ({
        id: `a2a-task-${i}`,
        type: 'a2a_async' as const,
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: `Task ${i}: Implement feature ${i}`,
        timeoutMs: 20000,
        createdAt: new Date().toISOString(),
      }));

      // Submit all tasks
      for (const task of tasks) {
        await executor.submitTask(task);
      }

      // Wait for queue to process
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = executor.getStats();
      expect(stats.runningTasks).toBeLessThanOrEqual(3); // maxConcurrent
      expect(stats.queuedTasks).toBeGreaterThan(0);
    });

    it('should respect A2A task-specific timeout', async () => {
      const shortTask: TaskDefinition = {
        id: 'a2a-short',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Quick task',
        timeoutMs: 1000, // Very short timeout
        createdAt: new Date().toISOString(),
      };

      const longTask: TaskDefinition = {
        id: 'a2a-long',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Long task',
        timeoutMs: 60000, // Long timeout
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(shortTask);
      await executor.submitTask(longTask);

      const stats = executor.getStats();
      expect(stats.runningTasks + stats.queuedTasks).toBe(2);
    });
  });

  describe('A2A Task Priority', () => {
    it('should handle priority field in tasks', async () => {
      const highPriorityTask: TaskDefinition = {
        id: 'a2a-high-priority',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Critical task',
        timeoutMs: 10000,
        priority: 10, // High priority
        createdAt: new Date().toISOString(),
      };

      const lowPriorityTask: TaskDefinition = {
        id: 'a2a-low-priority',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Non-critical task',
        timeoutMs: 10000,
        priority: 1, // Low priority
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(lowPriorityTask);
      await executor.submitTask(highPriorityTask);

      const stats = executor.getStats();
      expect(stats.runningTasks + stats.queuedTasks).toBe(2);
    });
  });

  describe('A2A Task Context', () => {
    it('should handle tasks with additional context', async () => {
      const taskWithContext: TaskDefinition = {
        id: 'a2a-with-context',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Refactor the authentication module',
        timeoutMs: 25000,
        modelId: 'sonnet',
        claudeVersionId: 'claude-3.5-sonnet',
        maxTurns: 20,
        permissionMode: 'bypassPermissions',
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(taskWithContext);

      const stats = executor.getStats();
      expect(stats.runningTasks + stats.queuedTasks).toBe(1);
    });
  });

  describe('A2A Task Lifecycle', () => {
    it('should track task through execution lifecycle', async () => {
      const task: TaskDefinition = {
        id: 'a2a-lifecycle',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Test task',
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      };

      // Initial state
      let stats = executor.getStats();
      const initialCompleted = stats.completedTasks;
      const initialFailed = stats.failedTasks;

      await executor.submitTask(task);

      // Task submitted
      stats = executor.getStats();
      expect(stats.runningTasks + stats.queuedTasks).toBeGreaterThanOrEqual(1);
    });

    it('should handle task status queries', async () => {
      const task: TaskDefinition = {
        id: 'a2a-status-check',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Status check task',
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Query status
      const status = await executor.getTaskStatus(task.id);
      expect(status).not.toBeNull();
      expect(status?.taskId).toBe(task.id);
      expect(['pending', 'running']).toContain(status?.status);
    });
  });

  describe('A2A Error Scenarios', () => {
    it('should handle invalid A2A task gracefully', async () => {
      const invalidTask = {
        id: 'a2a-invalid',
        type: 'a2a_async',
        // Missing required fields
        agentId: '',
        projectPath: '',
        message: '',
        timeoutMs: -1,
        createdAt: new Date().toISOString(),
      } as TaskDefinition;

      // Should not crash
      await executor.submitTask(invalidTask);

      const stats = executor.getStats();
      // Executor should still be healthy
      expect(executor.isHealthy()).toBe(true);
    });

    it('should handle concurrent A2A task failures', async () => {
      const tasks: TaskDefinition[] = Array.from({ length: 3 }, (_, i) => ({
        id: `a2a-fail-${i}`,
        type: 'a2a_async' as const,
        agentId: 'non-existent-agent',
        projectPath: '/invalid/path',
        message: `Fail task ${i}`,
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      }));

      // Submit all tasks
      for (const task of tasks) {
        await executor.submitTask(task).catch(err => {
          // Expected to fail
          expect(err).toBeDefined();
        });
      }

      // Executor should still be operational
      expect(executor.isHealthy()).toBe(true);
    });
  });

  describe('A2A Task Cancellation', () => {
    it('should cancel running A2A task', async () => {
      const task: TaskDefinition = {
        id: 'a2a-cancel-test',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Long running task',
        timeoutMs: 30000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Wait a bit for task to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cancel the task
      const canceled = await executor.cancelTask(task.id);
      expect(canceled).toBe(true);

      const stats = executor.getStats();
      expect(stats.canceledTasks).toBeGreaterThan(0);
    });

    it('should cancel queued A2A task', async () => {
      // Submit more tasks than maxConcurrent
      const tasks: TaskDefinition[] = Array.from({ length: 10 }, (_, i) => ({
        id: `a2a-queue-cancel-${i}`,
        type: 'a2a_async' as const,
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: `Task ${i}`,
        timeoutMs: 15000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      // Wait for queue to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to cancel a later task (likely queued)
      const canceled = await executor.cancelTask('a2a-queue-cancel-8');
      expect(canceled).toBe(true);
    });
  });

  describe('A2A Performance', () => {
    it('should handle burst of A2A task submissions', async () => {
      const burstSize = 20;
      const tasks: TaskDefinition[] = Array.from({ length: burstSize }, (_, i) => ({
        id: `a2a-burst-${i}`,
        type: 'a2a_async' as const,
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: `Burst task ${i}`,
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      }));

      const startTime = Date.now();

      // Submit all tasks as fast as possible
      await Promise.all(tasks.map(task => executor.submitTask(task)));

      const submissionTime = Date.now() - startTime;

      // Should complete quickly (< 1 second for submissions)
      expect(submissionTime).toBeLessThan(1000);

      const stats = executor.getStats();
      expect(stats.runningTasks).toBeLessThanOrEqual(3); // maxConcurrent
      expect(stats.queuedTasks).toBeGreaterThan(0);
    });

    it('should maintain executor health under load', async () => {
      const loadTasks: TaskDefinition[] = Array.from({ length: 15 }, (_, i) => ({
        id: `a2a-load-${i}`,
        type: 'a2a_async' as const,
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: `Load test task ${i}`,
        timeoutMs: 20000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of loadTasks) {
        await executor.submitTask(task);
      }

      // Executor should remain healthy
      expect(executor.isHealthy()).toBe(true);

      const stats = executor.getStats();
      expect(stats.mode).toBe('builtin');
      expect(stats.uptimeMs).toBeGreaterThan(0);
    });
  });
});
