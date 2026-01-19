/**
 * Tunnel Routes
 *
 * API endpoints for managing WebSocket tunnel connection.
 * Allows users to configure and control the tunnel from the UI.
 */

import { Router, Request, Response } from 'express';
import { tunnelService, TunnelConfig } from '../services/tunnelService.js';

const router = Router();

/**
 * GET /api/tunnel/status
 * Get current tunnel connection status
 */
router.get('/status', async (_req: Request, res: Response): Promise<any> => {
  try {
    const status = tunnelService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('[Tunnel API] Error getting status:', error);
    res.status(500).json({
      error: 'Failed to get tunnel status',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/tunnel/config
 * Get current tunnel configuration (token is masked)
 */
router.get('/config', async (_req: Request, res: Response): Promise<any> => {
  try {
    const config = tunnelService.getConfig();
    res.json(config);
  } catch (error) {
    console.error('[Tunnel API] Error getting config:', error);
    res.status(500).json({
      error: 'Failed to get tunnel config',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * PUT /api/tunnel/config
 * Update tunnel configuration
 *
 * Body: {
 *   enabled?: boolean,
 *   serverUrl?: string,
 *   token?: string,
 *   reconnectInterval?: number,
 *   maxReconnectAttempts?: number
 * }
 */
router.put('/config', async (req: Request, res: Response): Promise<any> => {
  try {
    const newConfig: Partial<TunnelConfig> = {};

    // Validate and extract config fields
    if (typeof req.body.enabled === 'boolean') {
      newConfig.enabled = req.body.enabled;
    }
    if (typeof req.body.serverUrl === 'string' && req.body.serverUrl.trim()) {
      newConfig.serverUrl = req.body.serverUrl.trim();
    }
    if (typeof req.body.token === 'string') {
      // Allow empty token to clear it
      newConfig.token = req.body.token.trim();
    }
    if (typeof req.body.reconnectInterval === 'number' && req.body.reconnectInterval > 0) {
      newConfig.reconnectInterval = req.body.reconnectInterval;
    }
    if (typeof req.body.maxReconnectAttempts === 'number' && req.body.maxReconnectAttempts >= 0) {
      newConfig.maxReconnectAttempts = req.body.maxReconnectAttempts;
    }

    // Determine if we should reconnect
    const shouldReconnect = 'token' in newConfig || 'serverUrl' in newConfig || 'enabled' in newConfig;

    await tunnelService.updateConfig(newConfig, shouldReconnect);

    res.json({
      success: true,
      config: tunnelService.getConfig(),
      status: tunnelService.getStatus(),
    });
  } catch (error) {
    console.error('[Tunnel API] Error updating config:', error);
    res.status(500).json({
      error: 'Failed to update tunnel config',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/tunnel/connect
 * Manually connect to the tunnel server
 */
router.post('/connect', async (_req: Request, res: Response): Promise<any> => {
  try {
    await tunnelService.connect();
    res.json({
      success: true,
      status: tunnelService.getStatus(),
    });
  } catch (error) {
    console.error('[Tunnel API] Error connecting:', error);
    res.status(500).json({
      error: 'Failed to connect tunnel',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/tunnel/disconnect
 * Manually disconnect from the tunnel server
 */
router.post('/disconnect', async (_req: Request, res: Response): Promise<any> => {
  try {
    tunnelService.disconnect();
    res.json({
      success: true,
      status: tunnelService.getStatus(),
    });
  } catch (error) {
    console.error('[Tunnel API] Error disconnecting:', error);
    res.status(500).json({
      error: 'Failed to disconnect tunnel',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/tunnel/test
 * Test tunnel connection with current configuration
 */
router.post('/test', async (_req: Request, res: Response): Promise<any> => {
  try {
    const result = await tunnelService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('[Tunnel API] Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
