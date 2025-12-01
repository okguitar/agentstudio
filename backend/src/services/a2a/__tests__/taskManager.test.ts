/**
 * Unit tests for TaskManager service
 *
 * Tests task creation, state transitions, and validation logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { TaskManager } from '../taskManager';
import { TaskStatus } from '../../../types/a2a';

// Test configuration
const TEST_PROJECT_ID = 'test-project-task-manager';
const TEST_TASKS_DIR = path.join(process.cwd(), 'projects', TEST_PROJECT_ID, '.a2a', 'tasks');

describe('TaskManager', () => {
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

  describe('createTask', () => {
    it('should create a task with pending status', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      expect(task.id).toBeDefined();
      expect(task.status).toBe('pending');
      expect(task.projectId).toBe(TEST_PROJECT_ID);
      expect(task.agentId).toBe('test-agent');
      expect(task.a2aAgentId).toBe('a2a-test-agent-id');
      expect(task.input.message).toBe('Test task');
      expect(task.timeoutMs).toBe(300000); // Default 5 minutes
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should create a task with custom timeout', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
        timeoutMs: 600000, // 10 minutes
      });

      expect(task.timeoutMs).toBe(600000);
    });

    it('should persist task to file system', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      // Check file exists
      const taskFilePath = path.join(TEST_TASKS_DIR, `${task.id}.json`);
      const fileExists = await fs
        .access(taskFilePath)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);

      // Check file content
      const fileContent = await fs.readFile(taskFilePath, 'utf-8');
      const savedTask = JSON.parse(fileContent);

      expect(savedTask.id).toBe(task.id);
      expect(savedTask.status).toBe('pending');
    });
  });

  describe('getTask', () => {
    it('should retrieve an existing task', async () => {
      const createdTask = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      const retrievedTask = await taskManager.getTask(TEST_PROJECT_ID, createdTask.id);

      expect(retrievedTask).not.toBeNull();
      expect(retrievedTask?.id).toBe(createdTask.id);
      expect(retrievedTask?.status).toBe('pending');
    });

    it('should return null for non-existent task', async () => {
      const task = await taskManager.getTask(TEST_PROJECT_ID, 'non-existent-task-id');

      expect(task).toBeNull();
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status from pending to running', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      const updatedTask = await taskManager.updateTaskStatus(
        TEST_PROJECT_ID,
        task.id,
        'running',
        {
          startedAt: new Date().toISOString(),
        }
      );

      expect(updatedTask.status).toBe('running');
      expect(updatedTask.startedAt).toBeDefined();
      expect(updatedTask.updatedAt).not.toBe(task.updatedAt);
    });

    it('should update task status from running to completed', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      // First update to running
      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      // Then update to completed
      const completedTask = await taskManager.updateTaskStatus(
        TEST_PROJECT_ID,
        task.id,
        'completed',
        {
          completedAt: new Date().toISOString(),
          output: {
            result: 'Task completed successfully',
          },
        }
      );

      expect(completedTask.status).toBe('completed');
      expect(completedTask.completedAt).toBeDefined();
      expect(completedTask.output).toBeDefined();
      expect(completedTask.output?.result).toBe('Task completed successfully');
    });

    it('should update task status from running to failed', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      // First update to running
      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      // Then update to failed
      const failedTask = await taskManager.updateTaskStatus(
        TEST_PROJECT_ID,
        task.id,
        'failed',
        {
          completedAt: new Date().toISOString(),
          errorDetails: {
            message: 'Task failed',
            code: 'TEST_ERROR',
          },
        }
      );

      expect(failedTask.status).toBe('failed');
      expect(failedTask.errorDetails).toBeDefined();
      expect(failedTask.errorDetails?.message).toBe('Task failed');
      expect(failedTask.errorDetails?.code).toBe('TEST_ERROR');
    });

    it('should throw error for invalid state transition (pending to completed)', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      await expect(
        taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'completed')
      ).rejects.toThrow('Invalid state transition');
    });

    it('should throw error for invalid state transition (completed to running)', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      // Update to running then completed
      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'completed', {
        completedAt: new Date().toISOString(),
      });

      // Try to transition from completed to running (invalid)
      await expect(
        taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running')
      ).rejects.toThrow('Invalid state transition');
    });

    it('should throw error for non-existent task', async () => {
      // First create a task to ensure directory exists
      await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: { message: 'Test task' },
      });

      // Now try to update non-existent task
      await expect(
        taskManager.updateTaskStatus(TEST_PROJECT_ID, 'non-existent-task', 'running')
      ).rejects.toThrow('Task not found');
    });
  });

  describe('cancelTask', () => {
    it('should cancel a pending task', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      const canceledTask = await taskManager.cancelTask(TEST_PROJECT_ID, task.id);

      expect(canceledTask.status).toBe('canceled');
      expect(canceledTask.completedAt).toBeDefined();
    });

    it('should cancel a running task', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      // Update to running
      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      const canceledTask = await taskManager.cancelTask(TEST_PROJECT_ID, task.id);

      expect(canceledTask.status).toBe('canceled');
    });

    it('should throw error when canceling a completed task', async () => {
      const task = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent',
        a2aAgentId: 'a2a-test-agent-id',
        input: {
          message: 'Test task',
        },
      });

      // Complete the task
      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'completed', {
        completedAt: new Date().toISOString(),
      });

      // Try to cancel
      await expect(
        taskManager.cancelTask(TEST_PROJECT_ID, task.id)
      ).rejects.toThrow('Cannot cancel task');
    });
  });

  describe('listTasks', () => {
    it('should list all tasks for a project', async () => {
      // Create multiple tasks
      const task1 = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent-1',
        a2aAgentId: 'a2a-test-agent-id',
        input: { message: 'Task 1' },
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const task2 = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent-2',
        a2aAgentId: 'a2a-test-agent-id',
        input: { message: 'Task 2' },
      });

      const tasks = await taskManager.listTasks(TEST_PROJECT_ID);

      expect(tasks).toHaveLength(2);

      // Verify both tasks are in the list (order doesn't matter for this basic test)
      const taskMessages = tasks.map(t => t.input.message);
      expect(taskMessages).toContain('Task 1');
      expect(taskMessages).toContain('Task 2');

      // Verify newest first (Task 2 should come before Task 1)
      const task2Index = tasks.findIndex(t => t.id === task2.id);
      const task1Index = tasks.findIndex(t => t.id === task1.id);
      expect(task2Index).toBeLessThan(task1Index);
    });

    it('should filter tasks by status', async () => {
      // Create tasks with different statuses
      const task1 = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent-1',
        a2aAgentId: 'a2a-test-agent-id',
        input: { message: 'Task 1' },
      });

      const task2 = await taskManager.createTask({
        projectId: TEST_PROJECT_ID,
        agentId: 'test-agent-2',
        a2aAgentId: 'a2a-test-agent-id',
        input: { message: 'Task 2' },
      });

      // Update task2 to running
      await taskManager.updateTaskStatus(TEST_PROJECT_ID, task2.id, 'running', {
        startedAt: new Date().toISOString(),
      });

      // List only pending tasks
      const pendingTasks = await taskManager.listTasks(TEST_PROJECT_ID, 'pending');

      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].id).toBe(task1.id);

      // List only running tasks
      const runningTasks = await taskManager.listTasks(TEST_PROJECT_ID, 'running');

      expect(runningTasks).toHaveLength(1);
      expect(runningTasks[0].id).toBe(task2.id);
    });

    it('should return empty array for project with no tasks', async () => {
      const tasks = await taskManager.listTasks('non-existent-project');

      expect(tasks).toEqual([]);
    });
  });

  describe('State Transition Validation', () => {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      pending: ['running', 'canceled'],
      running: ['completed', 'failed', 'canceled'],
      completed: [],
      failed: [],
      canceled: [],
    };

    Object.entries(validTransitions).forEach(([fromStatus, toStatuses]) => {
      describe(`from ${fromStatus}`, () => {
        toStatuses.forEach((toStatus) => {
          it(`should allow transition to ${toStatus}`, async () => {
            const task = await taskManager.createTask({
              projectId: TEST_PROJECT_ID,
              agentId: 'test-agent',
              a2aAgentId: 'a2a-test-agent-id',
              input: { message: 'Test task' },
            });

            // Set initial status to reach fromStatus via valid path
            if (fromStatus === 'running') {
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running');
            } else if (fromStatus === 'completed') {
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running');
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'completed');
            } else if (fromStatus === 'failed') {
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running');
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'failed');
            } else if (fromStatus === 'canceled') {
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'canceled');
            }

            // Test transition
            await expect(
              taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, toStatus as TaskStatus)
            ).resolves.not.toThrow();
          });
        });

        // Test invalid transitions
        const allStatuses: TaskStatus[] = ['pending', 'running', 'completed', 'failed', 'canceled'];
        const invalidStatuses = allStatuses.filter((s) => !toStatuses.includes(s) && s !== fromStatus);

        invalidStatuses.forEach((toStatus) => {
          it(`should reject transition to ${toStatus}`, async () => {
            const task = await taskManager.createTask({
              projectId: TEST_PROJECT_ID,
              agentId: 'test-agent',
              a2aAgentId: 'a2a-test-agent-id',
              input: { message: 'Test task' },
            });

            // Set initial status to reach fromStatus via valid path
            if (fromStatus === 'running') {
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running');
            } else if (fromStatus === 'completed') {
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running');
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'completed');
            } else if (fromStatus === 'failed') {
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'running');
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'failed');
            } else if (fromStatus === 'canceled') {
              await taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, 'canceled');
            }

            // Test invalid transition
            await expect(
              taskManager.updateTaskStatus(TEST_PROJECT_ID, task.id, toStatus as TaskStatus)
            ).rejects.toThrow('Invalid state transition');
          });
        });
      });
    });
  });
});
