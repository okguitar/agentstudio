/**
 * A2A Protocol Routes
 *
 * Implements A2A (Agent-to-Agent) protocol HTTP endpoints for external agent communication.
 *
 * Endpoints:
 * - GET  /.well-known/agent-card.json - Retrieve Agent Card (discovery)
 * - POST /messages - Send synchronous message
 * - POST /tasks - Create asynchronous task
 * - GET  /tasks/:taskId - Query task status
 * - DELETE /tasks/:taskId - Cancel task
 *
 * All endpoints require API key authentication via Authorization header.
 */

import express, { Router, Response } from 'express';
import { a2aAuth, type A2ARequest } from '../middleware/a2aAuth.js';
import { a2aRateLimiter, a2aStrictRateLimiter } from '../middleware/rateLimiting.js';
import {
  A2AMessageRequestSchema,
  A2ATaskRequestSchema,
  validateSafe,
} from '../schemas/a2a.js';
import { generateAgentCard, type ProjectContext } from '../services/a2a/agentCardService.js';
import { agentCardCache } from '../utils/agentCardCache.js';
import { AgentStorage } from '../services/agentStorage.js';
import { ProjectMetadataStorage } from '../services/projectMetadataStorage.js';
import { taskManager } from '../services/a2a/taskManager.js';
import { a2aHistoryService } from '../services/a2a/a2aHistoryService.js';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { sessionManager } from '../services/sessionManager.js';
import { handleSessionManagement } from '../utils/sessionUtils.js';
import { buildQueryOptions } from '../utils/claudeUtils.js';

const router: Router = express.Router({ mergeParams: true });

// Initialize storage services
const agentStorage = new AgentStorage();
const projectMetadataStorage = new ProjectMetadataStorage();

// ============================================================================
// Middleware: Apply authentication and rate limiting to all routes
// ============================================================================

// All routes require authentication
router.use(a2aAuth);

// Default rate limiting for all routes
router.use(a2aRateLimiter);

// ============================================================================
// GET /.well-known/agent-card.json - Agent Card Discovery
// ============================================================================

/**
 * Retrieve Agent Card for an agent
 * This is the standard A2A discovery endpoint
 *
 * @route GET /a2a/:a2aAgentId/.well-known/agent-card.json
 * @access Authenticated (API key required)
 * @rateLimit 100 requests/hour per API key
 *
 * @response 200 - Agent Card JSON
 * @response 401 - Unauthorized (invalid/missing API key)
 * @response 404 - Agent not found
 * @response 429 - Rate limit exceeded
 */
router.get('/.well-known/agent-card.json', async (req: A2ARequest, res: Response) => {
  try {
    const { a2aContext } = req;

    if (!a2aContext) {
      return res.status(500).json({
        error: 'Authentication context missing',
        code: 'AUTH_CONTEXT_MISSING',
      });
    }

    // Load agent configuration
    const agentConfig = agentStorage.getAgent(a2aContext.agentType);

    if (!agentConfig) {
      return res.status(404).json({
        error: `Agent '${a2aContext.agentType}' not found`,
        code: 'AGENT_NOT_FOUND',
      });
    }

    // Get project metadata for project name
    const projectMetadata = projectMetadataStorage.getProjectMetadata(a2aContext.workingDirectory);
    const projectName = projectMetadata?.name || a2aContext.projectId;

    // Build project context for Agent Card generation
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const projectContext: ProjectContext = {
      projectId: a2aContext.projectId,
      projectName,
      workingDirectory: a2aContext.workingDirectory,
      a2aAgentId: a2aContext.a2aAgentId,
      baseUrl,
    };

    // Try to get from cache first
    let agentCard = agentCardCache.get(agentConfig, projectContext);

    if (!agentCard) {
      // Generate Agent Card from agent configuration
      agentCard = generateAgentCard(agentConfig, projectContext);

      // Cache the generated Agent Card
      agentCardCache.set(agentConfig, projectContext, agentCard);

      console.info('[A2A] Agent Card generated and cached:', {
        a2aAgentId: a2aContext.a2aAgentId,
        agentType: a2aContext.agentType,
        skillCount: agentCard.skills.length,
      });
    } else {
      console.info('[A2A] Agent Card served from cache:', {
        a2aAgentId: a2aContext.a2aAgentId,
        agentType: a2aContext.agentType,
      });
    }

    res.json(agentCard);
  } catch (error) {
    console.error('[A2A] Error retrieving agent card:', error);
    res.status(500).json({
      error: 'Failed to retrieve agent card',
      code: 'AGENT_CARD_ERROR',
    });
  }
});

