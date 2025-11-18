import * as fs from 'fs';
import * as path from 'path';
import { pluginPaths } from './pluginPaths';
import { pluginParser } from './pluginParser';
import { pluginSymlink } from './pluginSymlink';
import { InstalledPlugin, PluginMarketplace, AvailablePlugin, MarketplaceManifest } from '../types/plugins';

/**
 * Plugin Scanner Service
 * Scans ~/.claude/plugins/marketplaces for installed plugins and marketplaces
 */
class PluginScanner {
  /**
   * Scan all marketplaces
   */
  async scanMarketplaces(): Promise<PluginMarketplace[]> {
    const marketplaceNames = pluginPaths.listMarketplaces();
    const marketplaces: PluginMarketplace[] = [];

    for (const name of marketplaceNames) {
      try {
        const marketplace = await this.scanMarketplace(name);
        if (marketplace) {
          marketplaces.push(marketplace);
        }
      } catch (error) {
        console.error(`Failed to scan marketplace ${name}:`, error);
      }
    }

    return marketplaces;
  }

  /**
   * Scan a single marketplace
   */
  async scanMarketplace(marketplaceName: string): Promise<PluginMarketplace | null> {
    const marketplacePath = pluginPaths.getMarketplacePath(marketplaceName);

    if (!fs.existsSync(marketplacePath)) {
      return null;
    }

    // Read marketplace manifest if exists
    const manifestPath = path.join(marketplacePath, '.claude-plugin', 'marketplace.json');
    let manifest: MarketplaceManifest | null = null;
    
    if (fs.existsSync(manifestPath)) {
      try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        manifest = JSON.parse(content);
      } catch (error) {
        console.error(`Failed to read marketplace manifest for ${marketplaceName}:`, error);
      }
    }

    // Count plugins
    const pluginNames = pluginPaths.listPlugins(marketplaceName);

    // Try to determine source type
    let type: 'git' | 'github' | 'local' = 'local';
    let source = marketplacePath;

    // Check if it's a git repository
    const gitDir = path.join(marketplacePath, '.git');
    if (fs.existsSync(gitDir)) {
      type = 'git';
      // Try to read remote URL
      try {
        const gitConfigPath = path.join(gitDir, 'config');
        if (fs.existsSync(gitConfigPath)) {
          const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
          const urlMatch = gitConfig.match(/url\s*=\s*(.+)/);
          if (urlMatch) {
            source = urlMatch[1].trim();
            if (source.includes('github.com')) {
              type = 'github';
            }
          }
        }
      } catch (error) {
        console.error('Failed to read git config:', error);
      }
    }

