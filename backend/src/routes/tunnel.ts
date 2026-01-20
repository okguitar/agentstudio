/**
 * Tunnel Routes
 *
 * API endpoints for managing WebSocket tunnel connection.
 * Allows users to configure and control the tunnel from the UI.
 */

import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { tunnelService, TunnelConfig } from '../services/tunnelService.js';

const router: RouterType = Router();

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
    if (req.body.protocol === 'https' || req.body.protocol === 'http') {
      newConfig.protocol = req.body.protocol;
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

/**
 * GET /api/tunnel/check-name
 * Check if a tunnel name is available
 *
 * Query: { name: string }
 */
router.get('/check-name', async (req: Request, res: Response): Promise<any> => {
  try {
    const name = req.query.name as string;
    const serverUrl = req.query.serverUrl as string;
    
    if (!name) {
      return res.status(400).json({
        available: false,
        reason: '请提供隧道名称',
      });
    }

    // Update serverUrl in config before checking name
    if (serverUrl) {
      await tunnelService.saveConfig({ serverUrl });
    }

    const result = await tunnelService.checkTunnelName(name);
    res.json(result);
  } catch (error) {
    console.error('[Tunnel API] Error checking name:', error);
    res.status(500).json({
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/tunnel/create-tunnel
 * Create a new tunnel and get the token
 *
 * Body: { name: string, autoConnect?: boolean, protocol?: 'https' | 'http' }
 */
router.post('/create-tunnel', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, serverUrl, autoConnect, protocol, websocketUrl, domainSuffix } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供隧道名称',
      });
    }

    // Update serverUrl in config before creating tunnel
    if (serverUrl) {
      await tunnelService.saveConfig({ serverUrl });
    }

    // Validate protocol
    const validProtocol = protocol === 'http' ? 'http' : 'https';

    const result = await tunnelService.createAndSave(name.trim(), autoConnect === true, validProtocol, websocketUrl, domainSuffix);
    
    if (result.success) {
      res.json({
        ...result,
        config: tunnelService.getConfig(),
        status: tunnelService.getStatus(),
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Tunnel API] Error creating tunnel:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/tunnel/config - Delete tunnel configuration
 * Clears all tunnel configuration and disconnects if connected
 */
router.delete('/config', async (_req: Request, res: Response): Promise<any> => {
  try {
    // Disconnect if connected
    tunnelService.disconnect();
    
    // Reset configuration to defaults
    await tunnelService.saveConfig({
      enabled: false,
      serverUrl: 'https://hitl.woa.com',
      token: '',
      tunnelName: '',
      domainSuffix: '',
      websocketUrl: '',
      protocol: 'https',
    });

    res.json({
      success: true,
      message: '隧道配置已删除',
      config: tunnelService.getConfig(),
      status: tunnelService.getStatus(),
    });
  } catch (error) {
    console.error('[Tunnel API] Error deleting tunnel config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/tunnel/server-info - Get tunnel server info (proxy to avoid CORS)
 * Fetches server info from the specified tunnel server URL
 */
router.post('/server-info', async (req: Request, res: Response): Promise<any> => {
  try {
    const { serverUrl } = req.body;
    
    if (!serverUrl || typeof serverUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供服务器地址',
      });
    }

    // Normalize URL - remove trailing slashes
    const baseUrl = serverUrl.replace(/\/+$/, '');
    const infoUrl = `${baseUrl}/api/info`;

    console.log(`[Tunnel API] Fetching server info from: ${infoUrl}`);

    const response = await fetch(infoUrl);
    
    if (!response.ok) {
      throw new Error(`服务器返回错误: HTTP ${response.status}`);
    }

    const data = await response.json();
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Tunnel API] Error fetching server info:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