// ============================================================================
// POST /messages - Synchronous Message
// ============================================================================

/**
 * Send a synchronous message to an agent
 * The agent processes the message and returns a response immediately
 *
 * @route POST /a2a/:a2aAgentId/messages
 * @access Authenticated (API key required)
 * @rateLimit 100 requests/hour per API key
 *
 * @body {message: string, context?: Record<string, unknown>}
 * @response 200 - Message response
 * @response 400 - Invalid request
 * @response 401 - Unauthorized
 * @response 429 - Rate limit exceeded
 * @response 500 - Processing error
 */
router.post('/messages', async (req: A2ARequest, res: Response) => {
  try {
    const { a2aContext } = req;

    if (!a2aContext) {
      return res.status(500).json({
        error: 'Authentication context missing',
        code: 'AUTH_CONTEXT_MISSING',
      });
    }

    // Validate request body
    const validation = validateSafe(A2AMessageRequestSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: validation.errors,
      });
    }

    const { message, sessionId } = validation.data;
    const stream = req.query.stream === 'true' || req.headers.accept === 'text/event-stream';

    console.info('[A2A] Message received:', {
      a2aAgentId: a2aContext.a2aAgentId,
      projectId: a2aContext.projectId,
      agentType: a2aContext.agentType,
      messageLength: message.length,
      sessionId,
      stream,
    });

    // Load agent configuration
    const agentConfig = agentStorage.getAgent(a2aContext.agentType);

    if (!agentConfig) {
      return res.status(404).json({
        error: `Agent '${a2aContext.agentType}' not found`,
        code: 'AGENT_NOT_FOUND',
      });
    }

    if (!agentConfig.enabled) {
      return res.status(403).json({
        error: `Agent '${a2aContext.agentType}' is disabled`,
        code: 'AGENT_DISABLED',
      });
    }

    // Build query options for Claude using the shared utility
    // This automatically handles A2A SDK MCP server integration
    const { queryOptions } = await buildQueryOptions(
      {
        systemPrompt: agentConfig.systemPrompt || undefined,
        allowedTools: agentConfig.allowedTools || [],
        maxTurns: 30,
        workingDirectory: a2aContext.workingDirectory,
        permissionMode: 'default',
        model: 'sonnet', // Default model
      },
      a2aContext.workingDirectory,
      undefined, // mcpTools
      undefined, // permissionMode
      undefined, // model
      undefined, // claudeVersion
      undefined  // defaultEnv
    );

    // Override specific options for A2A
    // User requested includePartialMessages = false for A2A streaming to get complete messages
    queryOptions.includePartialMessages = false;

    const startTime = Date.now();

    // Handle session management (get existing or create new)
    const { claudeSession, actualSessionId } = await handleSessionManagement(
      a2aContext.agentType,
      sessionId || null,
      a2aContext.workingDirectory,
      queryOptions
    );

    if (stream) {
      // Streaming Mode (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const userMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: message }]
        }
      };

      try {
        await claudeSession.sendMessage(userMessage, async (sdkMessage: SDKMessage) => {
          // Filter out internal events if needed, but for now forward relevant ones
          // We want to forward 'assistant' messages (which will be complete blocks due to includePartialMessages=false)
          // and 'result' messages.

          const eventData = {
            ...sdkMessage,
            sessionId: actualSessionId,
            timestamp: Date.now(),
          };

          // Write to SSE stream
          res.write(`data: ${JSON.stringify(eventData)}\n\n`);

          // Persist to history
          // We fire and forget the history write to avoid blocking the stream, 
          // or we could await it if strict ordering/persistence is critical.
          // Given file I/O might be slower than network, we'll await to ensure order in file.
          try {
            if (actualSessionId) {
              await a2aHistoryService.appendEvent(a2aContext.workingDirectory, actualSessionId, eventData);
            }
          } catch (err) {
            console.error('[A2A] Failed to write history event:', err);
          }

          // Check for completion
          if (sdkMessage.type === 'result') {
            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            res.end();
          }
        });
      } catch (error) {
        console.error('[A2A] Error in streaming session:', error);
        const errorEvent = {
          type: 'error',
          error: error instanceof Error ? error.message : String(error)
        };
        res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
        res.end();
      }

    } else {
      // Synchronous Mode (Backward Compatibility)
      let fullResponse = '';
      let tokensUsed = 0;

      try {
        await new Promise<void>((resolve, reject) => {
          const userMessage = {
            type: 'user',
            message: {
              role: 'user',
              content: [{ type: 'text', text: message }]
            }
          };

          claudeSession.sendMessage(userMessage, async (sdkMessage: SDKMessage) => {
            // Persist to history for sync calls too, so they can be viewed later?
            // The user requirement specifically mentioned "calling external agent... support streaming output... and read from history".
            // It's good practice to save history for sync calls too if we want a unified history.
            const eventData = {
              ...sdkMessage,
              sessionId: actualSessionId,
              timestamp: Date.now(),
            };
            try {
              if (actualSessionId) {
                await a2aHistoryService.appendEvent(a2aContext.workingDirectory, actualSessionId, eventData);
              }
            } catch (err) {
              console.error('[A2A] Failed to write history event:', err);
            }

            // Extract assistant messages
            if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
              for (const block of sdkMessage.message.content) {
                if (block.type === 'text') {
                  fullResponse += block.text;
                }
              }
            }

            // Extract token usage if available
            if (sdkMessage.type === 'assistant' && (sdkMessage as any).usage) {
              const usage = (sdkMessage as any).usage;
              tokensUsed = (usage.input_tokens || 0) + (usage.output_tokens || 0);
            }

            // Capture session ID from SDK messages (for session confirmation)
            const sdkSessionId = (sdkMessage as any).session_id;
            if (sdkSessionId && claudeSession.getClaudeSessionId() !== sdkSessionId) {
              console.log('[DEBUG] claudeSession:', claudeSession);
              claudeSession.setClaudeSessionId(sdkSessionId);
              sessionManager.confirmSessionId(claudeSession, sdkSessionId);
              console.log(`✅ Confirmed session ${sdkSessionId} for agent: ${a2aContext.agentType}`);
            }

            // Check for completion
            if (sdkMessage.type === 'result') {
              resolve();
            }
          }).catch((err: any) => {
            reject(err);
          });
        });

        // Get the final session ID from the claudeSession object
        const finalSessionId = claudeSession.getClaudeSessionId();

        const processingTimeMs = Date.now() - startTime;

        console.info('[A2A] Message processed successfully:', {
          a2aAgentId: a2aContext.a2aAgentId,
          processingTimeMs,
          responseLength: fullResponse.length,
          tokensUsed,
          sessionId: finalSessionId,
        });

        // Return the complete response
        res.json({
          response: fullResponse || 'No response generated',
          sessionId: finalSessionId,
          metadata: {
            processingTimeMs,
            tokensUsed,
          },
        });
      } catch (error) {
        console.error('[A2A] Error calling Claude:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('[A2A] Error processing message:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to process message',
        code: 'MESSAGE_PROCESSING_ERROR',
      });
    }
  }
});

