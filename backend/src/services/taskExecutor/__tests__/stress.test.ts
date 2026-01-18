/**
 * Load and Stress Tests
 *
 * Tests the executor under heavy load and stress conditions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BuiltinTaskExecutor } from '../BuiltinExecutor.js';
import type { TaskDefinition } from '../types.js';

describe('Load and Stress Tests', () => {
  let executor: BuiltinTaskExecutor;

  beforeEach(async () => {
    executor = new BuiltinTaskExecutor({
      maxConcurrent: 5,
      defaultTimeoutMs: 30000,
      maxMemoryMb: 512,
    });
    await executor.start();
  });

  afterEach(async () => {
    await executor.stop();
  });

  describe('High Load Scenarios', () => {
    it('should handle 100 concurrent task submissions', async () => {
      const taskCount = 100;
      const tasks: TaskDefinition[] = Array.from({ length: taskCount }, (_, i) => ({
        id: `load-100-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Load test task ${i}`,
        timeoutMs: 15000,
        createdAt: new Date().toISOString(),
      }));

      const startTime = Date.now();

      // Submit all tasks
      await Promise.all(tasks.map(task => executor.submitTask(task)));

      const submissionTime = Date.now() - startTime;

      const stats = executor.getStats();

      // Should complete submissions quickly
      expect(submissionTime).toBeLessThan(2000);

      // Should respect concurrency limits
      expect(stats.runningTasks).toBeLessThanOrEqual(5);
      expect(stats.queuedTasks).toBeGreaterThanOrEqual(taskCount - 5);

      // Executor should remain healthy
      expect(executor.isHealthy()).toBe(true);
    });

    it('should handle sustained load over time', async () => {
      const batches = 5;
      const tasksPerBatch = 10;

      for (let batch = 0; batch < batches; batch++) {
        const tasks: TaskDefinition[] = Array.from({ length: tasksPerBatch }, (_, i) => ({
          id: `sustained-${batch}-${i}`,
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: `Batch ${batch} task ${i}`,
          timeoutMs: 5000,
          createdAt: new Date().toISOString(),
        }));

        for (const task of tasks) {
          await executor.submitTask(task);
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const stats = executor.getStats();
      const totalSubmitted = batches * tasksPerBatch;

      expect(stats.runningTasks + stats.queuedTasks).toBeLessThanOrEqual(totalSubmitted);
      expect(executor.isHealthy()).toBe(true);
    });

    it('should handle burst submissions', async () => {
      const burstCount = 50;
      const tasks: TaskDefinition[] = Array.from({ length: burstCount }, (_, i) => ({
        id: `burst-${i}`,
        type: 'a2a_async',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Burst task ${i}`,
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      }));

      const startTime = Date.now();

      // Submit all in rapid succession
      for (const task of tasks) {
        executor.submitTask(task).catch(err => {
          // Don't fail test on individual errors
          console.error('Task submission error:', err);
        });
      }

      const burstTime = Date.now() - startTime;

      // Should handle burst quickly
      expect(burstTime).toBeLessThan(500);

      const stats = executor.getStats();
      expect(stats.runningTasks + stats.queuedTasks).toBeGreaterThan(0);
      expect(executor.isHealthy()).toBe(true);
    });
  });

  describe('Memory Stress', () => {
    it('should handle many queued tasks without memory issues', async () => {
      const largeQueueSize = 200;
      const tasks: TaskDefinition[] = Array.from({ length: largeQueueSize }, (_, i) => ({
        id: `memory-queue-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Task ${i} with some additional data to consume memory`,
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      expect(stats.queuedTasks).toBe(largeQueueSize - 5); // 5 running
      expect(executor.isHealthy()).toBe(true);

      // Verify queue is processing
      await new Promise(resolve => setTimeout(resolve, 500));
      const laterStats = executor.getStats();
      expect(laterStats.runningTasks + laterStats.queuedTasks).toBeLessThanOrEqual(largeQueueSize);
    });

    it('should handle tasks with large payloads', async () => {
      const largeMessage = 'x'.repeat(10000); // 10KB message

      const tasks: TaskDefinition[] = Array.from({ length: 10 }, (_, i) => ({
        id: `large-payload-${i}`,
        type: 'a2a_async',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: largeMessage,
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      expect(executor.isHealthy()).toBe(true);
      expect(stats.runningTasks + stats.queuedTasks).toBe(10);
    });
  });

  describe('Concurrency Limits', () => {
    it('should strictly enforce maxConcurrent limit', async () => {
      const maxConcurrent = 5;
      const taskCount = 50;

      const tasks: TaskDefinition[] = Array.from({ length: taskCount }, (_, i) => ({
        id: `concurrent-limit-${i}`,
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

      // Wait for queue to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = executor.getStats();

      // Should never exceed maxConcurrent
      expect(stats.runningTasks).toBeLessThanOrEqual(maxConcurrent);

      // Rest should be queued
      expect(stats.queuedTasks).toBeGreaterThanOrEqual(taskCount - maxConcurrent);
    });

    it('should process queue as workers become available', async () => {
      const taskCount = 15;
      const maxConcurrent = 5;

      const tasks: TaskDefinition[] = Array.from({ length: taskCount }, (_, i) => ({
        id: `queue-process-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Task ${i}`,
        timeoutMs: 1000, // Short duration
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      const initialStats = executor.getStats();
      const initialQueued = initialStats.queuedTasks;

      // Wait for some tasks to complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      const laterStats = executor.getStats();

      // Queue should be processing
      expect(laterStats.queuedTasks).toBeLessThan(initialQueued);
    });
  });

  describe('Rapid Start/Stop', () => {
    it('should handle rapid start/stop cycles', async () => {
      for (let i = 0; i < 5; i++) {
        const testExecutor = new BuiltinTaskExecutor({
          maxConcurrent: 2,
          defaultTimeoutMs: 5000,
        });

        await testExecutor.start();
        expect(testExecutor.isHealthy()).toBe(true);

        await testExecutor.stop();
        expect(testExecutor.isHealthy()).toBe(false);
      }
    });

    it('should handle shutdown during heavy load', async () => {
      const taskCount = 100;
      const tasks: TaskDefinition[] = Array.from({ length: taskCount }, (_, i) => ({
        id: `shutdown-load-${i}`,
        type: 'scheduled',
        agentId: 'test-agent',
        projectPath: '/tmp/test',
        message: `Task ${i}`,
        timeoutMs: 30000,
        createdAt: new Date().toISOString(),
      }));

      // Submit many tasks
      for (const task of tasks) {
        executor.submitTask(task).catch(() => {});
      }

      // Shutdown while under load
      await expect(executor.stop()).resolves.not.toThrow();

      const stats = executor.getStats();
      expect(stats.runningTasks).toBe(0);
      expect(stats.queuedTasks).toBe(0);
    });
  });

  describe('Mixed Workload', () => {
    it('should handle mixed A2A and scheduled tasks', async () => {
      const tasks: TaskDefinition[] = [];

      // Add A2A tasks
      for (let i = 0; i < 25; i++) {
        tasks.push({
          id: `mixed-a2a-${i}`,
          type: 'a2a_async',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: `A2A task ${i}`,
          timeoutMs: 10000,
          createdAt: new Date().toISOString(),
        });
      }

      // Add scheduled tasks
      for (let i = 0; i < 25; i++) {
        tasks.push({
          id: `mixed-scheduled-${i}`,
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: `Scheduled task ${i}`,
          timeoutMs: 10000,
          createdAt: new Date().toISOString(),
        });
      }

      // Submit in random order
      const shuffled = tasks.sort(() => Math.random() - 0.5);

      for (const task of shuffled) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      expect(executor.isHealthy()).toBe(true);
      expect(stats.runningTasks + stats.queuedTasks).toBe(50);
    });

    it('should handle tasks with varying timeouts', async () => {
      const timeoutVariations = [1000, 5000, 10000, 20000, 30000];
      const tasks: TaskDefinition[] = [];

      for (const timeout of timeoutVariations) {
        for (let i = 0; i < 10; i++) {
          tasks.push({
            id: `timeout-${timeout}-${i}`,
            type: 'scheduled',
            agentId: 'test-agent',
            projectPath: '/tmp/test',
            message: `Task with ${timeout}ms timeout`,
            timeoutMs: timeout,
            createdAt: new Date().toISOString(),
          });
        }
      }

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      expect(executor.isHealthy()).toBe(true);
      expect(stats.runningTasks + stats.queuedTasks).toBe(50);
    });
  });

  describe('Long Running Tests', () => {
    it('should maintain stability over extended period', async () => {
      const duration = 3000; // 3 seconds of sustained load
      const startTime = Date.now();

      while (Date.now() - startTime < duration) {
        const task: TaskDefinition = {
          id: `extended-${Date.now()}`,
          type: 'scheduled',
          agentId: 'test-agent',
          projectPath: '/tmp/test',
          message: 'Task',
          timeoutMs: 5000,
          createdAt: new Date().toISOString(),
        };

        await executor.submitTask(task).catch(() => {});

        // Small delay between submissions
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Should remain healthy
      expect(executor.isHealthy()).toBe(true);

      const stats = executor.getStats();
      expect(stats.uptimeMs).toBeGreaterThan(0);
    });

    it('should handle many status queries under load', async () => {
      const tasks: TaskDefinition[] = Array.from({ length: 20 }, (_, i) => ({
        id: `query-stress-${i}`,
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

      // Perform many status queries
      for (let i = 0; i < 100; i++) {
        const randomTaskId = `query-stress-${Math.floor(Math.random() * 20)}`;
        await executor.getTaskStatus(randomTaskId).catch(() => {});
      }

      expect(executor.isHealthy()).toBe(true);
    });
  });
});
