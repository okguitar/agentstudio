import * as fs from 'fs';
import * as path from 'path';
import { ParsedPlugin, PluginManifest, PluginComponent, PluginFile } from '../types/plugins';

/**
 * Plugin Parser Service
 * Parses plugin directories according to Claude Code plugin specification
 */
class PluginParser {
  /**
   * Parse a plugin directory
   */
  async parsePlugin(pluginPath: string, marketplaceName: string, pluginName: string): Promise<ParsedPlugin> {
    // Read plugin manifest
    const manifest = await this.readManifest(pluginPath, pluginName);

    // Parse components
    const components = await this.parseComponents(pluginPath, pluginName);

    // Get all files
    const files = await this.getAllFiles(pluginPath);

    return {
      manifest,
      components,
      files,
      path: pluginPath,
      marketplaceName,
      pluginName,
    };
  }

  /**
   * Read plugin manifest (.claude-plugin/plugin.json or from marketplace.json)
   */
  private async readManifest(pluginPath: string, pluginName?: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    // First, try standard plugin.json
    if (fs.existsSync(manifestPath)) {
      try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(content);

        // Validate required fields
        if (!manifest.name || !manifest.description || !manifest.version || !manifest.author) {
          throw new Error('Plugin manifest is missing required fields (name, description, version, author)');
        }

        return manifest;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to parse plugin manifest: ${error.message}`);
        }
        throw error;
      }
    }

    // Fallback: try to read from marketplace.json (for marketplace-defined plugins)
    // Check if pluginPath itself has marketplace.json (for virtual plugins where source is "./")
    const marketplaceManifestPath = path.join(pluginPath, '.claude-plugin', 'marketplace.json');

    if (fs.existsSync(marketplaceManifestPath)) {
      try {
        const content = fs.readFileSync(marketplaceManifestPath, 'utf-8');
        const marketplaceManifest = JSON.parse(content);

        // Find plugin definition in marketplace.json
        if (marketplaceManifest.plugins && Array.isArray(marketplaceManifest.plugins)) {
          // Use provided pluginName if available, otherwise try to match by source path
          let pluginDef;

          if (pluginName) {
            pluginDef = marketplaceManifest.plugins.find((p: any) => p.name === pluginName);
          } else {
            pluginDef = marketplaceManifest.plugins.find((p: any) => {
              const resolvedSource = path.resolve(pluginPath, p.source);
              return resolvedSource === pluginPath;
            });
          }

          if (pluginDef) {
            // Create a synthetic manifest from marketplace plugin definition
            return {
              name: pluginDef.name,
              description: pluginDef.description || 'No description available',
              version: marketplaceManifest.metadata?.version || '1.0.0',
              author: marketplaceManifest.owner || { name: 'Unknown' },
            };
          }
        }
      } catch (error) {
        console.error('Failed to read marketplace manifest:', error);
      }
    }

    // Also try parent directory in case pluginPath is a subdirectory
    const parentPath = path.dirname(pluginPath);
    const parentMarketplaceManifestPath = path.join(parentPath, '.claude-plugin', 'marketplace.json');

    if (fs.existsSync(parentMarketplaceManifestPath)) {
      try {
        const content = fs.readFileSync(parentMarketplaceManifestPath, 'utf-8');
        const marketplaceManifest = JSON.parse(content);
        const pluginName = path.basename(pluginPath);

        // Find plugin definition in marketplace.json
        if (marketplaceManifest.plugins && Array.isArray(marketplaceManifest.plugins)) {
          const pluginDef = marketplaceManifest.plugins.find((p: any) => p.name === pluginName);

          if (pluginDef) {
            // Create a synthetic manifest from marketplace plugin definition
            return {
              name: pluginDef.name,
              description: pluginDef.description || 'No description available',
              version: marketplaceManifest.metadata?.version || '1.0.0',
              author: marketplaceManifest.owner || { name: 'Unknown' },
            };
          }
        }
      } catch (error) {
        console.error('Failed to read parent marketplace manifest:', error);
      }
    }

    throw new Error('Plugin manifest not found (.claude-plugin/plugin.json or marketplace.json)');
  }

  /**
   * Parse plugin components
   */
  private async parseComponents(pluginPath: string, pluginName?: string): Promise<ParsedPlugin['components']> {
    const components: ParsedPlugin['components'] = {
      commands: [],
      agents: [],
      skills: [],
      hooks: [],
      mcpServers: [],
    };

    // Check if this plugin is defined in marketplace.json with skills
    // First check if pluginPath itself has marketplace.json (for virtual plugins)
    let marketplaceManifestPath = path.join(pluginPath, '.claude-plugin', 'marketplace.json');
    let usePluginPath = pluginPath;

    // If not found, try parent directory
    if (!fs.existsSync(marketplaceManifestPath)) {
      usePluginPath = path.dirname(pluginPath);
      marketplaceManifestPath = path.join(usePluginPath, '.claude-plugin', 'marketplace.json');
    }

    if (fs.existsSync(marketplaceManifestPath) && pluginName) {
      try {
        const content = fs.readFileSync(marketplaceManifestPath, 'utf-8');
        const marketplaceManifest = JSON.parse(content);

        if (marketplaceManifest.plugins && Array.isArray(marketplaceManifest.plugins)) {
          const pluginDef = marketplaceManifest.plugins.find((p: any) => p.name === pluginName);

          // If plugin has skills array in marketplace.json, parse those
          if (pluginDef && pluginDef.skills && Array.isArray(pluginDef.skills)) {
            for (const skillPath of pluginDef.skills) {
              const fullSkillPath = path.join(usePluginPath, skillPath, 'SKILL.md');
              if (fs.existsSync(fullSkillPath)) {
                const relativePath = path.relative(pluginPath, fullSkillPath);
                const description = await this.extractDescription(fullSkillPath);
                const skillName = path.basename(path.dirname(fullSkillPath));
                components.skills.push({
                  type: 'skill',
                  name: skillName,
                  path: fullSkillPath,
                  relativePath,
                  description,
                });
              }
            }

            // Return early if we found marketplace-defined skills
            if (components.skills.length > 0) {
              return components;
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse marketplace manifest for components:', error);
      }
    }

    // Standard component parsing (original logic)

    // Parse commands (commands/*.md)
    const commandsDir = path.join(pluginPath, 'commands');
    if (fs.existsSync(commandsDir) && fs.statSync(commandsDir).isDirectory()) {
      const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));
      for (const file of commandFiles) {
        const commandPath = path.join(commandsDir, file);
        const relativePath = path.relative(pluginPath, commandPath);
        const description = await this.extractDescription(commandPath);
        components.commands.push({
          type: 'command',
          name: path.basename(file, '.md'),
          path: commandPath,
          relativePath,
          description,
        });
      }
    }

    // Parse agents (agents/*.md)
    const agentsDir = path.join(pluginPath, 'agents');
    if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
      const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      for (const file of agentFiles) {
        const agentPath = path.join(agentsDir, file);
        const relativePath = path.relative(pluginPath, agentPath);
        const description = await this.extractDescription(agentPath);
        components.agents.push({
          type: 'agent',
          name: path.basename(file, '.md'),
          path: agentPath,
          relativePath,
          description,
        });
      }
    }

    // Parse skills (skills/*/SKILL.md)
    const skillsDir = path.join(pluginPath, 'skills');
    if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
      const skillDirs = fs.readdirSync(skillsDir).filter(f => {
        const skillPath = path.join(skillsDir, f);
        return fs.statSync(skillPath).isDirectory();
      });

      for (const dir of skillDirs) {
        const skillPath = path.join(skillsDir, dir, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const relativePath = path.relative(pluginPath, skillPath);
          const description = await this.extractDescription(skillPath);
          components.skills.push({
            type: 'skill',
            name: dir,
            path: skillPath,
            relativePath,
            description,
          });
        }
      }
    }

    // Parse hooks (hooks/hooks.json)
    const hooksPath = path.join(pluginPath, 'hooks', 'hooks.json');
    if (fs.existsSync(hooksPath)) {
      try {
        const hooksContent = fs.readFileSync(hooksPath, 'utf-8');
        const hooks = JSON.parse(hooksContent);
        const relativePath = path.relative(pluginPath, hooksPath);
        if (hooks.hooks && Array.isArray(hooks.hooks)) {
          for (const hook of hooks.hooks) {
            components.hooks.push({
              type: 'hook',
              name: hook.event || 'unknown',
              path: hooksPath,
              relativePath,
              description: hook.description,
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse hooks:', error);
      }
    }

    // Parse MCP servers (.mcp.json)
    const mcpPath = path.join(pluginPath, '.mcp.json');
    if (fs.existsSync(mcpPath)) {
      try {
        const mcpContent = fs.readFileSync(mcpPath, 'utf-8');
        const mcp = JSON.parse(mcpContent);
        const relativePath = path.relative(pluginPath, mcpPath);
        if (mcp.mcpServers) {
          for (const [name, config] of Object.entries(mcp.mcpServers)) {
            components.mcpServers.push({
              type: 'mcp',
              name,
              path: mcpPath,
              relativePath,
              description: (config as any).description,
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse MCP config:', error);
      }
    }

    return components;
  }

  /**
   * Extract description from markdown file (from frontmatter or first paragraph)
   */
  private async extractDescription(filePath: string): Promise<string | undefined> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Try to extract from frontmatter
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const descMatch = frontmatter.match(/description:\s*(.+)/);
        if (descMatch) {
          return descMatch[1].trim();
        }
      }
      
      // Try to extract first paragraph
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
          return trimmed;
        }
      }
    } catch (error) {
      console.error('Failed to extract description:', error);
    }
    
    return undefined;
  }

  /**
   * Get all files in plugin directory
   */
  private async getAllFiles(pluginPath: string, baseDir: string = pluginPath): Promise<PluginFile[]> {
    const files: PluginFile[] = [];
    
    try {
      const entries = fs.readdirSync(pluginPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(pluginPath, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        // Skip node_modules and hidden files (except .claude-plugin and .mcp.json)
        if (entry.name === 'node_modules' || 
            (entry.name.startsWith('.') && entry.name !== '.claude-plugin' && entry.name !== '.mcp.json')) {
          continue;
        }
        
        if (entry.isDirectory()) {
          files.push({
            path: fullPath,
            relativePath,
            type: 'directory',
          });
          
          // Recursively get files in subdirectory
          const subFiles = await this.getAllFiles(fullPath, baseDir);
          files.push(...subFiles);
        } else {
          const stats = fs.statSync(fullPath);
          files.push({
            path: fullPath,
            relativePath,
            type: 'file',
            size: stats.size,
          });
        }
      }
    } catch (error) {
      console.error('Failed to read directory:', error);
    }
    
    return files;
  }

  /**
   * Read file content
   */
  async readFileContent(filePath: string): Promise<string> {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  /**
   * Read README file if exists
   */
  async readReadme(pluginPath: string): Promise<string | undefined> {
    const readmeNames = ['README.md', 'README.MD', 'readme.md', 'README', 'README.txt'];
    
    for (const name of readmeNames) {
      const readmePath = path.join(pluginPath, name);
      if (fs.existsSync(readmePath)) {
        try {
          return fs.readFileSync(readmePath, 'utf-8');
        } catch (error) {
          console.error('Failed to read README:', error);
        }
      }
    }
    
    return undefined;
  }

  /**
   * Validate plugin structure
   */
  async validatePlugin(pluginPath: string, pluginName?: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check if directory exists
    if (!fs.existsSync(pluginPath)) {
      errors.push('Plugin directory does not exist');
      return { valid: false, errors };
    }
    
    // Try to read manifest using the same logic as readManifest
    try {
      await this.readManifest(pluginPath, pluginName);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        errors.push('Failed to read plugin manifest');
      }
      return { valid: false, errors };
    }
    
    return {
      valid: true,
      errors: [],
    };
  }
}

export const pluginParser = new PluginParser();

