/**
 * Integration tests for TaskManager with file locking
 *
 * Tests concurrent operations and file system atomicity
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { TaskManager } from '../taskManager';

// Test configuration
const TEST_PROJECT_ID = 'test-project-task-integration';
const TEST_TASKS_DIR = path.join(process.cwd(), 'projects', TEST_PROJECT_ID, '.a2a', 'tasks');

describe('TaskManager Integration Tests', () => {
  let taskManager: TaskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
  });

  afterEach(async () => {
    // Clean up test tasks directory
    try {
      await fs.rm(path.join(process.cwd(), 'projects', TEST_PROJECT_ID), {
        recursive: true,
        force: true,
      });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  describe('Concurrent Updates with File Locking', () => {
    it('should handle concurrent status updates without data corruption', async () => {
      // Create a task
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test concurrent updates',
        },
      });

      // First update to running
      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      // Simulate concurrent updates (both trying to complete/fail)
      // Due to file locking, one will complete, the other will fail
      const updatePromises = [
        taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'completed', {
          completedAt: new Date().toISOString(),
          output: {
            result: 'Completed from update 1',
          },
        }),
        taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'failed', {
          completedAt: new Date().toISOString(),
          errorDetails: {
            message: 'Failed from update 2',
            code: 'TEST_ERROR',
          },
        }),
      ];

      // Wait for both updates
      const results = await Promise.allSettled(updatePromises);

      // At least one should succeed (file locking ensures consistency)
      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(succeeded.length).toBeGreaterThanOrEqual(1);
      expect(succeeded.length + failed.length).toBe(2);

      // Verify final task state is consistent
      const finalTask = await taskManager.getTask(TEST_PROJECT_ID, task.id);

      expect(finalTask).not.toBeNull();
      expect(['completed', 'failed'].includes(finalTask!.status)).toBe(true);

      // Verify file is not corrupted
      const taskFilePath = path.join(TEST_TASKS_DIR, `${task.id}.json`);
      const fileContent = await fs.readFile(taskFilePath, 'utf-8');
      const savedTask = JSON.parse(fileContent); // Should parse without error

      expect(savedTask.id).toBe(task.id);
    });

    it('should handle multiple concurrent task creations', async () => {
      // Create multiple tasks concurrently
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        taskManager.createTask({
          projectId: TEST_PROJECT_ID,
          agentId: `test-agent-${i}`,
          a2aAgentId: 'a2a-test-agent-id',
          input: {
            message: `Task ${i}`,
          },
        })
      );

      const tasks = await Promise.all(createPromises);

      // Verify all tasks were created with unique IDs
      const taskIds = new Set(tasks.map((t) => t.id));
      expect(taskIds.size).toBe(5);

      // Verify all tasks exist in file system
      for (const task of tasks) {
        const taskFilePath = path.join(TEST_TASKS_DIR, `${task.id}.json`);
        const fileExists = await fs
          .access(taskFilePath)
          .then(() => true)
          .catch(() => false);

        expect(fileExists).toBe(true);
      }

      // Verify all tasks are retrievable
      const retrievedTasks = await taskManager.listTasks(TEST_PROJECT_ID);
      expect(retrievedTasks.length).toBe(5);
    });

    it('should handle concurrent cancellation attempts', async () => {
      // Create a task
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test concurrent cancellation',
        },
      });

      // Update to running
      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      // Try to cancel multiple times concurrently
      const cancelPromises = Array.from({ length: 3 }, () =>
        taskManager.cancelTask(TEST_PROJECT_ID, task.id)
      );

      const results = await Promise.allSettled(cancelPromises);

      // All should either succeed or fail gracefully
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBe('canceled');
        } else {
          // If it fails, it should be because task was already canceled or invalid transition
          expect(
            result.reason.message.includes('Cannot cancel') ||
            result.reason.message.includes('Invalid state transition')
          ).toBe(true);
        }
      });

      // Verify final state is canceled
      const finalTask = await taskManager.getTask(TEST_PROJECT_ID, task.id);
      expect(finalTask?.status).toBe('canceled');
    });

    it('should maintain data integrity during rapid sequential updates', async () => {
      // Create a task
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test rapid updates',
        },
      });

      // Perform rapid sequential valid updates
      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'completed', {
        completedAt: new Date().toISOString(),
        output: {
          result: 'Task completed',
        },
      });

      // Verify final state
      const finalTask = await taskManager.getTask(TEST_PROJECT_ID, task.id);

      expect(finalTask?.status).toBe('completed');
      expect(finalTask?.startedAt).toBeDefined();
      expect(finalTask?.completedAt).toBeDefined();
      expect(finalTask?.output?.result).toBe('Task completed');

      // Verify file is valid JSON
      const taskFilePath = path.join(TEST_TASKS_DIR, `${task.id}.json`);
      const fileContent = await fs.readFile(taskFilePath, 'utf-8');
      const savedTask = JSON.parse(fileContent);

      expect(savedTask.status).toBe('completed');
    });

    it('should handle file locking when reading and writing simultaneously', async () => {
      // Create a task
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test simultaneous read/write',
        },
      });

      // Start an update (which acquires lock)
      const updatePromise = taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      // Try to read while update is in progress
      const readPromise = taskManager.getTask(TEST_PROJECT_ID, task.id);

      // Both should complete without error
      const [updatedTask, readTask] = await Promise.all([updatePromise, readPromise]);

      expect(updatedTask).toBeDefined();
      expect(readTask).toBeDefined();

      // Final state should be consistent
      const finalTask = await taskManager.getTask(TEST_PROJECT_ID, task.id);
      expect(finalTask?.status).toBe('running');
    });
  });

  describe('File System Edge Cases', () => {
    it('should handle missing task directory gracefully', async () => {
      const tasks = await taskManager.listTasks('non-existent-project');

      expect(tasks).toEqual([]);
    });

    it('should create task directory if it does not exist', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test directory creation',
        },
      });

      // Verify directory was created
      const dirExists = await fs
        .access(TEST_TASKS_DIR)
        .then(() => true)
        .catch(() => false);

      expect(dirExists).toBe(true);

      // Verify task file exists
      const taskFilePath = path.join(TEST_TASKS_DIR, `${task.id}.json`);
      const fileExists = await fs
        .access(taskFilePath)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should handle corrupted task file gracefully', async () => {
      // Create a task
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test corrupted file handling',
        },
      });

      // Corrupt the task file
      const taskFilePath = path.join(TEST_TASKS_DIR, `${task.id}.json`);
      await fs.writeFile(taskFilePath, 'INVALID JSON{{{', 'utf-8');

      // Try to read the task (should throw error)
      await expect(taskManager.getTask(TEST_PROJECT_ID, task.id)).rejects.toThrow();
    });
  });

  describe('Task Lifecycle Scenarios', () => {
    it('should support complete task lifecycle from creation to completion', async () => {
      // Create task
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Complete lifecycle test',
        },
        timeoutMs: 600000,
      });

      expect(task.status).toBe('pending');

      // Start task
      const runningTask = await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      expect(runningTask.status).toBe('running');
      expect(runningTask.startedAt).toBeDefined();

      // Complete task
      const completedTask = await taskManager.updateTaskStatus(
        TEST_PROJECT_ID,
        task.id,
        'completed',
        {
          completedAt: new Date().toISOString(),
          output: {
            result: 'Task completed successfully',
            artifacts: [
              {
                type: 'file',
                name: 'result.txt',
                data: 'Task output data',
              },
            ],
          },
        }
      );

      expect(completedTask.status).toBe('completed');
      expect(completedTask.completedAt).toBeDefined();
      expect(completedTask.output).toBeDefined();
      expect(completedTask.output?.artifacts).toHaveLength(1);

      // Verify persisted state
      const finalTask = await taskManager.getTask(TEST_PROJECT_ID, task.id);

      expect(finalTask?.status).toBe('completed');
      expect(finalTask?.output?.result).toBe('Task completed successfully');
    });

    it('should support task failure with error details', async () => {
      // Create and start task
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Task that will fail',
        },
      });

      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      // Fail the task
      const failedTask = await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'failed', {
        completedAt: new Date().toISOString(),
        errorDetails: {
          message: 'Task failed due to test error',
          code: 'TEST_ERROR',
          stack: 'Error: Test error\n  at test (test.ts:123)',
        },
      });

      expect(failedTask.status).toBe('failed');
      expect(failedTask.errorDetails).toBeDefined();
      expect(failedTask.errorDetails?.message).toBe('Task failed due to test error');
      expect(failedTask.errorDetails?.code).toBe('TEST_ERROR');
      expect(failedTask.errorDetails?.stack).toContain('Error: Test error');
    });

    it('should support early task cancellation', async () => {
      // Create task
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Task to be canceled',
        },
      });

      // Cancel immediately (while still pending)
      const canceledTask = await taskManager.cancelTask(TEST_PROJECT_ID, task.id);

      expect(canceledTask.status).toBe('canceled');
      expect(canceledTask.completedAt).toBeDefined();

      // Verify cannot transition from canceled
      await expect(
        taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running')
      ).rejects.toThrow('Invalid state transition');
    });
  });
});
