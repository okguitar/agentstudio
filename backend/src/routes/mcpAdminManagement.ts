/**
 * MCP Admin Management Routes
 *
 * HTTP endpoints for managing MCP Admin Server settings and API keys.
 * These routes use JWT authentication (regular user auth) instead of Admin API keys.
 *
 * Endpoints:
 * - GET /api/mcp-admin-management/status - Get MCP Admin Server status
 * - GET /api/mcp-admin-management/keys - List admin API keys
 * - POST /api/mcp-admin-management/keys - Create admin API key
 * - DELETE /api/mcp-admin-management/keys/:keyId - Revoke admin API key
 * - GET /api/mcp-admin-management/config-snippet - Get config snippet for Cursor/Claude Desktop
 */

import express, { Router, Request, Response } from 'express';
import {
  generateAdminApiKey,
  listAdminApiKeys,
  revokeAdminApiKey,
  updateAdminApiKey,
  toggleAdminApiKey,
} from '../services/mcpAdmin/index.js';
import type { AdminPermission } from '../services/mcpAdmin/types.js';
import { getMcpAdminServer } from '../services/mcpAdmin/mcpAdminServer.js';

const router: Router = express.Router();

/**
 * GET /api/mcp-admin-management/status
 * Get MCP Admin Server status and info
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const server = getMcpAdminServer();
    const toolCount = server.getToolCount();
    const keys = await listAdminApiKeys();
    const activeKeys = keys.filter((k) => !k.revokedAt);

    res.json({
      enabled: true,
      version: '1.0.0',
      endpoint: '/api/mcp-admin',
      toolCount,
      activeKeyCount: activeKeys.length,
      totalKeyCount: keys.length,
    });
  } catch (error) {
    console.error('[MCP Admin Management] Error getting status:', error);
    res.status(500).json({
      error: 'Failed to get status',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/mcp-admin-management/keys
 * List all admin API keys
 */