// ============================================================================
// POST /tasks - Create Asynchronous Task
// ============================================================================

/**
 * Create an asynchronous task for long-running operations
 * Returns immediately with task ID for status polling
 *
 * @route POST /a2a/:a2aAgentId/tasks
 * @access Authenticated (API key required)
 * @rateLimit 50 requests/hour per API key (stricter for task creation)
 *
 * @body {message: string, timeout?: number, context?: Record<string, unknown>}
 * @response 202 - Task created (returns task ID and status URL)
 * @response 400 - Invalid request
 * @response 401 - Unauthorized
 * @response 429 - Rate limit exceeded
 * @response 500 - Task creation error
 */
router.post('/tasks', a2aStrictRateLimiter, async (req: A2ARequest, res: Response) => {
  try {
    const { a2aContext } = req;

    if (!a2aContext) {
      return res.status(500).json({
        error: 'Authentication context missing',
        code: 'AUTH_CONTEXT_MISSING',
      });
    }

    // Validate request body
    const validation = validateSafe(A2ATaskRequestSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: validation.errors,
      });
    }

    const { message, timeout, context } = validation.data;

    console.info('[A2A] Task creation requested:', {
      a2aAgentId: a2aContext.a2aAgentId,
      projectId: a2aContext.projectId,
      agentType: a2aContext.agentType,
      timeout,
    });

    // Create task using TaskManager
    const task = await taskManager.createTask({
      workingDirectory: a2aContext.workingDirectory,
      projectId: a2aContext.projectId,
      agentId: a2aContext.agentType,
      a2aAgentId: a2aContext.a2aAgentId,
      input: {
        message,
        additionalContext: context,
      },
      timeoutMs: timeout,
    });

    res.status(202).json({
      taskId: task.id,
      status: task.status,
      checkUrl: `/a2a/${a2aContext.a2aAgentId}/tasks/${task.id}`,
    });
  } catch (error) {
    console.error('[A2A] Error creating task:', error);
    res.status(500).json({
      error: 'Failed to create task',
      code: 'TASK_CREATION_ERROR',
    });
  }
});

