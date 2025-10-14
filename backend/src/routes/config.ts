import { Router, Request, Response } from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { authMiddleware } from '../middleware/auth.js';
import { loadConfig } from '../config/index.js';

const router: Router = Router();

// Get current configuration
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    res.json({
      success: true,
      config: {
        port: config.port,
        host: config.host,
        logLevel: config.logLevel,
        slidesDir: config.slidesDir,
        maxFileSize: config.maxFileSize,
        allowedFileTypes: config.allowedFileTypes,
        linuxOptimizations: config.linuxOptimizations,
        service: config.service,
      }
    });
  } catch (error) {
    console.error('Failed to load configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load configuration'
    });
  }
});

// Update port configuration (requires restart to take effect)
router.post('/port', authMiddleware, async (req, res) => {
  try {
    const { port } = req.body;

    if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
      return res.status(400).json({
        success: false,
        error: 'Invalid port number. Must be between 1 and 65535.'
      });
    }

    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const configPath = join(homeDir, '.agent-studio', 'config', 'config.json');

    // Read current config
    let currentConfig = {};
    try {
      const content = await readFile(configPath, 'utf-8');
      currentConfig = JSON.parse(content);
    } catch (error) {
      // Config file doesn't exist, start with empty object
    }

    // Update port
    const updatedConfig = {
      ...currentConfig,
      port: port
    };

    // Write updated config
    await writeFile(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');

    res.json({
      success: true,
      message: `Port updated to ${port}. Restart the service to apply changes.`,
      newPort: port
    });
  } catch (error) {
    console.error('Failed to update port configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update port configuration'
    });
  }
});

// Test if a port is available
router.post('/test-port', authMiddleware, async (req, res) => {
  try {
    const { port } = req.body;

    if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
      return res.status(400).json({
        success: false,
        error: 'Invalid port number. Must be between 1 and 65535.'
      });
    }

    // Simple port availability check
    const net = await import('net');

    const server = net.createServer();

    return new Promise<void>((resolve) => {
      server.listen(port, () => {
        server.close(() => {
          res.json({
            success: true,
            message: `Port ${port} is available.`,
            available: true
          });
          resolve();
        });
      });

      server.on('error', () => {
        res.json({
          success: true,
          message: `Port ${port} is already in use.`,
          available: false
        });
        resolve();
      });
    });
  } catch (error) {
    console.error('Failed to test port:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test port availability'
    });
  }
});

export default router;