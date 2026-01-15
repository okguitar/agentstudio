/**
 * LAVS (Local Agent View Service) Routes
 *
 * Handles HTTP requests for LAVS endpoints.
 */

import express from 'express';
import path from 'path';
import { ManifestLoader } from '../lavs/loader.js';
import { ScriptExecutor } from '../lavs/script-executor.js';
import {
  LAVSManifest,
  LAVSError,
  LAVSErrorCode,
  ExecutionContext,
  ScriptHandler,
} from '../lavs/types.js';
import { AGENTS_DIR } from '../config/paths.js';

const router: express.Router = express.Router();

// Cache loaded manifests to avoid re-parsing on every request
const manifestCache = new Map<string, LAVSManifest>();

/**
 * Get agent directory path
 * Agents can be in either global agents directory or project agents directory
 */
function getAgentDirectory(agentId: string): string {
  // For PoC, we support agents in the project's agents/ directory
  const projectAgentDir = path.join(process.cwd(), 'agents', agentId);

  // Also check global agents directory
  const globalAgentDir = path.join(AGENTS_DIR, agentId);

  // Prefer project directory if it exists, otherwise use global
  const fs = require('fs');
  if (fs.existsSync(projectAgentDir)) {
    return projectAgentDir;
  }

  return globalAgentDir;
}

/**
 * Load LAVS manifest for an agent
 * Uses cache to avoid repeated file reads
 */
async function loadAgentManifest(agentId: string): Promise<LAVSManifest | null> {
  try {
    // Check cache
    if (manifestCache.has(agentId)) {
      return manifestCache.get(agentId)!;
    }

    // Load from file
    const agentDir = getAgentDirectory(agentId);
    const lavsPath = path.join(agentDir, 'lavs.json');

    const loader = new ManifestLoader();
    const manifest = await loader.load(lavsPath);

    // Cache it
    manifestCache.set(agentId, manifest);

    return manifest;
  } catch (error: any) {
    // If file doesn't exist, that's OK - agent just doesn't use LAVS
    if (error.code === LAVSErrorCode.InvalidRequest && error.message.includes('not found')) {
      return null;
    }

    // Other errors should be logged
    console.error(`[LAVS] Failed to load manifest for agent ${agentId}:`, error);
    throw error;
  }
}

/**
 * Clear manifest cache for an agent
 * Call this when agent configuration changes
 */
export function clearManifestCache(agentId?: string) {
  if (agentId) {
    manifestCache.delete(agentId);
  } else {
    manifestCache.clear();
  }
}

/**
 * GET /api/agents/:agentId/lavs/manifest
 * Get LAVS manifest for an agent
 */
router.get('/:agentId/lavs/manifest', async (req, res) => {
  try {
    const { agentId } = req.params;

    const manifest = await loadAgentManifest(agentId);

    if (!manifest) {
      return res.status(404).json({
        error: 'Agent does not have LAVS configuration',
      });
    }

    res.json(manifest);
  } catch (error: any) {
    console.error('[LAVS] Error getting manifest:', error);

    if (error instanceof LAVSError) {
      res.status(400).json({
        error: error.message,
        code: error.code,
        data: error.data,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

/**
 * POST /api/agents/:agentId/lavs/:endpoint
 * Call a LAVS endpoint
 *
 * Request body: input data for the endpoint
 * Response: endpoint result
 */
router.post('/:agentId/lavs/:endpoint', async (req, res) => {
  try {
    const { agentId, endpoint: endpointId } = req.params;
    const input = req.body;

    // 1. Load manifest
    const manifest = await loadAgentManifest(agentId);
    if (!manifest) {
      return res.status(404).json({
        error: 'Agent does not have LAVS configuration',
      });
    }

    // 2. Find endpoint
    const endpoint = manifest.endpoints.find((e) => e.id === endpointId);
    if (!endpoint) {
      return res.status(404).json({
        error: `Endpoint not found: ${endpointId}`,
      });
    }

    // 3. Check method (only query and mutation for now, subscription needs WebSocket)
    if (endpoint.method === 'subscription') {
      return res.status(400).json({
        error: 'Subscription endpoints require WebSocket connection',
      });
    }

    // 4. Build execution context
    const agentDir = getAgentDirectory(agentId);
    const context: ExecutionContext = {
      endpointId: endpoint.id,
      agentId,
      workdir: agentDir,
      permissions: {
        ...(manifest.permissions || {}),
        ...(endpoint.permissions || {}),
      },
    };

    // 5. Execute handler
    let result: any;

    switch (endpoint.handler.type) {
      case 'script': {
        const executor = new ScriptExecutor();
        result = await executor.execute(
          endpoint.handler as ScriptHandler,
          input,
          context
        );
        break;
      }

      case 'function':
      case 'http':
      case 'mcp':
        return res.status(501).json({
          error: `Handler type '${endpoint.handler.type}' not yet implemented in PoC`,
        });

      default:
        return res.status(400).json({
          error: `Unknown handler type: ${(endpoint.handler as any).type}`,
        });
    }

    // 6. Return result
    res.json(result);
  } catch (error: any) {
    console.error('[LAVS] Error executing endpoint:', error);

    if (error instanceof LAVSError) {
      // Map LAVS error codes to HTTP status codes
      const statusCode = mapErrorCodeToHTTP(error.code);

      res.status(statusCode).json({
        error: error.message,
        code: error.code,
        data: error.data,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
});

/**
 * POST /api/agents/:agentId/lavs-cache/clear
 * Clear manifest cache for an agent
 * Useful during development when lavs.json changes
 */
router.post('/:agentId/lavs-cache/clear', (req, res) => {
  const { agentId } = req.params;
  clearManifestCache(agentId);

  res.json({ success: true, message: `Cache cleared for agent ${agentId}` });
});

/**
 * Map LAVS error codes to HTTP status codes
 */
function mapErrorCodeToHTTP(code: number): number {
  switch (code) {
    case LAVSErrorCode.ParseError:
    case LAVSErrorCode.InvalidRequest:
    case LAVSErrorCode.InvalidParams:
      return 400; // Bad Request

    case LAVSErrorCode.MethodNotFound:
      return 404; // Not Found

    case LAVSErrorCode.PermissionDenied:
      return 403; // Forbidden

    case LAVSErrorCode.Timeout:
      return 504; // Gateway Timeout

    case LAVSErrorCode.HandlerError:
    case LAVSErrorCode.InternalError:
    default:
      return 500; // Internal Server Error
  }
}

export default router;
