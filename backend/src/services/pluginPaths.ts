import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Plugin Paths Service
 * Manages paths according to Claude Code's standard structure
 */
class PluginPaths {
  private claudeDir: string;

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude');
    this.ensureDirectories();
  }

  /**
   * Get base .claude directory
   */
  getClaudeDir(): string {
    return this.claudeDir;
  }

  /**
   * Get plugins base directory (~/.claude/plugins)
   */
  getPluginsDir(): string {
    return path.join(this.claudeDir, 'plugins');
  }

  /**
   * Get marketplaces directory (~/.claude/plugins/marketplaces)
   */
  getMarketplacesDir(): string {
    return path.join(this.getPluginsDir(), 'marketplaces');
  }

  /**
   * Get marketplace directory path
   */
  getMarketplacePath(marketplaceName: string): string {
    return path.join(this.getMarketplacesDir(), marketplaceName);
  }

  /**
   * Get plugins directory within a marketplace
   */
  getMarketplacePluginsDir(marketplaceName: string): string {
    return path.join(this.getMarketplacePath(marketplaceName), 'plugins');
  }

  /**
   * Get specific plugin directory
   * Supports standard, flat, and marketplace-defined (virtual) structures
   */
  getPluginPath(marketplaceName: string, pluginName: string): string {
    const marketplacePath = this.getMarketplacePath(marketplaceName);

    // Check if plugin is defined in marketplace.json with a source
    const marketplaceManifestPath = path.join(marketplacePath, '.claude-plugin', 'marketplace.json');
    if (fs.existsSync(marketplaceManifestPath)) {
      try {
        const manifestContent = fs.readFileSync(marketplaceManifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        if (manifest.plugins && Array.isArray(manifest.plugins)) {
          const pluginDef = manifest.plugins.find((p: any) => p.name === pluginName);
          if (pluginDef && pluginDef.source) {
            // Resolve source path relative to marketplace
            return path.resolve(marketplacePath, pluginDef.source);
          }
        }
      } catch (error) {
        console.error(`Failed to read marketplace manifest for ${marketplaceName}:`, error);
      }
    }

    // Check standard structure (marketplace/plugins/plugin-name)
    const standardPath = path.join(this.getMarketplacePluginsDir(marketplaceName), pluginName);
    if (fs.existsSync(standardPath)) {
      return standardPath;
    }

    // Fallback to flat structure (marketplace/plugin-name)
    const flatPath = path.join(marketplacePath, pluginName);
    return flatPath;
  }

  /**
   * Get commands symlink directory (~/.claude/commands)
   */
  getCommandsDir(): string {
    return path.join(this.claudeDir, 'commands');
  }

  /**
   * Get agents symlink directory (~/.claude/agents)
   */
  getAgentsDir(): string {
    return path.join(this.claudeDir, 'agents');
  }

  /**
   * Get skills symlink directory (~/.claude/skills)
   */
  getSkillsDir(): string {
    return path.join(this.claudeDir, 'skills');
  }

  /**
   * Get hooks directory (~/.claude/hooks)
   */
  getHooksDir(): string {
    return path.join(this.claudeDir, 'hooks');
  }

  /**
   * Get MCP servers directory (~/.claude/mcp)
   */
  getMcpDir(): string {
    return path.join(this.claudeDir, 'mcp');
  }

  /**
   * Ensure all required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      this.claudeDir,
      this.getPluginsDir(),
      this.getMarketplacesDir(),
      this.getCommandsDir(),
      this.getAgentsDir(),
      this.getSkillsDir(),
      this.getHooksDir(),
      this.getMcpDir(),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Check if a marketplace exists
   */
  marketplaceExists(marketplaceName: string): boolean {
    const marketplacePath = this.getMarketplacePath(marketplaceName);
    return fs.existsSync(marketplacePath) && fs.statSync(marketplacePath).isDirectory();
  }

  /**
   * Check if a plugin exists
   */
  pluginExists(marketplaceName: string, pluginName: string): boolean {
    const pluginPath = this.getPluginPath(marketplaceName, pluginName);
    return fs.existsSync(pluginPath) && fs.statSync(pluginPath).isDirectory();
  }

  /**
   * List all marketplaces
   */
  listMarketplaces(): string[] {
    const marketplacesDir = this.getMarketplacesDir();
    if (!fs.existsSync(marketplacesDir)) {
      return [];
    }

    try {
      return fs.readdirSync(marketplacesDir).filter(name => {
        const fullPath = path.join(marketplacesDir, name);
        return fs.statSync(fullPath).isDirectory();
      });
    } catch (error) {
      console.error('Failed to list marketplaces:', error);
      return [];
    }
  }

  /**
   * List all plugins in a marketplace
   * Supports three structures:
   * 1. Standard: marketplace/plugins/plugin-name/.claude-plugin/plugin.json
   * 2. Flat: marketplace/plugin-name/.claude-plugin/plugin.json
   * 3. Marketplace-defined: plugins defined in marketplace.json (for repos like anthropic-agent-skills)
   */
  listPlugins(marketplaceName: string): string[] {
    const marketplacePath = this.getMarketplacePath(marketplaceName);

    // First, check if marketplace.json defines plugins
    const marketplaceManifestPath = path.join(marketplacePath, '.claude-plugin', 'marketplace.json');
    if (fs.existsSync(marketplaceManifestPath)) {
      try {
        const manifestContent = fs.readFileSync(marketplaceManifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        // If marketplace.json has plugins array, use that
        if (manifest.plugins && Array.isArray(manifest.plugins)) {
          return manifest.plugins.map((p: any) => p.name);
        }
      } catch (error) {
        console.error(`Failed to read marketplace manifest for ${marketplaceName}:`, error);
      }
    }

    const pluginsDir = this.getMarketplacePluginsDir(marketplaceName);

    // Check if standard plugins/ directory exists
    if (fs.existsSync(pluginsDir)) {
      try {
        const plugins = fs.readdirSync(pluginsDir).filter(name => {
          const fullPath = path.join(pluginsDir, name);
          // Check if it's a directory and has plugin.json
          if (!fs.statSync(fullPath).isDirectory()) {
            return false;
          }
          const manifestPath = path.join(fullPath, '.claude-plugin', 'plugin.json');
          return fs.existsSync(manifestPath);
        });

        // If we found plugins in plugins/ directory, return them
        if (plugins.length > 0) {
          return plugins;
        }
      } catch (error) {
        console.error(`Failed to list plugins in ${pluginsDir}:`, error);
      }
    }

    // Fallback: scan root directory for plugins (flat structure)
    // This handles cases where plugins are at the root
    try {
      if (!fs.existsSync(marketplacePath)) {
        return [];
      }

      return fs.readdirSync(marketplacePath).filter(name => {
        // Skip common non-plugin directories
        if (['.git', 'node_modules', '.github', 'docs', 'examples', 'scripts', 'tests', '__tests__'].includes(name)) {
          return false;
        }

        const fullPath = path.join(marketplacePath, name);

        // Check if it's a directory and has plugin.json
        try {
          if (!fs.statSync(fullPath).isDirectory()) {
            return false;
          }
          const manifestPath = path.join(fullPath, '.claude-plugin', 'plugin.json');
          return fs.existsSync(manifestPath);
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error(`Failed to list plugins in ${marketplaceName}:`, error);
      return [];
    }
  }
}

export const pluginPaths = new PluginPaths();

