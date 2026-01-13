/**
 * End-to-End Workflow Tests
 *
 * Complete workflow tests simulating real-world usage scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BuiltinTaskExecutor } from '../BuiltinExecutor.js';
import type { TaskDefinition, TaskResult } from '../types.js';

// Mock dependencies
vi.mock('../../a2a/taskManager.js', () => ({
  taskManager: {
    createTask: vi.fn().mockImplementation(async (data) => ({
      id: 'a2a-' + Date.now(),
      status: 'pending',
      ...data,
    })),
    updateTaskStatus: vi.fn(),
    getTask: vi.fn(),
  },
}));

vi.mock('../../scheduledTaskStorage.js', () => ({
  addTaskExecution: vi.fn(),
  updateTaskExecution: vi.fn(),
  updateTaskRunStatus: vi.fn(),
}));

describe('End-to-End Workflow Tests', () => {
  let executor: BuiltinTaskExecutor;

  beforeEach(async () => {
    executor = new BuiltinTaskExecutor({
      maxConcurrent: 3,
      defaultTimeoutMs: 20000,
      maxMemoryMb: 512,
    });
    await executor.start();
  });

  afterEach(async () => {
    await executor.stop();
  });

  describe('A2A Task Workflow', () => {
    it('should complete full A2A task lifecycle', async () => {
      const task: TaskDefinition = {
        id: 'a2a-e2e-1',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Create a new user authentication API',
        timeoutMs: 15000,
        createdAt: new Date().toISOString(),
      };

      // Step 1: Submit task
      await executor.submitTask(task);

      // Step 2: Check initial status
      let status = await executor.getTaskStatus(task.id);
      expect(status).not.toBeNull();
      expect(['pending', 'running']).toContain(status?.status);

      // Step 3: Monitor progress
      const stats = executor.getStats();
      expect(stats.runningTasks + stats.queuedTasks).toBeGreaterThan(0);

      // Step 4: Verify executor health
      expect(executor.isHealthy()).toBe(true);
    });

    it('should handle multiple A2A tasks from different sources', async () => {
      const sources = ['system-a', 'system-b', 'system-c'];
      const tasks: TaskDefinition[] = sources.map((source, i) => ({
        id: `a2a-${source}-${i}`,
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: `/tmp/${source}`,
        message: `Task from ${source}`,
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      }));

      // Submit from different sources
      for (const task of tasks) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      expect(stats.runningTasks).toBeLessThanOrEqual(3);
      expect(executor.isHealthy()).toBe(true);
    });

    it('should handle A2A task with retry workflow', async () => {
      const task: TaskDefinition = {
        id: 'a2a-retry-workflow',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Complex task that might need retry',
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      };

      // Initial submission
      await executor.submitTask(task);

      // Simulate retry scenario (cancel and resubmit)
      await new Promise(resolve => setTimeout(resolve, 500));
      await executor.cancelTask(task.id);

      // Resubmit with same ID
      await executor.submitTask(task);

      expect(executor.isHealthy()).toBe(true);
    });
  });

  describe('Scheduled Task Workflow', () => {
    it('should complete scheduled task execution workflow', async () => {
      const task: TaskDefinition = {
        id: 'scheduled-e2e-1',
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Generate weekly report',
        timeoutMs: 15000,
        maxTurns: 15,
        modelId: 'sonnet',
        permissionMode: 'bypassPermissions',
        createdAt: new Date().toISOString(),
      };

      // Submit to executor (simulating scheduler trigger)
      await executor.submitTask(task);

      // Verify submission
      const stats = executor.getStats();
      expect(stats.runningTasks + stats.queuedTasks).toBeGreaterThan(0);

      // Verify task configuration
      const status = await executor.getTaskStatus(task.id);
      expect(status).not.toBeNull();
    });

    it('should handle recurring scheduled task workflow', async () => {
      const executions = 3;
      const tasks: TaskDefinition[] = Array.from({ length: executions }, (_, i) => ({
        id: `recurring-exec-${i}`,
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: `Recurring task execution #${i + 1}`,
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      }));

      // Simulate multiple executions
      for (const task of tasks) {
        await executor.submitTask(task);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const stats = executor.getStats();
      expect(executor.isHealthy()).toBe(true);
    });

    it('should handle scheduled task with context preservation', async () => {
      const task: TaskDefinition = {
        id: 'scheduled-context',
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Task with preserved context',
        timeoutMs: 10000,
        claudeVersionId: 'claude-3.5-sonnet',
        maxTurns: 20,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Verify task was accepted with all context
      const status = await executor.getTaskStatus(task.id);
      expect(status).not.toBeNull();
    });
  });

  describe('Mixed Workflow Scenarios', () => {
    it('should handle A2A and scheduled tasks concurrently', async () => {
      const tasks: TaskDefinition[] = [];

      // Add A2A tasks
      for (let i = 0; i < 5; i++) {
        tasks.push({
          id: `mixed-a2a-${i}`,
          type: 'a2a_async',
          agentId: 'claude-code',
          projectPath: '/tmp/project',
          message: `A2A task ${i}`,
          timeoutMs: 12000,
          createdAt: new Date().toISOString(),
        });
      }

      // Add scheduled tasks
      for (let i = 0; i < 5; i++) {
        tasks.push({
          id: `mixed-scheduled-${i}`,
          type: 'scheduled',
          agentId: 'claude-code',
          projectPath: '/tmp/project',
          message: `Scheduled task ${i}`,
          timeoutMs: 12000,
          createdAt: new Date().toISOString(),
        });
      }

      // Submit in interleaved order
      for (let i = 0; i < tasks.length; i += 2) {
        await executor.submitTask(tasks[i]);
        await executor.submitTask(tasks[i + 1]);
      }

      const stats = executor.getStats();
      expect(executor.isHealthy()).toBe(true);
      expect(stats.runningTasks + stats.queuedTasks).toBe(10);
    });

    it('should handle priority-based execution', async () => {
      const highPriorityTasks: TaskDefinition[] = Array.from({ length: 3 }, (_, i) => ({
        id: `priority-high-${i}`,
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: `High priority task ${i}`,
        timeoutMs: 10000,
        priority: 10,
        createdAt: new Date().toISOString(),
      }));

      const lowPriorityTasks: TaskDefinition[] = Array.from({ length: 3 }, (_, i) => ({
        id: `priority-low-${i}`,
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: `Low priority task ${i}`,
        timeoutMs: 10000,
        priority: 1,
        createdAt: new Date().toISOString(),
      }));

      // Submit low priority first
      for (const task of lowPriorityTasks) {
        await executor.submitTask(task);
      }

      // Then submit high priority
      for (const task of highPriorityTasks) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      expect(executor.isHealthy()).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should simulate daily batch job workflow', async () => {
      const batchJobs = [
        { id: 'batch-1', name: 'Generate reports', duration: 10000 },
        { id: 'batch-2', name: 'Clean up logs', duration: 5000 },
        { id: 'batch-3', name: 'Send notifications', duration: 8000 },
        { id: 'batch-4', name: 'Update cache', duration: 6000 },
        { id: 'batch-5', name: 'Backup data', duration: 12000 },
      ];

      for (const job of batchJobs) {
        const task: TaskDefinition = {
          id: job.id,
          type: 'scheduled',
          agentId: 'claude-code',
          projectPath: '/tmp/production',
          message: `Execute: ${job.name}`,
          timeoutMs: job.duration,
          createdAt: new Date().toISOString(),
        };

        await executor.submitTask(task);
      }

      // Wait for queue to process
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = executor.getStats();
      expect(stats.runningTasks).toBe(3); // maxConcurrent
      expect(stats.queuedTasks).toBe(2);
      expect(executor.isHealthy()).toBe(true);
    });

    it('should simulate API request burst scenario', async () => {
      // Simulate sudden burst of A2A requests
      const burstSize = 20;
      const tasks: TaskDefinition[] = Array.from({ length: burstSize }, (_, i) => ({
        id: `api-burst-${i}`,
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/api-requests',
        message: `Handle API request ${i}`,
        timeoutMs: 8000,
        createdAt: new Date().toISOString(),
      }));

      const startTime = Date.now();

      // Submit all rapidly
      await Promise.all(tasks.map(task => executor.submitTask(task)));

      const submissionTime = Date.now() - startTime;

      // Should handle burst quickly
      expect(submissionTime).toBeLessThan(1000);

      const stats = executor.getStats();
      expect(executor.isHealthy()).toBe(true);
    });

    it('should simulate gradual workload increase', async () => {
      const phases = [2, 5, 10, 15, 20];
      let totalSubmitted = 0;

      for (const phaseSize of phases) {
        const tasks: TaskDefinition[] = Array.from({ length: phaseSize }, (_, i) => ({
          id: `gradual-phase-${phaseSize}-${i}`,
          type: 'scheduled',
          agentId: 'claude-code',
          projectPath: '/tmp/project',
          message: `Phase ${phaseSize} task ${i}`,
          timeoutMs: 10000,
          createdAt: new Date().toISOString(),
        }));

        for (const task of tasks) {
          await executor.submitTask(task);
          totalSubmitted++;
        }

        // Verify health after each phase
        expect(executor.isHealthy()).toBe(true);

        const stats = executor.getStats();
        expect(stats.runningTasks + stats.queuedTasks).toBe(totalSubmitted);
      }
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should recover from task failure and continue processing', async () => {
      const failingTask: TaskDefinition = {
        id: 'workflow-fail',
        type: 'scheduled',
        agentId: 'invalid',
        projectPath: '/invalid',
        message: 'This will fail',
        timeoutMs: 3000,
        createdAt: new Date().toISOString(),
      };

      const recoveryTask: TaskDefinition = {
        id: 'workflow-recover',
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Recovery task',
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      };

      // Submit failing task
      await executor.submitTask(failingTask);

      // Submit recovery task
      await executor.submitTask(recoveryTask);

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 4000));

      const stats = executor.getStats();
      expect(stats.failedTasks).toBeGreaterThan(0);
      expect(executor.isHealthy()).toBe(true);
    });

    it('should handle cancellation and resubmission workflow', async () => {
      const task: TaskDefinition = {
        id: 'workflow-cancel-resubmit',
        type: 'a2a_async',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Task to cancel and resubmit',
        timeoutMs: 15000,
        createdAt: new Date().toISOString(),
      };

      // Submit
      await executor.submitTask(task);

      // Cancel
      const canceled = await executor.cancelTask(task.id);
      expect(canceled).toBe(true);

      // Resubmit
      await executor.submitTask(task);

      // Verify final state
      const stats = executor.getStats();
      expect(stats.canceledTasks).toBeGreaterThan(0);
      expect(executor.isHealthy()).toBe(true);
    });
  });

  describe('Monitoring and Observability', () => {
    it('should provide accurate stats throughout workflow', async () => {
      const initialStats = executor.getStats();

      const tasks: TaskDefinition[] = Array.from({ length: 10 }, (_, i) => ({
        id: `workflow-stats-${i}`,
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: `Task ${i}`,
        timeoutMs: 8000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      const afterSubmissionStats = executor.getStats();

      // Verify stats are accurate
      expect(afterSubmissionStats.runningTasks + afterSubmissionStats.queuedTasks)
        .toBeGreaterThan(initialStats.runningTasks + initialStats.queuedTasks);

      expect(afterSubmissionStats.uptimeMs).toBe(initialStats.uptimeMs);
    });

    it('should handle rapid status queries during execution', async () => {
      const task: TaskDefinition = {
        id: 'workflow-query-stress',
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Task for status queries',
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(task);

      // Perform rapid status queries
      const queries = 50;
      for (let i = 0; i < queries; i++) {
        await executor.getTaskStatus(task.id);
      }

      // Executor should still be healthy
      expect(executor.isHealthy()).toBe(true);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle resource exhaustion gracefully', async () => {
      // Submit many tasks to exhaust resources
      const tasks: TaskDefinition[] = Array.from({ length: 100 }, (_, i) => ({
        id: `degradation-${i}`,
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: `Resource test task ${i}`,
        timeoutMs: 10000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of tasks) {
        await executor.submitTask(task);
      }

      const stats = executor.getStats();
      expect(stats.runningTasks).toBeLessThanOrEqual(3); // maxConcurrent
      expect(stats.queuedTasks).toBeGreaterThan(0);
      expect(executor.isHealthy()).toBe(true);
    });

    it('should maintain service during partial failures', async () => {
      const mixedTasks: TaskDefinition[] = Array.from({ length: 10 }, (_, i) => ({
        id: `partial-fail-${i}`,
        type: i % 3 === 0 ? 'scheduled' : 'a2a_async',
        agentId: i % 2 === 0 ? 'invalid' : 'claude-code',
        projectPath: i % 2 === 0 ? '/invalid' : '/tmp/project',
        message: `Task ${i}`,
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      }));

      for (const task of mixedTasks) {
        await executor.submitTask(task).catch(() => {});
      }

      // Service should remain available
      const emergencyTask: TaskDefinition = {
        id: 'emergency-task',
        type: 'scheduled',
        agentId: 'claude-code',
        projectPath: '/tmp/project',
        message: 'Emergency task during failures',
        timeoutMs: 5000,
        createdAt: new Date().toISOString(),
      };

      await executor.submitTask(emergencyTask);

      expect(executor.isHealthy()).toBe(true);
    });
  });
});
