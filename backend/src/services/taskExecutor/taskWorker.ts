/**
 * Task Worker - Executes tasks in isolated worker threads
 *
 * This worker runs in a separate thread and handles:
 * 1. Building query options for Claude SDK
 * 2. Executing the agent task
 * 3. Collecting logs and results
 * 4. Reporting results back to main thread
 */

import { parentPort, workerData } from 'worker_threads';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { buildQueryOptions } from '../../utils/claudeUtils.js';
import { AgentStorage } from '../../services/agentStorage.js';
import type { TaskDefinition, TaskResult } from './types.js';

// ============================================================================
// Types
// ============================================================================

interface WorkerMessage {
  type: 'log' | 'progress' | 'complete' | 'error';
  data?: unknown;
}

interface ExecutionLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Worker Execution
// ============================================================================

/**
 * Main execution function
 */
async function executeTask(task: TaskDefinition): Promise<TaskResult> {
  const startTime = Date.now();
  const logs: ExecutionLogEntry[] = [];

  const addLog = (
    level: ExecutionLogEntry['level'],
    type: string,
    message: string,
    data?: Record<string, unknown>
  ) => {
    const log: ExecutionLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      type,
      message,
      data,
    };
    logs.push(log);

    // Send log to parent process for real-time monitoring
    parentPort?.postMessage({
      type: 'log',
      data: log,
    } as WorkerMessage);
  };

  try {
    addLog('info', 'system', `Starting task execution: ${task.id}`);
    addLog('info', 'system', `Task type: ${task.type}`);
    addLog('info', 'system', `Agent: ${task.agentId}`);
    addLog('info', 'system', `Project: ${task.projectPath}`);
    addLog('info', 'system', `Message: ${task.message.substring(0, 100)}...`);

    // Load agent configuration
    const agentStorage = new AgentStorage();
    const agent = agentStorage.getAgent(task.agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${task.agentId}`);
    }

    addLog('info', 'system', `Agent loaded: ${agent.name}`);

    // Determine model to use
    // Model priority: task.modelId > project/provider config (resolved by buildQueryOptions)
    // If task.modelId is not specified, let resolveConfig determine from project/system defaults
    const modelToUse = task.modelId;
    addLog('info', 'system', `Model: ${modelToUse || 'auto (from project/system)'}`);

    // Determine permission mode
    const permissionMode = task.permissionMode || 'bypassPermissions';
    addLog('info', 'system', `Permission mode: ${permissionMode}`);

    // Build query options
    addLog('info', 'system', 'Building query options...');

    const { queryOptions } = await buildQueryOptions(
      agent,
      task.projectPath,
      undefined, // mcpTools
      permissionMode,
      modelToUse,
      task.claudeVersionId,
      undefined, // defaultEnv
      undefined, // userEnv
      undefined, // sessionIdForAskUser
      undefined  // agentIdForAskUser
    );

    // Set max turns
    queryOptions.maxTurns = task.maxTurns || agent.maxTurns || 10;

    addLog('info', 'system', `Max turns: ${queryOptions.maxTurns}`);

    // Execute query
    addLog('info', 'system', 'Starting Claude query...');

    let fullResponse = '';
    let sessionId: string | undefined;

    for await (const message of query({
      prompt: task.message,
      options: queryOptions,
    })) {
      // Capture session ID
      if (message.session_id && !sessionId) {
        sessionId = message.session_id;
        addLog('info', 'system', `Session ID: ${sessionId}`);
      }

      // Process different message types
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
            addLog('debug', 'assistant', block.text.substring(0, 200));
          } else if (block.type === 'tool_use') {
            addLog('info', 'tool_use', `Tool: ${block.name}`);
          }
        }
      } else if (message.type === 'result') {
        addLog('info', 'result', `Query completed`, {
          costUsd: (message as any).total_cost_usd,
          durationMs: (message as any).duration_ms,
          numTurns: (message as any).num_turns,
        });
      }
    }

    const executionTimeMs = Date.now() - startTime;
    addLog('info', 'system', `Task completed in ${executionTimeMs}ms`);

    return {
      taskId: task.id,
      status: 'completed',
      output: fullResponse,
      sessionId,
      completedAt: new Date().toISOString(),
      executionTimeMs,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    addLog('error', 'system', `Task failed: ${errorMessage}`, { stack: errorStack });

    return {
      taskId: task.id,
      status: 'failed',
      error: errorMessage,
      errorStack,
      completedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
      logs,
    };
  }
}

// ============================================================================
// Worker Entry Point
// ============================================================================

/**
 * Worker entry point - receives task data and executes it
 */
async function main() {
  try {
    const task = workerData as TaskDefinition;

    if (!task || !task.id) {
      throw new Error('Invalid task data received');
    }

    // Execute the task
    const result = await executeTask(task);

    // Send result back to parent
    parentPort?.postMessage({
      type: 'complete',
      data: result,
    } as WorkerMessage);
  } catch (error) {
    // Send error back to parent
    parentPort?.postMessage({
      type: 'error',
      data: {
        taskId: workerData?.id || 'unknown',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date().toISOString(),
        executionTimeMs: 0,
      },
    } as WorkerMessage);
  }
}

// Start execution
main().catch((err) => {
  console.error('[TaskWorker] Fatal error:', err);
  process.exit(1);
});
