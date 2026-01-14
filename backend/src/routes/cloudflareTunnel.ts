import express, { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const router: Router = express.Router();
const execAsync = promisify(exec);

// Tunnel configuration storage path
const getTunnelConfigPath = () => join(homedir(), '.claude', 'cloudflare-tunnel.json');

interface TunnelConfig {
  apiToken?: string;
  accountId?: string;
  activeTunnel?: {
    tunnelId: string;
    tunnelName: string;
    publicUrl: string;
    createdAt: string;
    localPort: number;
  } | null;
}

interface CloudflareTunnelResponse {
  success: boolean;
  tunnel_id: string;
  tunnel_name: string;
  tunnel_token: string;
  local_url: string;
  public_url: string;
  created_at: string;
  instructions: {
    cli: string;
    docker: string;
  };
}

// Load tunnel configuration
const loadTunnelConfig = async (): Promise<TunnelConfig> => {
  try {
    const configPath = getTunnelConfigPath();
    if (existsSync(configPath)) {
      const content = await readFile(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading tunnel config:', error);
  }
  return {};
};

// Save tunnel configuration
const saveTunnelConfig = async (config: TunnelConfig): Promise<void> => {
  try {
    const configPath = getTunnelConfigPath();
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving tunnel config:', error);
    throw error;
  }
};

// GET /api/cloudflare-tunnel/config - Get current tunnel configuration
router.get('/config', async (req, res) => {
  try {
    const config = await loadTunnelConfig();

    // Mask sensitive data
    const maskedConfig = {
      hasApiToken: !!config.apiToken,
      hasAccountId: !!config.accountId,
      activeTunnel: config.activeTunnel || null
    };

    res.json(maskedConfig);
  } catch (error) {
    console.error('Error getting tunnel config:', error);
    res.status(500).json({
      error: 'Failed to get tunnel configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/cloudflare-tunnel/config - Save Cloudflare credentials
router.post('/config', async (req, res) => {
  try {
    const { apiToken, accountId } = req.body;

    if (!apiToken || !accountId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'apiToken and accountId are required'
      });
    }

    const config = await loadTunnelConfig();
    config.apiToken = apiToken;
    config.accountId = accountId;

    await saveTunnelConfig(config);

    res.json({
      success: true,
      message: 'Cloudflare credentials saved successfully'
    });
  } catch (error) {
    console.error('Error saving tunnel config:', error);
    res.status(500).json({
      error: 'Failed to save tunnel configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/cloudflare-tunnel/create - Create and activate a tunnel
router.post('/create', async (req, res) => {
  try {
    const { subdomain, localPort = 4936 } = req.body;

    const config = await loadTunnelConfig();

    if (!config.apiToken || !config.accountId) {
      return res.status(400).json({
        error: 'Cloudflare credentials not configured',
        message: 'Please configure API token and account ID first'
      });
    }

    // Check if Python is available
    try {
      await execAsync('python3 --version');
    } catch (error) {
      return res.status(500).json({
        error: 'Python not found',
        message: 'Python 3 is required to create tunnels. Please install Python 3.'
      });
    }

    // Path to the Python script
    const scriptPath = join(__dirname, '../../../scripts/cloudflare_tunnel.py');

    if (!existsSync(scriptPath)) {
      return res.status(500).json({
        error: 'Tunnel script not found',
        message: 'Cloudflare tunnel management script is missing'
      });
    }

    // Build command
    const command = [
      'python3',
      scriptPath,
      '--api-token', config.apiToken,
      '--account-id', config.accountId,
      '--action', 'quick',
      '--local-port', localPort.toString()
    ];

    if (subdomain) {
      command.push('--subdomain', subdomain);
    }

    // Execute the Python script
    const { stdout, stderr } = await execAsync(command.join(' '));

    if (stderr) {
      console.error('Python script stderr:', stderr);
    }

    // Parse the JSON output
    const tunnelData: CloudflareTunnelResponse = JSON.parse(stdout);

    if (!tunnelData.success) {
      throw new Error('Failed to create tunnel');
    }

    // Save active tunnel info
    config.activeTunnel = {
      tunnelId: tunnelData.tunnel_id,
      tunnelName: tunnelData.tunnel_name,
      publicUrl: tunnelData.public_url,
      createdAt: tunnelData.created_at,
      localPort: localPort
    };

    await saveTunnelConfig(config);

    res.json({
      success: true,
      tunnel: {
        id: tunnelData.tunnel_id,
        name: tunnelData.tunnel_name,
        publicUrl: tunnelData.public_url,
        localUrl: tunnelData.local_url,
        createdAt: tunnelData.created_at,
        token: tunnelData.tunnel_token,
        instructions: tunnelData.instructions
      }
    });
  } catch (error) {
    console.error('Error creating tunnel:', error);
    res.status(500).json({
      error: 'Failed to create tunnel',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/cloudflare-tunnel/delete/:tunnelId - Delete a tunnel
router.delete('/delete/:tunnelId', async (req, res) => {
  try {
    const { tunnelId } = req.params;

    const config = await loadTunnelConfig();

    if (!config.apiToken || !config.accountId) {
      return res.status(400).json({
        error: 'Cloudflare credentials not configured',
        message: 'Please configure API token and account ID first'
      });
    }

    // Path to the Python script
    const scriptPath = join(__dirname, '../../../scripts/cloudflare_tunnel.py');

    // Build command
    const command = [
      'python3',
      scriptPath,
      '--api-token', config.apiToken,
      '--account-id', config.accountId,
      '--action', 'delete',
      '--tunnel-id', tunnelId
    ];

    // Execute the Python script
    await execAsync(command.join(' '));

    // Clear active tunnel if it matches
    if (config.activeTunnel?.tunnelId === tunnelId) {
      config.activeTunnel = null;
      await saveTunnelConfig(config);
    }

    res.json({
      success: true,
      message: `Tunnel ${tunnelId} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting tunnel:', error);
    res.status(500).json({
      error: 'Failed to delete tunnel',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/cloudflare-tunnel/list - List all tunnels
router.get('/list', async (req, res) => {
  try {
    const config = await loadTunnelConfig();

    if (!config.apiToken || !config.accountId) {
      return res.status(400).json({
        error: 'Cloudflare credentials not configured',
        message: 'Please configure API token and account ID first'
      });
    }

    // Path to the Python script
    const scriptPath = join(__dirname, '../../../scripts/cloudflare_tunnel.py');

    // Build command
    const command = [
      'python3',
      scriptPath,
      '--api-token', config.apiToken,
      '--account-id', config.accountId,
      '--action', 'list'
    ];

    // Execute the Python script
    const { stdout } = await execAsync(command.join(' '));

    // Parse the JSON output
    const tunnels = JSON.parse(stdout);

    res.json({
      success: true,
      tunnels
    });
  } catch (error) {
    console.error('Error listing tunnels:', error);
    res.status(500).json({
      error: 'Failed to list tunnels',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
