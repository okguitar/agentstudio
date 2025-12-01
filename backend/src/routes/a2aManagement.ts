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
import { getOrCreateA2AId, resolveA2AId } from '../services/a2a/agentMappingService.js';
import { taskManager } from '../services/a2a/taskManager.js';
import { generateAgentCard, type ProjectContext } from '../services/a2a/agentCardService.js';
import { AgentStorage } from '../services/agentStorage.js';
import { generateApiKey, listApiKeys, revokeApiKey } from '../services/a2a/apiKeyService.js';
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

    // Get all API keys for this project
    const apiKeys = await listApiKeys(decodedProjectPath);

    // Don't return the full keys, just first 4 and last 4 characters
    const sanitizedKeys = apiKeys.map(key => {
      // Generate a fake preview for display purposes (format: agt_proj_{projectId}_{random-32-hex})
      const preview = `agt_proj_${Buffer.from(key.projectId).toString('base64').slice(0, 6)}....${Buffer.from(key.id).toString('base64').slice(-6)}`;
      return {
        id: key.id,
        projectId: key.projectId,
        description: key.description,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        revokedAt: key.revokedAt,
        keyPreview: preview,
        // Don't return the actual key hash
        keyHash: undefined
      };
    });

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

    // Path to A2A config file
    const configPath = path.join(decodedProjectPath, '.a2a', 'config.json');

    try {
      const data = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(data);
      res.json(config);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config doesn't exist, return 404
        return res.status(404).json({
          error: 'A2A config not found',
          code: 'CONFIG_NOT_FOUND',
        });
      }
      throw error;
    }
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

    // Path to A2A config file
    const configPath = path.join(decodedProjectPath, '.a2a', 'config.json');
    const configDir = path.dirname(configPath);

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Write config file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    res.json(config);
  } catch (error) {
    console.error('Error updating A2A config:', error);
    res.status(500).json({
      error: 'Failed to update A2A config',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;