// ============================================================================
// GET /tasks/:taskId - Query Task Status
// ============================================================================

/**
 * Query the status of an asynchronous task
 *
 * @route GET /a2a/:a2aAgentId/tasks/:taskId
 * @access Authenticated (API key required)
 * @rateLimit 100 requests/hour per API key
 *
 * @response 200 - Task status
 * @response 401 - Unauthorized
 * @response 404 - Task not found
 * @response 429 - Rate limit exceeded
 */
router.get('/tasks/:taskId', async (req: A2ARequest, res: Response) => {
  try {
    const { a2aContext } = req;
    const { taskId } = req.params;

    if (!a2aContext) {
      return res.status(500).json({
        error: 'Authentication context missing',
        code: 'AUTH_CONTEXT_MISSING',
      });
    }

    console.info('[A2A] Task status query:', {
      a2aAgentId: a2aContext.a2aAgentId,
      projectId: a2aContext.projectId,
      taskId,
    });

    // Get task from TaskManager
    const task = await taskManager.getTask(a2aContext.workingDirectory, taskId);

    if (!task) {
      return res.status(404).json({
        error: `Task not found: ${taskId}`,
        code: 'TASK_NOT_FOUND',
      });
    }

    // Build response
    const response: any = {
      taskId: task.id,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };

    // Add optional fields if present
    if (task.startedAt) {
      response.startedAt = task.startedAt;
    }

    if (task.completedAt) {
      response.completedAt = task.completedAt;
    }

    if (task.output) {
      response.output = task.output;
    }

    if (task.errorDetails) {
      response.errorDetails = task.errorDetails;
    }

    if ((task as any).progress) {
      response.progress = (task as any).progress;
    }

    // Add progress information for running tasks
    if (task.status === 'running') {
      response.progress = {
        currentStep: 'Processing',
        percentComplete: 50, // TODO: Implement real progress tracking
      };
    }

    res.json(response);
  } catch (error) {
    console.error('[A2A] Error querying task status:', error);
    res.status(500).json({
      error: 'Failed to query task status',
      code: 'TASK_STATUS_ERROR',
    });
  }
});

// ============================================================================
// DELETE /tasks/:taskId - Cancel Task
// ============================================================================

/**
 * Cancel a running or pending task
 *
 * @route DELETE /a2a/:a2aAgentId/tasks/:taskId
 * @access Authenticated (API key required)
 * @rateLimit 100 requests/hour per API key
 *
 * @response 200 - Task canceled
 * @response 400 - Task cannot be canceled (already completed/failed)
 * @response 401 - Unauthorized
 * @response 404 - Task not found
 * @response 429 - Rate limit exceeded
 */
router.delete('/tasks/:taskId', async (req: A2ARequest, res: Response) => {
  try {
    const { a2aContext } = req;
    const { taskId } = req.params;

    if (!a2aContext) {
      return res.status(500).json({
        error: 'Authentication context missing',
        code: 'AUTH_CONTEXT_MISSING',
      });
    }

    console.info('[A2A] Task cancellation requested:', {
      a2aAgentId: a2aContext.a2aAgentId,
      projectId: a2aContext.projectId,
      taskId,
    });

    // Cancel task using TaskManager
    try {
      const task = await taskManager.cancelTask(a2aContext.workingDirectory, taskId);

      res.json({
        taskId: task.id,
        status: task.status,
        message: 'Task canceled successfully',
      });
    } catch (error: any) {
      // Handle specific error cases
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: `Task not found: ${taskId}`,
          code: 'TASK_NOT_FOUND',
        });
      }

      if (error.message.includes('Cannot cancel')) {
        return res.status(400).json({
          error: error.message,
          code: 'TASK_CANNOT_BE_CANCELED',
        });
      }

      throw error; // Re-throw for general error handler
    }
  } catch (error) {
    console.error('[A2A] Error canceling task:', error);
    res.status(500).json({
      error: 'Failed to cancel task',
      code: 'TASK_CANCELLATION_ERROR',
    });
  }
});

// ============================================================================
// Export Router
// ============================================================================

export default router;
