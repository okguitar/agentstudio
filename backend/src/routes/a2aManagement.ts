/**
 * A2A Management Routes
 *
 * These routes are for the management UI and use user authentication (authMiddleware)
 * rather than A2A API key authentication.
 *
 * Routes:
 * - GET /api/a2a/mapping/:projectPath - Get A2A agent mapping for project
 * - GET /api/a2a/agent-card/:projectPath - Get A2A agent card for project
 * - GET /api/a2a/tasks/:projectPath - Get A2A tasks for project
 * - DELETE /api/a2a/tasks/:projectPath/:taskId - Cancel A2A task
 * - GET /api/a2a/api-keys/:projectPath - Get API keys for project
 * - POST /api/a2a/api-keys/:projectPath - Create API key for project
 * - DELETE /api/a2a/api-keys/:projectPath/:keyId - Delete API key for project
 * - GET /api/a2a/config/:projectPath - Get A2A config for project
 * - PUT /api/a2a/config/:projectPath - Update A2A config for project
 */

import express, { Router, Request, Response } from 'express';
import { getOrCreateA2AId } from '../services/a2a/agentMappingService.js';
import { taskManager } from '../services/a2a/taskManager.js';
import { generateAgentCard, type ProjectContext } from '../services/a2a/agentCardService.js';
import { AgentStorage } from '../services/agentStorage.js';
import { generateApiKey, listApiKeysWithDecryption, revokeApiKey } from '../services/a2a/apiKeyService.js';
import { a2aHistoryService } from '../services/a2a/a2aHistoryService.js';
import { loadA2AConfig, saveA2AConfig } from '../services/a2a/a2aConfigService.js';
import type { A2AConfig } from '../types/a2a.js';
import { DEFAULT_A2A_CONFIG } from '../types/a2a.js';
import fs from 'fs/promises';
import path from 'path';

const router: Router = express.Router();

// Initialize storage services
const globalAgentStorage = new AgentStorage();

// ============================================================================
// GET /api/a2a/mapping/:projectPath - Get A2A agent mapping for project
// ============================================================================

