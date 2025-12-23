/**
 * Unit tests for pluginPaths.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
vi.mock('fs');
vi.mock('os');

describe('PluginPaths', () => {
  const mockHomeDir = '/home/testuser';
  const mockClaudeDir = path.join(mockHomeDir, '.claude');

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined as any);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');
    vi.mocked(fs.readdirSync).mockReturnValue([]);
  });

  describe('Path Generation', () => {
    it('should generate correct claude directory path', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      const claudeDir = pluginPaths.getClaudeDir();
      expect(claudeDir).toBe(mockClaudeDir);
    });

    it('should generate correct plugins directory path', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      const pluginsDir = pluginPaths.getPluginsDir();
      expect(pluginsDir).toBe(path.join(mockClaudeDir, 'plugins'));
    });

    it('should generate correct marketplaces directory path', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      const marketplacesDir = pluginPaths.getMarketplacesDir();
      expect(marketplacesDir).toBe(path.join(mockClaudeDir, 'plugins', 'marketplaces'));
    });

    it('should generate correct marketplace path', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      const marketplacePath = pluginPaths.getMarketplacePath('test-market');
      expect(marketplacePath).toBe(
        path.join(mockClaudeDir, 'plugins', 'marketplaces', 'test-market')
      );
    });

    it('should generate correct plugin path', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      const pluginPath = pluginPaths.getPluginPath('test-market', 'test-plugin');
      expect(pluginPath).toBe(
        path.join(mockClaudeDir, 'plugins', 'marketplaces', 'test-market', 'plugins', 'test-plugin')
      );
    });

    it('should generate correct commands symlink directory', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      const commandsDir = pluginPaths.getCommandsDir();
      expect(commandsDir).toBe(path.join(mockClaudeDir, 'commands'));
    });

    it('should generate correct skills symlink directory', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      const skillsDir = pluginPaths.getSkillsDir();
      expect(skillsDir).toBe(path.join(mockClaudeDir, 'skills'));
    });
  });

  describe('Directory Checking', () => {
    it('should check if marketplace exists', async () => {
      const { pluginPaths } = await import('../pluginPaths');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

      const exists = pluginPaths.marketplaceExists('test-market');
      expect(exists).toBe(true);
    });

    it('should return false if marketplace does not exist', async () => {
      const { pluginPaths } = await import('../pluginPaths');

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const exists = pluginPaths.marketplaceExists('nonexistent');
      expect(exists).toBe(false);
    });

    it('should check if plugin exists', async () => {
      const { pluginPaths } = await import('../pluginPaths');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

      const exists = pluginPaths.pluginExists('test-market', 'test-plugin');
      expect(exists).toBe(true);
    });
  });

  describe('Directory Listing', () => {
    it('should list all marketplaces', async () => {
      const { pluginPaths } = await import('../pluginPaths');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['market1', 'market2', 'market3'] as any);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

      const marketplaces = pluginPaths.listMarketplaces();
      expect(marketplaces).toEqual(['market1', 'market2', 'market3']);
    });

    it('should return empty array if marketplaces dir does not exist', async () => {
      const { pluginPaths } = await import('../pluginPaths');

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const marketplaces = pluginPaths.listMarketplaces();
      expect(marketplaces).toEqual([]);
    });

    it('should list all plugins in a marketplace with standard structure', async () => {
      const { pluginPaths } = await import('../pluginPaths');

      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        // plugins/ directory exists
        if (pathStr.includes('/plugins') && !pathStr.includes('plugin1') && !pathStr.includes('plugin2')) return true;
        // plugin manifest files exist
        if (pathStr.includes('plugin.json')) return true;
        return false;
      });
      vi.mocked(fs.readdirSync).mockReturnValue(['plugin1', 'plugin2'] as any);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

      const plugins = pluginPaths.listPlugins('test-market');
      expect(plugins).toEqual(['plugin1', 'plugin2']);
    });

    it('should list plugins in flat structure (no plugins/ directory)', async () => {
      // This test is currently skipped due to complex mock interactions
      // TODO: Revisit this test with better mock setup
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        // marketplace.json doesn't exist (flat structure, not marketplace-defined)
        if (pathStr.includes('marketplace.json')) return false;
        // plugins/ directory doesn't exist (this is the key check)
        if (pathStr.endsWith('/plugins') || pathStr.endsWith('\\plugins')) return false;
        // marketplace root exists
        if (pathStr.includes('test-market') && !pathStr.includes('plugin1') && !pathStr.includes('plugin2')) return true;
        // plugin manifest files exist for plugin1 and plugin2
        if (pathStr.includes('plugin1') && pathStr.includes('plugin.json')) return true;
        if (pathStr.includes('plugin2') && pathStr.includes('plugin.json')) return true;
        // .claude-plugin directory exists for plugin1 and plugin2
        if (pathStr.includes('plugin1') && pathStr.includes('.claude-plugin')) return true;
        if (pathStr.includes('plugin2') && pathStr.includes('.claude-plugin')) return true;
        // ensure base directories exist - BE SPECIFIC to avoid matching random files
        if (pathStr === mockClaudeDir || pathStr === mockHomeDir) return true;
        if (pathStr === path.join(mockClaudeDir, 'plugins', 'marketplaces')) return true;
        return false;
      });
      vi.mocked(fs.readdirSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        if (pathStr.includes('test-market') && !pathStr.includes('plugin1') && !pathStr.includes('plugin2')) {
          return ['plugin1', 'plugin2', '.git', 'README.md'] as any;
        }
        return [] as any;
      });
      vi.mocked(fs.statSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        // Only plugin directories should return true for isDirectory, not .git or README.md
        return {
          isDirectory: () => {
            if (pathStr.endsWith('README.md')) return false;
            return pathStr.includes('plugin1') || pathStr.includes('plugin2') || pathStr.includes('.git') ||
              pathStr === mockClaudeDir || pathStr === mockHomeDir ||
              pathStr === path.join(mockClaudeDir, 'plugins', 'marketplaces') ||
              pathStr === path.join(mockClaudeDir, 'plugins', 'marketplaces', 'test-market');
          }
        } as any;
      });

      const { pluginPaths } = await import('../pluginPaths');
      const plugins = pluginPaths.listPlugins('test-market');
      expect(plugins).toEqual(['plugin1', 'plugin2']);
    });

    it('should filter out non-directories when listing', async () => {
      const { pluginPaths } = await import('../pluginPaths');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['plugin1', 'file.txt', 'plugin2'] as any);
      vi.mocked(fs.statSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        return {
          isDirectory: () => !pathStr.includes('file.txt')
        } as any;
      });

      const plugins = pluginPaths.listPlugins('test-market');
      expect(plugins).toEqual(['plugin1', 'plugin2']);
    });
  });
});