    return {
      id: marketplaceName,
      name: marketplaceName,
      displayName: manifest?.name || marketplaceName,
      type,
      source,
      description: manifest?.description,
      path: marketplacePath,
      pluginCount: pluginNames.length,
      owner: manifest?.owner,
    };
  }

  /**
   * Scan all installed plugins across all marketplaces
   * Only returns plugins that have symlinks created (truly installed)
   */
  async scanInstalledPlugins(): Promise<InstalledPlugin[]> {
    const marketplaceNames = pluginPaths.listMarketplaces();
    const plugins: InstalledPlugin[] = [];

    for (const marketplaceName of marketplaceNames) {
      const marketplacePlugins = await this.scanMarketplacePlugins(marketplaceName);
      // Only include plugins that are actually installed (have symlinks)
      plugins.push(...marketplacePlugins.filter(p => p.enabled));
    }

    return plugins;
  }

  /**
   * Scan plugins in a specific marketplace
   * Returns all plugins in the marketplace (for internal use)
   */
  async scanMarketplacePlugins(marketplaceName: string): Promise<InstalledPlugin[]> {
    const pluginNames = pluginPaths.listPlugins(marketplaceName);
    const plugins: InstalledPlugin[] = [];

    for (const pluginName of pluginNames) {
      try {
        const plugin = await this.scanPlugin(marketplaceName, pluginName);
        if (plugin) {
          plugins.push(plugin);
        }
      } catch (error) {
        console.error(`Failed to scan plugin ${pluginName} in ${marketplaceName}:`, error);
      }
    }

    return plugins;
  }

  /**
   * Scan a single plugin
   */
  async scanPlugin(marketplaceName: string, pluginName: string): Promise<InstalledPlugin | null> {
    const pluginPath = pluginPaths.getPluginPath(marketplaceName, pluginName);

    if (!fs.existsSync(pluginPath)) {
      return null;
    }

    try {
      // Parse plugin
      const parsedPlugin = await pluginParser.parsePlugin(pluginPath, marketplaceName, pluginName);

      // Check if symlinks are created
      const symlinkCreated = await pluginSymlink.checkSymlinks(parsedPlugin);

      // Get install timestamp
      const stats = fs.statSync(pluginPath);
      const installedAt = stats.birthtime.toISOString();

      // Build installed plugin object
      const plugin: InstalledPlugin = {
        id: `${pluginName}@${marketplaceName}`,
        name: pluginName,
        version: parsedPlugin.manifest.version,
        marketplace: marketplaceName,
        marketplaceName: marketplaceName,
        enabled: symlinkCreated, // Enabled if symlinks exist
        installedAt,
        manifest: parsedPlugin.manifest,
        components: {
          commands: parsedPlugin.components.commands.map(c => c.name),
          agents: parsedPlugin.components.agents.map(c => c.name),
          skills: parsedPlugin.components.skills.map(c => c.name),
          hooks: parsedPlugin.components.hooks.map(c => c.name),
          mcpServers: parsedPlugin.components.mcpServers.map(c => c.name),
        },
        installPath: pluginPath,
        symlinkCreated,
      };

      return plugin;
    } catch (error) {
      console.error(`Failed to parse plugin ${pluginName}:`, error);
      return null;
    }
  }

  /**
   * Get all available plugins from all marketplaces
   */
  async getAvailablePlugins(): Promise<AvailablePlugin[]> {
    const marketplaceNames = pluginPaths.listMarketplaces();
    const installedPlugins = await this.scanInstalledPlugins();
    const availablePlugins: AvailablePlugin[] = [];

    for (const marketplaceName of marketplaceNames) {
      const pluginNames = pluginPaths.listPlugins(marketplaceName);

      for (const pluginName of pluginNames) {
        try {
          const pluginPath = pluginPaths.getPluginPath(marketplaceName, pluginName);
          const parsedPlugin = await pluginParser.parsePlugin(pluginPath, marketplaceName, pluginName);

          // Check if installed (symlinks created)
          const installedPlugin = installedPlugins.find(
            p => p.name === pluginName && p.marketplaceName === marketplaceName
          );

          // Read README
          const readme = await pluginParser.readReadme(pluginPath);

          const availablePlugin: AvailablePlugin = {
            name: pluginName,
            version: parsedPlugin.manifest.version,
            description: parsedPlugin.manifest.description,
            author: parsedPlugin.manifest.author,
            marketplace: marketplaceName,
            marketplaceName: marketplaceName,
            marketplaceId: marketplaceName,
            source: pluginPath,
            installed: installedPlugin?.enabled ?? false, // Only installed if symlinks exist
            installedVersion: installedPlugin?.version,
            enabled: installedPlugin?.enabled,
            components: {
              commands: parsedPlugin.components.commands.length,
              agents: parsedPlugin.components.agents.length,
              skills: parsedPlugin.components.skills.length,
              hooks: parsedPlugin.components.hooks.length,
              mcpServers: parsedPlugin.components.mcpServers.length,
            },
            readme,
          };

          availablePlugins.push(availablePlugin);
        } catch (error) {
          console.error(`Failed to get available plugin ${pluginName}:`, error);
        }
      }
    }

    return availablePlugins;
  }
}

export const pluginScanner = new PluginScanner();