router.get('/mapping/:projectPath', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    // Convert project path to project ID for storage
    const projectId = `proj_${Buffer.from(decodedProjectPath).toString('base64').replace(/[+/=]/g, '').slice(-12)}`;

    // Get the default agent type for this project
    const agentType = 'claude-code';

    // Get or create A2A agent ID
    const a2aAgentId = await getOrCreateA2AId(projectId, agentType, decodedProjectPath);

    // Return mapping information
    const mapping = {
      a2aAgentId,
      projectId,
      agentType,
      workingDirectory: decodedProjectPath,
    };

    res.json(mapping);
  } catch (error) {
    console.error('Error getting A2A agent mapping:', error);
    res.status(500).json({
      error: 'Failed to get A2A agent mapping',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// GET /api/a2a/agent-card/:projectPath - Get A2A agent card for project
// ============================================================================

router.get('/agent-card/:projectPath', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    // Convert project path to project ID for storage
    const projectId = `proj_${Buffer.from(decodedProjectPath).toString('base64').replace(/[+/=]/g, '').slice(-12)}`;

    // Get the default agent type for this project
    const agentType = 'claude-code';

    // Get or create A2A agent ID
    const a2aAgentId = await getOrCreateA2AId(projectId, agentType, decodedProjectPath);

    // Load agent configuration
    const agentConfig = globalAgentStorage.getAgent(agentType);
    if (!agentConfig) {
      return res.status(404).json({
        error: `Agent '${agentType}' not found`,
        code: 'AGENT_NOT_FOUND',
      });
    }

    // Build project context for Agent Card generation
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const projectContext: ProjectContext = {
      projectId,
      projectName: decodedProjectPath.split('/').pop() || decodedProjectPath,
      workingDirectory: decodedProjectPath,
      a2aAgentId,
      baseUrl,
    };

    // Generate Agent Card
    const agentCard = generateAgentCard(agentConfig, projectContext);

    res.json(agentCard);
  } catch (error) {
    console.error('Error getting A2A agent card:', error);
    res.status(500).json({
      error: 'Failed to get A2A agent card',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// GET /api/a2a/tasks/:projectPath - Get A2A tasks for project
// ============================================================================

router.get('/tasks/:projectPath', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    // Convert project path to project ID for storage
    const projectId = `proj_${Buffer.from(decodedProjectPath).toString('base64').replace(/[+/=]/g, '').slice(-12)}`;

    // Get all tasks for this project
    const tasks = await taskManager.listTasks(projectId);

    res.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Error getting A2A tasks:', error);
    res.status(500).json({
      error: 'Failed to get A2A tasks',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// DELETE /api/a2a/tasks/:projectPath/:taskId - Cancel A2A task for project
// ============================================================================

router.delete('/tasks/:projectPath/:taskId', async (req: Request, res: Response) => {
  try {
    const { projectPath, taskId } = req.params;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    // Convert project path to project ID for storage
    const projectId = `proj_${Buffer.from(decodedProjectPath).toString('base64').replace(/[+/=]/g, '').slice(-12)}`;

    // Cancel the task
    const task = await taskManager.cancelTask(projectId, taskId);

    res.json({
      taskId: task.id,
      status: task.status,
      message: 'Task canceled successfully',
    });
  } catch (error: any) {
    console.error('Error canceling A2A task:', error);

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: `Task not found: ${req.params.taskId}`,
        code: 'TASK_NOT_FOUND',
      });
    }

    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({
        error: error.message,
        code: 'TASK_CANNOT_BE_CANCELED',
      });
    }

    res.status(500).json({
      error: 'Failed to cancel A2A task',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// GET /api/a2a/api-keys/:projectPath - Get API keys for project
// ============================================================================

router.get('/api-keys/:projectPath', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    // Get all API keys with decrypted values
    const apiKeys = await listApiKeysWithDecryption(decodedProjectPath);

    // Return keys with full decrypted key for display
    const sanitizedKeys = apiKeys.map(key => ({
      id: key.id,
      projectId: key.projectId,
      description: key.description,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      key: key.decryptedKey || null, // Full key for display
    }));

    res.json({ apiKeys: sanitizedKeys });
  } catch (error) {
    console.error('Error getting API keys:', error);
    res.status(500).json({
      error: 'Failed to get API keys',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// POST /api/a2a/api-keys/:projectPath - Create API key for project
// ============================================================================

router.post('/api-keys/:projectPath', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;
    const { description } = req.body;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    if (!description) {
      return res.status(400).json({
        error: 'Description is required',
        code: 'MISSING_DESCRIPTION',
      });
    }

    // Generate API key
    const { key, keyData } = await generateApiKey(decodedProjectPath, description);

    // Return key data (include plaintext key only on creation)
    res.status(201).json({
      ...keyData,
      key, // Include plaintext key only on creation
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({
      error: 'Failed to create API key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// DELETE /api/a2a/api-keys/:projectPath/:keyId - Delete API key for project
// ============================================================================

router.delete('/api-keys/:projectPath/:keyId', async (req: Request, res: Response) => {
  try {
    const { projectPath, keyId } = req.params;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    // Revoke API key
    const success = await revokeApiKey(decodedProjectPath, keyId);

    if (!success) {
      return res.status(404).json({
        error: 'API key not found',
        code: 'KEY_NOT_FOUND',
      });
    }

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({
      error: 'Failed to revoke API key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// GET /api/a2a/config/:projectPath - Get A2A config for project
// ============================================================================

router.get('/config/:projectPath', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    // Load config using the service (returns default config if file doesn't exist)
    const config = await loadA2AConfig(decodedProjectPath);
    
    if (config === null) {
      // loadA2AConfig returns null only on unexpected errors
      return res.status(500).json({
        error: 'Failed to load A2A config',
        code: 'LOAD_ERROR',
      });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error getting A2A config:', error);
    res.status(500).json({
      error: 'Failed to get A2A config',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// PUT /api/a2a/config/:projectPath - Update A2A config for project
// ============================================================================

router.put('/config/:projectPath', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;
    const config = req.body;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    // Validate config
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        error: 'Invalid config',
        code: 'INVALID_CONFIG',
      });
    }

    // Save config using the service (handles directory creation and file locking)
    await saveA2AConfig(decodedProjectPath, config);

    res.json(config);
  } catch (error) {
    console.error('Error updating A2A config:', error);
    res.status(500).json({
      error: 'Failed to update A2A config',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// POST /api/a2a/import-projects/:projectPath - Import projects as external agents
// ============================================================================

router.post('/import-projects/:projectPath', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.params;
    const { projectPaths } = req.body;

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    // Validate input
    if (!projectPaths || !Array.isArray(projectPaths) || projectPaths.length === 0) {
      return res.status(400).json({
        error: 'projectPaths must be a non-empty array',
        code: 'INVALID_INPUT',
      });
    }

    // Load current project's A2A config (returns default config if not exists)
    let currentConfig = await loadA2AConfig(decodedProjectPath);
    if (currentConfig === null) {
      currentConfig = { ...DEFAULT_A2A_CONFIG };
    }

    // Get current project name for API key descriptions
    const currentProjectName = decodedProjectPath.split('/').pop() || decodedProjectPath;

    // Process each project path
    const successfulImports: Array<{ projectPath: string; agentName: string }> = [];
    const failedImports: Array<{ projectPath: string; error: string }> = [];

    for (const targetProjectPath of projectPaths) {
      try {
        // Decode target project path
        const decodedTargetPath = decodeURIComponent(targetProjectPath);

        // Convert project path to project ID
        const projectId = `proj_${Buffer.from(decodedTargetPath).toString('base64').replace(/[+/=]/g, '').slice(-12)}`;
        const agentType = 'claude-code';

        // Get or create A2A agent ID for target project
        const a2aAgentId = await getOrCreateA2AId(projectId, agentType, decodedTargetPath);

        // Build agent card for target project
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const targetProjectName = decodedTargetPath.split('/').pop() || decodedTargetPath;
        const projectContext: ProjectContext = {
          projectId,
          projectName: targetProjectName,
          workingDirectory: decodedTargetPath,
          a2aAgentId,
          baseUrl,
        };

        const agentConfig = globalAgentStorage.getAgent(agentType);
        if (!agentConfig) {
          throw new Error(`Agent '${agentType}' not found`);
        }

        const agentCard = generateAgentCard(agentConfig, projectContext);

        // Check if this agent is already in the allowed list
        const existingAgent = currentConfig.allowedAgents.find(
          (agent) => agent.url === agentCard.url
        );

        if (existingAgent) {
          // Skip duplicate imports as per user requirement
          failedImports.push({
            projectPath: targetProjectPath,
            error: '该项目已存在于外部 Agent 列表中',
          });
          continue;
        }

        // Generate API key for the target project (key created in target project)
        const keyDescription = `用于从 ${currentProjectName} 调用`;
        const { key } = await generateApiKey(decodedTargetPath, keyDescription);

        // Add to current project's allowed agents
        currentConfig.allowedAgents.push({
          name: targetProjectName,
          url: agentCard.url,
          apiKey: key,
          description: agentCard.description || '',
          enabled: true,
        });

        successfulImports.push({
          projectPath: targetProjectPath,
          agentName: targetProjectName,
        });
      } catch (error) {
        console.error(`Failed to import project ${targetProjectPath}:`, error);
        failedImports.push({
          projectPath: targetProjectPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Save updated config
    if (successfulImports.length > 0) {
      await saveA2AConfig(decodedProjectPath, currentConfig);
    }

    res.json({
      successfulImports,
      failedImports,
      totalRequested: projectPaths.length,
      totalSuccess: successfulImports.length,
      totalFailed: failedImports.length,
    });
  } catch (error) {
    console.error('Error importing projects:', error);
    res.status(500).json({
      error: 'Failed to import projects',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

// ============================================================================
// GET /api/a2a/history/:projectPath/:sessionId - Get A2A call history
// ============================================================================

router.get('/history/:projectPath/:sessionId', async (req: Request, res: Response) => {
  try {
    const { projectPath, sessionId } = req.params;
    const stream = req.query.stream === 'true';

    // Decode the URL-encoded project path
    const decodedProjectPath = decodeURIComponent(projectPath);

    if (stream) {
      // Streaming Mode (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const controller = new AbortController();

      // Handle client disconnect
      req.on('close', () => {
        controller.abort();
      });

      try {
        for await (const event of a2aHistoryService.tailHistory(decodedProjectPath, sessionId, controller.signal)) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error streaming history:', error);
          res.write(`event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`);
          res.end();
        }
      }
    } else {
      // Sync Mode (JSON)
      const history = await a2aHistoryService.getHistory(decodedProjectPath, sessionId);
      res.json({ history });
    }
  } catch (error) {
    console.error('Error getting A2A history:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to get A2A history',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
});