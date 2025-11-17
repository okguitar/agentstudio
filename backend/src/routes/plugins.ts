import express from 'express';
import { pluginScanner } from '../services/pluginScanner';
import { pluginInstaller } from '../services/pluginInstaller';
import { pluginParser } from '../services/pluginParser';
import { pluginPaths } from '../services/pluginPaths';
import { MarketplaceAddRequest, PluginInstallRequest } from '../types/plugins';

const router: express.Router = express.Router();

// ============================================
// Marketplace Routes
// ============================================

/**
 * GET /api/plugin-marketplaces
 * Get all marketplaces
 */
router.get('/marketplaces', async (req, res) => {
  try {
    const marketplaces = await pluginScanner.scanMarketplaces();
    res.json({ marketplaces });
  } catch (error) {
    console.error('Failed to get marketplaces:', error);
    res.status(500).json({
      error: 'Failed to retrieve marketplaces',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/plugin-marketplaces
 * Add a new marketplace
 */
router.post('/marketplaces', async (req, res) => {
  try {
    const request: MarketplaceAddRequest = req.body;

    // Validate request
    if (!request.name || !request.type || !request.source) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, source',
      });
    }

    if (!['git', 'github', 'local'].includes(request.type)) {
      return res.status(400).json({
        error: 'Invalid type. Must be "git", "github", or "local"',
      });
    }

    const result = await pluginInstaller.addMarketplace(request);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    // Get marketplace info
    const marketplaceName = request.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const marketplace = await pluginScanner.scanMarketplace(marketplaceName);

    res.json({
      marketplace,
      message: `Marketplace added successfully with ${result.pluginCount} plugins`,
    });
  } catch (error) {
    console.error('Failed to add marketplace:', error);
    res.status(500).json({
      error: 'Failed to add marketplace',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/plugin-marketplaces/:id/sync
 * Sync (update) a marketplace
 */
router.post('/marketplaces/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pluginInstaller.syncMarketplace(id);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    res.json({
      success: true,
      pluginCount: result.pluginCount,
      message: `Marketplace synced successfully with ${result.pluginCount} plugins`,
    });
  } catch (error) {
    console.error('Failed to sync marketplace:', error);
    res.status(500).json({
      error: 'Failed to sync marketplace',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/plugin-marketplaces/:id
 * Remove a marketplace
 */
router.delete('/marketplaces/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await pluginInstaller.removeMarketplace(id);

    if (!success) {
      return res.status(404).json({
        error: 'Marketplace not found',
      });
    }

    res.json({
      success: true,
      message: 'Marketplace removed successfully',
    });
  } catch (error) {
    console.error('Failed to remove marketplace:', error);
    res.status(500).json({
      error: 'Failed to remove marketplace',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================
// Plugin Routes
// ============================================

/**
 * GET /api/plugins/available
 * Get all available plugins from all marketplaces
 */
router.get('/available', async (req, res) => {
  try {
    const plugins = await pluginScanner.getAvailablePlugins();
    res.json({ plugins });
  } catch (error) {
    console.error('Failed to get available plugins:', error);
    res.status(500).json({
      error: 'Failed to retrieve available plugins',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/plugins/installed
 * Get all installed plugins
 */
router.get('/installed', async (req, res) => {
  try {
    const plugins = await pluginScanner.scanInstalledPlugins();
    res.json({ plugins });
  } catch (error) {
    console.error('Failed to get installed plugins:', error);
    res.status(500).json({
      error: 'Failed to retrieve installed plugins',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/plugins/:marketplaceName/:pluginName
 * Get details of a specific plugin
 */
router.get('/:marketplaceName/:pluginName', async (req, res) => {
  try {
    const { marketplaceName, pluginName } = req.params;

    const plugin = await pluginScanner.scanPlugin(marketplaceName, pluginName);

    if (!plugin) {
      return res.status(404).json({
        error: 'Plugin not found',
      });
    }

    // Get parsed plugin for more details
    const pluginPath = pluginPaths.getPluginPath(marketplaceName, pluginName);
    const parsedPlugin = await pluginParser.parsePlugin(pluginPath, marketplaceName, pluginName);

    res.json({
      plugin,
      components: parsedPlugin.components, // Return detailed component info
      files: parsedPlugin.files,
      readme: await pluginParser.readReadme(pluginPath),
      manifest: parsedPlugin.manifest,
    });
  } catch (error) {
    console.error('Failed to get plugin details:', error);
    res.status(500).json({
      error: 'Failed to retrieve plugin details',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/plugins/:marketplaceName/:pluginName/files/:filePath
 * Get content of a specific file in a plugin
 */
router.get('/:marketplaceName/:pluginName/files/*', async (req, res) => {
  try {
    const { marketplaceName, pluginName } = req.params;
    const filePath = (req.params as any)[0]; // Get the wildcard path

    const pluginPath = pluginPaths.getPluginPath(marketplaceName, pluginName);
    const fullFilePath = pluginPath + '/' + filePath;

    // Security check: ensure file is within plugin directory
    if (!fullFilePath.startsWith(pluginPath)) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    const content = await pluginParser.readFileContent(fullFilePath);
    res.json({ content });
  } catch (error) {
    console.error('Failed to read file:', error);
    res.status(500).json({
      error: 'Failed to read file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/plugins/install
 * Install a plugin (create symlinks)
 */
router.post('/install', async (req, res) => {
  try {
    const request: PluginInstallRequest = req.body;

    // Validate request
    if (!request.pluginName || !request.marketplaceName) {
      return res.status(400).json({
        error: 'Missing required fields: pluginName, marketplaceName',
      });
    }

    const result = await pluginInstaller.installPlugin(request);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    res.json({
      success: true,
      plugin: result.plugin,
      message: result.message,
    });
  } catch (error) {
    console.error('Failed to install plugin:', error);
    res.status(500).json({
      error: 'Failed to install plugin',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/plugins/:marketplaceName/:pluginName/enable
 * Enable a plugin (create symlinks)
 */
router.post('/:marketplaceName/:pluginName/enable', async (req, res) => {
  try {
    const { marketplaceName, pluginName } = req.params;
    const success = await pluginInstaller.enablePlugin(pluginName, marketplaceName);

    if (!success) {
      return res.status(400).json({
        error: 'Failed to enable plugin',
      });
    }

    // Get updated plugin info
    const plugin = await pluginScanner.scanPlugin(marketplaceName, pluginName);

    res.json({
      success: true,
      plugin,
      message: 'Plugin enabled successfully',
    });
  } catch (error) {
    console.error('Failed to enable plugin:', error);
    res.status(500).json({
      error: 'Failed to enable plugin',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/plugins/:marketplaceName/:pluginName/disable
 * Disable a plugin (remove symlinks)
 */
router.post('/:marketplaceName/:pluginName/disable', async (req, res) => {
  try {
    const { marketplaceName, pluginName } = req.params;
    const success = await pluginInstaller.disablePlugin(pluginName, marketplaceName);

    if (!success) {
      return res.status(400).json({
        error: 'Failed to disable plugin',
      });
    }

    // Get updated plugin info
    const plugin = await pluginScanner.scanPlugin(marketplaceName, pluginName);

    res.json({
      success: true,
      plugin,
      message: 'Plugin disabled successfully',
    });
  } catch (error) {
    console.error('Failed to disable plugin:', error);
    res.status(500).json({
      error: 'Failed to disable plugin',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/plugins/:marketplaceName/:pluginName
 * Uninstall a plugin (remove symlinks)
 */
router.delete('/:marketplaceName/:pluginName', async (req, res) => {
  try {
    const { marketplaceName, pluginName } = req.params;
    const success = await pluginInstaller.uninstallPlugin(pluginName, marketplaceName);

    if (!success) {
      return res.status(404).json({
        error: 'Plugin not found',
      });
    }

    res.json({
      success: true,
      message: 'Plugin uninstalled successfully',
    });
  } catch (error) {
    console.error('Failed to uninstall plugin:', error);
    res.status(500).json({
      error: 'Failed to uninstall plugin',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

