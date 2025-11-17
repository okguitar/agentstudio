import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { pluginPaths } from './pluginPaths';
import { pluginParser } from './pluginParser';
import { pluginSymlink } from './pluginSymlink';
import { pluginScanner } from './pluginScanner';
import { MarketplaceAddRequest, PluginInstallRequest, PluginInstallResult, MarketplaceSyncResult } from '../types/plugins';

const execAsync = promisify(exec);

/**
 * Plugin Installer Service
 * Handles installation of marketplaces and plugins from various sources
 */
class PluginInstaller {
  /**
   * Add a new marketplace
   */
  async addMarketplace(request: MarketplaceAddRequest): Promise<MarketplaceSyncResult> {
    const { name, type, source, branch = 'main' } = request;

    // Generate directory name from marketplace name
    const marketplaceName = this.sanitizeName(name);
    const marketplacePath = pluginPaths.getMarketplacePath(marketplaceName);

    // Check if marketplace already exists
    if (fs.existsSync(marketplacePath)) {
      return {
        success: false,
        error: `Marketplace '${marketplaceName}' already exists`,
        syncedAt: new Date().toISOString(),
      };
    }

    try {
      if (type === 'git' || type === 'github') {
        await this.cloneMarketplace(source, marketplacePath, branch, type === 'github');
      } else if (type === 'local') {
        await this.copyLocalMarketplace(source, marketplacePath);
      }

      // Count plugins
      const pluginNames = pluginPaths.listPlugins(marketplaceName);

      return {
        success: true,
        pluginCount: pluginNames.length,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(marketplacePath)) {
        await this.removeDirectory(marketplacePath);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add marketplace',
        syncedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Sync (update) an existing marketplace
   */
  async syncMarketplace(marketplaceName: string): Promise<MarketplaceSyncResult> {
    const marketplacePath = pluginPaths.getMarketplacePath(marketplaceName);

    if (!fs.existsSync(marketplacePath)) {
      return {
        success: false,
        error: `Marketplace '${marketplaceName}' not found`,
        syncedAt: new Date().toISOString(),
      };
    }

    try {
      // Check if it's a git repository
      const gitDir = path.join(marketplacePath, '.git');
      if (fs.existsSync(gitDir)) {
        // Pull latest changes
        await execAsync('git pull', { cwd: marketplacePath });
      } else {
        return {
          success: false,
          error: 'Marketplace is not a git repository. Cannot sync.',
          syncedAt: new Date().toISOString(),
        };
      }

      // Count plugins
      const pluginNames = pluginPaths.listPlugins(marketplaceName);

      return {
        success: true,
        pluginCount: pluginNames.length,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync marketplace',
        syncedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Remove a marketplace
   */
  async removeMarketplace(marketplaceName: string): Promise<boolean> {
    const marketplacePath = pluginPaths.getMarketplacePath(marketplaceName);

    if (!fs.existsSync(marketplacePath)) {
      return false;
    }

    try {
      // First, uninstall all plugins in this marketplace
      const pluginNames = pluginPaths.listPlugins(marketplaceName);
      for (const pluginName of pluginNames) {
        await this.uninstallPlugin(pluginName, marketplaceName);
      }

      // Remove marketplace directory
      await this.removeDirectory(marketplacePath);
      return true;
    } catch (error) {
      console.error('Failed to remove marketplace:', error);
      return false;
    }
  }

  /**
   * Install a plugin (create symlinks)
   */
  async installPlugin(request: PluginInstallRequest): Promise<PluginInstallResult> {
    const { pluginName, marketplaceName } = request;

    // Check if plugin exists
    if (!pluginPaths.pluginExists(marketplaceName, pluginName)) {
      return {
        success: false,
        error: `Plugin '${pluginName}' not found in marketplace '${marketplaceName}'`,
      };
    }

    try {
      const pluginPath = pluginPaths.getPluginPath(marketplaceName, pluginName);

      // Parse plugin
      const parsedPlugin = await pluginParser.parsePlugin(pluginPath, marketplaceName, pluginName);

      // Check if plugin is valid
      const validation = await pluginParser.validatePlugin(pluginPath, pluginName);
      if (!validation.valid) {
        return {
          success: false,
          error: `Plugin validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Create symlinks
      await pluginSymlink.createSymlinks(parsedPlugin);

      // Get installed plugin info
      const installedPlugin = await pluginScanner.scanPlugin(marketplaceName, pluginName);

      if (!installedPlugin) {
        return {
          success: false,
          error: 'Failed to verify plugin installation',
        };
      }

      return {
        success: true,
        plugin: installedPlugin,
        message: 'Plugin installed successfully. Restart or refresh to use the new plugin.',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to install plugin',
      };
    }
  }

  /**
   * Uninstall a plugin (remove symlinks)
   */
  async uninstallPlugin(pluginName: string, marketplaceName: string): Promise<boolean> {
    try {
      const pluginPath = pluginPaths.getPluginPath(marketplaceName, pluginName);

      if (!fs.existsSync(pluginPath)) {
        return false;
      }

      // Parse plugin to get components
      const parsedPlugin = await pluginParser.parsePlugin(pluginPath, marketplaceName, pluginName);

      // Remove symlinks
      await pluginSymlink.removeSymlinks(parsedPlugin);

      return true;
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      return false;
    }
  }

  /**
   * Enable a plugin (create symlinks)
   */
  async enablePlugin(pluginName: string, marketplaceName: string): Promise<boolean> {
    const request: PluginInstallRequest = {
      pluginName,
      marketplaceName,
      marketplaceId: marketplaceName,
    };

    const result = await this.installPlugin(request);
    return result.success;
  }

  /**
   * Disable a plugin (remove symlinks)
   */
  async disablePlugin(pluginName: string, marketplaceName: string): Promise<boolean> {
    return await this.uninstallPlugin(pluginName, marketplaceName);
  }

  /**
   * Clone marketplace from git repository
   */
  private async cloneMarketplace(
    source: string,
    targetPath: string,
    branch: string,
    isGitHub: boolean
  ): Promise<void> {
    let gitUrl = source;

    // Convert GitHub shorthand (owner/repo) to full URL
    if (isGitHub && !source.startsWith('http') && !source.startsWith('git@')) {
      gitUrl = `https://github.com/${source}.git`;
    }

    try {
      const command = `git clone --branch ${branch} --depth 1 ${gitUrl} "${targetPath}"`;
      await execAsync(command);
      console.log(`Cloned marketplace from ${gitUrl}`);
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Copy local marketplace directory
   */
  private async copyLocalMarketplace(sourcePath: string, targetPath: string): Promise<void> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source path does not exist: ${sourcePath}`);
    }

    if (!fs.statSync(sourcePath).isDirectory()) {
      throw new Error(`Source path is not a directory: ${sourcePath}`);
    }

    try {
      await this.copyDirectory(sourcePath, targetPath);
      console.log(`Copied local marketplace from ${sourcePath}`);
    } catch (error) {
      throw new Error(`Failed to copy directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(source: string, target: string): Promise<void> {
    // Create target directory
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);

      // Skip .git, node_modules, and hidden files (except .claude-plugin)
      if (entry.name === '.git' || entry.name === 'node_modules' || 
          (entry.name.startsWith('.') && entry.name !== '.claude-plugin' && entry.name !== '.mcp.json')) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  /**
   * Remove directory recursively
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }

  /**
   * Sanitize name for directory usage
   */
  private sanitizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  }
}

export const pluginInstaller = new PluginInstaller();

