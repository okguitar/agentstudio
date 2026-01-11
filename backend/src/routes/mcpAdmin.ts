/**
 * MCP Admin Routes
 *
 * HTTP endpoints for the MCP Admin Server.
 * Implements MCP HTTP Streamable protocol with pure JSON responses.
 *
 * Endpoints:
 * - POST /api/mcp-admin - Handle MCP JSON-RPC requests
 * - GET /api/mcp-admin/keys - List admin API keys (requires existing admin auth)
 * - POST /api/mcp-admin/keys - Create admin API key (requires existing admin auth)
 * - DELETE /api/mcp-admin/keys/:keyId - Revoke admin API key
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import {
  getMcpAdminServer,
  validateAdminApiKey,
  generateAdminApiKey,
  listAdminApiKeys,
  revokeAdminApiKey,
  allTools,
} from '../services/mcpAdmin/index.js';
import type {
  JsonRpcRequest,
  ToolContext,
  AdminPermission,
} from '../services/mcpAdmin/types.js';
import { JSON_RPC_ERRORS } from '../services/mcpAdmin/types.js';

const router: Router = express.Router();

// Initialize MCP Admin Server with all tools
const mcpServer = getMcpAdminServer();
mcpServer.registerTools(allTools);

console.info(`[MCP Admin] Server initialized with ${mcpServer.getToolCount()} tools`);

// =============================================================================
// Middleware: Admin API Key Authentication
// =============================================================================

interface AdminRequest extends Request {
  adminContext?: ToolContext;
}

async function adminAuth(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Missing Authorization header',
          data: 'Include: Authorization: Bearer <admin-api-key>',
        },
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Invalid Authorization header format',
          data: 'Use: Authorization: Bearer <admin-api-key>',
        },
      });
      return;
    }

    const apiKey = authHeader.substring(7);

    if (!apiKey) {
      res.status(401).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Empty API key',
        },
      });
      return;
    }

    const validation = await validateAdminApiKey(apiKey);

    if (!validation.valid) {
      console.warn('[MCP Admin] Failed authentication attempt:', {
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });

      res.status(401).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Invalid or revoked API key',
        },
      });
      return;
    }

    // Attach admin context to request
    req.adminContext = {
      apiKeyId: validation.keyId!,
      permissions: validation.permissions!,
    };

    console.info('[MCP Admin] Authenticated request:', {
      keyId: validation.keyId,
      timestamp: new Date().toISOString(),
    });

    next();
  } catch (error) {
    console.error('[MCP Admin] Authentication error:', error);

    res.status(500).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: JSON_RPC_ERRORS.INTERNAL_ERROR.code,
        message: 'Authentication error',
      },
    });
  }
}

// =============================================================================
// POST /api/mcp-admin - Handle MCP JSON-RPC requests
// =============================================================================

router.post('/', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const request = req.body as JsonRpcRequest;

    // Validate basic JSON-RPC structure
    if (!request || typeof request !== 'object') {
      res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: JSON_RPC_ERRORS.PARSE_ERROR,
      });
      return;
    }

    if (!request.method) {
      res.status(400).json({
        jsonrpc: '2.0',
        id: request.id ?? null,
        error: {
          ...JSON_RPC_ERRORS.INVALID_REQUEST,
          data: 'Missing method',
        },
      });
      return;
    }

    // Handle the request
    const response = await mcpServer.handleRequest(request, req.adminContext!);

    // Return pure JSON response
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
  } catch (error) {
    console.error('[MCP Admin] Request handling error:', error);

    res.status(500).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        ...JSON_RPC_ERRORS.INTERNAL_ERROR,
        data: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

// =============================================================================
// Admin API Key Management Endpoints
// =============================================================================

// GET /api/mcp-admin/keys - List admin API keys
router.get('/keys', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    // Check permission
    const hasAdminPerm = req.adminContext?.permissions.includes('admin:*');
    if (!hasAdminPerm) {
      res.status(403).json({
        error: 'Permission denied',
        message: 'admin:* permission required',
      });
      return;
    }

    const keys = await listAdminApiKeys();

    // Sanitize keys for response
    const sanitizedKeys = keys.map((key) => ({
      id: key.id,
      description: key.description,
      permissions: key.permissions,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      // Only show decrypted key if not revoked
      key: key.revokedAt ? null : key.decryptedKey,
    }));

    res.json({ keys: sanitizedKeys });
  } catch (error) {
    console.error('[MCP Admin] Error listing keys:', error);
    res.status(500).json({
      error: 'Failed to list keys',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/mcp-admin/keys - Create admin API key
router.post('/keys', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    // Check permission
    const hasAdminPerm = req.adminContext?.permissions.includes('admin:*');
    if (!hasAdminPerm) {
      res.status(403).json({
        error: 'Permission denied',
        message: 'admin:* permission required',
      });
      return;
    }

    const { description, permissions } = req.body;

    if (!description) {
      res.status(400).json({
        error: 'Description is required',
      });
      return;
    }

    const parsedPermissions = (permissions as AdminPermission[]) || ['admin:*'];

    const { key, keyData } = await generateAdminApiKey(description, parsedPermissions);

    res.status(201).json({
      id: keyData.id,
      key, // Only shown once!
      description: keyData.description,
      permissions: keyData.permissions,
      createdAt: keyData.createdAt,
      message: 'Save this key now - it will not be shown again',
    });
  } catch (error) {
    console.error('[MCP Admin] Error creating key:', error);
    res.status(500).json({
      error: 'Failed to create key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// DELETE /api/mcp-admin/keys/:keyId - Revoke admin API key
router.delete('/keys/:keyId', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    // Check permission
    const hasAdminPerm = req.adminContext?.permissions.includes('admin:*');
    if (!hasAdminPerm) {
      res.status(403).json({
        error: 'Permission denied',
        message: 'admin:* permission required',
      });
      return;
    }

    const { keyId } = req.params;

    // Prevent self-revocation
    if (keyId === req.adminContext?.apiKeyId) {
      res.status(400).json({
        error: 'Cannot revoke your own API key',
      });
      return;
    }

    const success = await revokeAdminApiKey(keyId);

    if (!success) {
      res.status(404).json({
        error: 'Key not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'API key revoked',
    });
  } catch (error) {
    console.error('[MCP Admin] Error revoking key:', error);
    res.status(500).json({
      error: 'Failed to revoke key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// =============================================================================
// Bootstrap endpoint (no auth required) - Create first admin key
// =============================================================================

router.post('/bootstrap', async (req: Request, res: Response) => {
  try {
    // Check if any admin keys exist
    const existingKeys = await listAdminApiKeys();
    const activeKeys = existingKeys.filter((k) => !k.revokedAt);

    if (activeKeys.length > 0) {
      res.status(403).json({
        error: 'Bootstrap not allowed',
        message: 'Admin keys already exist. Use an existing key to create new ones.',
      });
      return;
    }

    const { description } = req.body;

    if (!description) {
      res.status(400).json({
        error: 'Description is required',
      });
      return;
    }

    const { key, keyData } = await generateAdminApiKey(description, ['admin:*']);

    console.info('[MCP Admin] Bootstrap: First admin key created');

    res.status(201).json({
      id: keyData.id,
      key, // Only shown once!
      description: keyData.description,
      permissions: keyData.permissions,
      createdAt: keyData.createdAt,
      message: 'IMPORTANT: Save this key now - it will NEVER be shown again!',
    });
  } catch (error) {
    console.error('[MCP Admin] Bootstrap error:', error);
    res.status(500).json({
      error: 'Bootstrap failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