router.get('/keys', async (req: Request, res: Response) => {
  try {
    const keys = await listAdminApiKeys();

    // Return keys with both masked and full key (full key only for non-revoked)
    const sanitizedKeys = keys.map((key) => ({
      id: key.id,
      description: key.description,
      permissions: key.permissions,
      allowedTools: key.allowedTools,
      enabled: key.enabled !== false, // Default to true if not specified
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      // Mask the key - show first 8 chars + ... + last 4 chars
      maskedKey: key.decryptedKey
        ? `${key.decryptedKey.substring(0, 8)}...${key.decryptedKey.substring(key.decryptedKey.length - 4)}`
        : null,
      // Full key is only available for non-revoked keys
      fullKey: !key.revokedAt ? key.decryptedKey : null,
      isRevoked: !!key.revokedAt,
    }));

    res.json({ keys: sanitizedKeys });
  } catch (error) {
    console.error('[MCP Admin Management] Error listing keys:', error);
    res.status(500).json({
      error: 'Failed to list keys',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/mcp-admin-management/keys
 * Create a new admin API key
 */
router.post('/keys', async (req: Request, res: Response) => {
  try {
    const { description, permissions, allowedTools } = req.body;

    if (!description) {
      res.status(400).json({
        error: 'Description is required',
      });
      return;
    }

    const parsedPermissions = (permissions as AdminPermission[]) || ['admin:*'];
    const parsedAllowedTools = (allowedTools as string[]) || undefined;

    const { key, keyData } = await generateAdminApiKey(description, parsedPermissions, parsedAllowedTools);

    res.status(201).json({
      id: keyData.id,
      key, // Only shown once!
      description: keyData.description,
      permissions: keyData.permissions,
      allowedTools: keyData.allowedTools,
      createdAt: keyData.createdAt,
      message: 'Save this key now - it will not be shown again',
    });
  } catch (error) {
    console.error('[MCP Admin Management] Error creating key:', error);
    res.status(500).json({
      error: 'Failed to create key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * PUT /api/mcp-admin-management/keys/:keyId
 * Update an admin API key (description, allowedTools)
 */
router.put('/keys/:keyId', async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    const { description, allowedTools } = req.body;

    const updatedKey = await updateAdminApiKey(keyId, { description, allowedTools });

    if (!updatedKey) {
      res.status(404).json({
        error: 'Key not found',
      });
      return;
    }

    res.json({
      success: true,
      key: {
        id: updatedKey.id,
        description: updatedKey.description,
        allowedTools: updatedKey.allowedTools,
      },
    });
  } catch (error) {
    console.error('[MCP Admin Management] Error updating key:', error);
    res.status(500).json({
      error: 'Failed to update key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/mcp-admin-management/keys/:keyId/toggle
 * Enable or disable an admin API key
 */
router.post('/keys/:keyId/toggle', async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        error: 'enabled must be a boolean',
      });
      return;
    }

    const success = await toggleAdminApiKey(keyId, enabled);

    if (!success) {
      res.status(404).json({
        error: 'Key not found',
      });
      return;
    }

    res.json({
      success: true,
      enabled,
      message: enabled ? 'API key enabled' : 'API key disabled',
    });
  } catch (error) {
    console.error('[MCP Admin Management] Error toggling key:', error);
    res.status(500).json({
      error: 'Failed to toggle key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/mcp-admin-management/keys/:keyId
 * Revoke an admin API key
 */
router.delete('/keys/:keyId', async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;

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
    console.error('[MCP Admin Management] Error revoking key:', error);
    res.status(500).json({
      error: 'Failed to revoke key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/mcp-admin-management/config-snippet
 * Get configuration snippet for Cursor or Claude Desktop
 */
router.get('/config-snippet', async (req: Request, res: Response) => {
  try {
    const { platform, apiKey, serverUrl } = req.query;

    if (!apiKey) {
      res.status(400).json({
        error: 'API key is required',
      });
      return;
    }

    // Get the base URL from the request or use provided serverUrl
    const baseUrl = serverUrl || `${req.protocol}://${req.get('host')}`;
    const mcpEndpoint = `${baseUrl}/api/mcp-admin`;

    const cursorConfig = {
      mcpServers: {
        'agentstudio-admin': {
          url: mcpEndpoint,
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      },
    };

    const claudeDesktopConfig = {
      mcpServers: {
        'agentstudio-admin': {
          url: mcpEndpoint,
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      },
    };

    if (platform === 'cursor') {
      res.json({
        platform: 'cursor',
        configPath: '~/.cursor/mcp.json',
        config: cursorConfig,
        configString: JSON.stringify(cursorConfig, null, 2),
      });
    } else if (platform === 'claude-desktop') {
      res.json({
        platform: 'claude-desktop',
        configPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
        config: claudeDesktopConfig,
        configString: JSON.stringify(claudeDesktopConfig, null, 2),
      });
    } else {
      res.json({
        cursor: {
          configPath: '~/.cursor/mcp.json',
          config: cursorConfig,
          configString: JSON.stringify(cursorConfig, null, 2),
        },
        claudeDesktop: {
          configPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
          config: claudeDesktopConfig,
          configString: JSON.stringify(claudeDesktopConfig, null, 2),
        },
      });
    }
  } catch (error) {
    console.error('[MCP Admin Management] Error generating config:', error);
    res.status(500).json({
      error: 'Failed to generate config',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/mcp-admin-management/tools
 * List available MCP Admin tools
 */
router.get('/tools', async (req: Request, res: Response) => {
  try {
    const { allTools } = await import('../services/mcpAdmin/tools/index.js');

    const tools = allTools.map((tool) => ({
      name: tool.tool.name,
      description: tool.tool.description,
      requiredPermissions: tool.requiredPermissions,
      inputSchema: tool.tool.inputSchema,
    }));

    res.json({ tools });
  } catch (error) {
    console.error('[MCP Admin Management] Error listing tools:', error);
    res.status(500).json({
      error: 'Failed to list tools',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
