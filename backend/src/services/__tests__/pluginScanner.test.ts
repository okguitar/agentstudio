/**
 * Unit tests for pluginScanner.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';

// Mock modules
vi.mock('fs');
vi.mock('../pluginPaths');
vi.mock('../pluginParser');
vi.mock('../pluginSymlink');

describe('PluginScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scanMarketplaces', () => {
    it('should scan all marketplaces', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.listMarketplaces).mockReturnValue(['market1', 'market2']);
      vi.mocked(pluginPaths.getMarketplacePath).mockImplementation((name) => `/test/.claude/plugins/marketplaces/${name}`);
      vi.mocked(pluginPaths.listPlugins).mockReturnValue(['plugin1']);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        name: 'Test Market',
        owner: { name: 'Test' }
      }));
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

      const { pluginScanner } = await import('../pluginScanner');
      const marketplaces = await pluginScanner.scanMarketplaces();

      expect(marketplaces).toHaveLength(2);
      expect(marketplaces[0].id).toBe('market1');
      expect(marketplaces[1].id).toBe('market2');
    });

    it('should handle marketplaces without manifest', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.listMarketplaces).mockReturnValue(['no-manifest-market']);
      vi.mocked(pluginPaths.getMarketplacePath).mockReturnValue('/test/.claude/plugins/marketplaces/no-manifest-market');
      vi.mocked(pluginPaths.listPlugins).mockReturnValue([]);

      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        return !p.toString().includes('marketplace.json');
      });

      const { pluginScanner } = await import('../pluginScanner');
      const marketplaces = await pluginScanner.scanMarketplaces();

      expect(marketplaces).toHaveLength(1);
      expect(marketplaces[0].displayName).toBe('no-manifest-market');
    });
  });

  describe('scanMarketplace', () => {
    it('should scan a single marketplace', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getMarketplacePath).mockReturnValue('/test/.claude/plugins/marketplaces/test-market');
      vi.mocked(pluginPaths.listPlugins).mockReturnValue(['plugin1', 'plugin2']);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        name: 'Test Market',
        description: 'A test marketplace',
        owner: { name: 'Test Owner' }
      }));

      const { pluginScanner } = await import('../pluginScanner');
      const marketplace = await pluginScanner.scanMarketplace('test-market');

      expect(marketplace).not.toBeNull();
      expect(marketplace?.id).toBe('test-market');
      expect(marketplace?.displayName).toBe('Test Market');
      expect(marketplace?.pluginCount).toBe(2);
    });

    it('should return null for non-existent marketplace', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getMarketplacePath).mockReturnValue('/test/.claude/plugins/marketplaces/nonexistent');

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { pluginScanner } = await import('../pluginScanner');
      const marketplace = await pluginScanner.scanMarketplace('nonexistent');

      expect(marketplace).toBeNull();
    });

    it('should detect git marketplace type', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getMarketplacePath).mockReturnValue('/test/.claude/plugins/marketplaces/git-market');
      vi.mocked(pluginPaths.listPlugins).mockReturnValue([]);

      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        return p.toString().includes('.git') || !p.toString().includes('marketplace.json');
      });
      vi.mocked(fs.readFileSync).mockReturnValue('url = https://github.com/test/repo.git');

      const { pluginScanner } = await import('../pluginScanner');
      const marketplace = await pluginScanner.scanMarketplace('git-market');

      expect(marketplace?.type).toBe('github');
    });
  });

  describe('scanInstalledPlugins', () => {
    it('should scan all installed plugins', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: ['hello'],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/path',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.listMarketplaces).mockReturnValue(['market1']);
      vi.mocked(pluginPaths.listPlugins).mockReturnValue(['test-plugin']);
      vi.mocked(pluginPaths.getPluginPath).mockReturnValue('/test/path');

      const { pluginParser } = await import('../pluginParser');
      vi.mocked(pluginParser.parsePlugin).mockResolvedValue(mockParsedPlugin as any);

      const { pluginSymlink } = await import('../pluginSymlink');
      vi.mocked(pluginSymlink.checkSymlinks).mockResolvedValue(true);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        birthtime: new Date('2024-01-01')
      } as any);

      const { pluginScanner } = await import('../pluginScanner');
      const plugins = await pluginScanner.scanInstalledPlugins();

      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('test-plugin');
      expect(plugins[0].enabled).toBe(true);
    });
  });

  describe('scanPlugin', () => {
    it('should scan a single plugin', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: [{ name: 'hello', type: 'command', path: '/test', relativePath: 'hello.md' }],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/path',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getPluginPath).mockReturnValue('/test/path');

      const { pluginParser } = await import('../pluginParser');
      vi.mocked(pluginParser.parsePlugin).mockResolvedValue(mockParsedPlugin as any);

      const { pluginSymlink } = await import('../pluginSymlink');
      vi.mocked(pluginSymlink.checkSymlinks).mockResolvedValue(true);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        birthtime: new Date('2024-01-01')
      } as any);

      const { pluginScanner } = await import('../pluginScanner');
      const plugin = await pluginScanner.scanPlugin('test-market', 'test-plugin');

      expect(plugin).not.toBeNull();
      expect(plugin?.name).toBe('test-plugin');
      expect(plugin?.components.commands).toEqual(['hello']);
    });

    it('should return null for non-existent plugin', async () => {
      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getPluginPath).mockReturnValue('/test/path');

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { pluginScanner } = await import('../pluginScanner');
      const plugin = await pluginScanner.scanPlugin('test-market', 'nonexistent');

      expect(plugin).toBeNull();
    });
  });

  describe('getAvailablePlugins', () => {
    it('should get all available plugins with install status', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test Author' }
        },
        components: {
          commands: [{ name: 'hello', type: 'command', path: '/test', relativePath: 'hello.md' }],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/path',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      const mockInstalledPlugin = {
        id: 'test-plugin@test-market',
        name: 'test-plugin',
        version: '1.0.0',
        marketplace: 'test-market',
        marketplaceName: 'test-market',
        enabled: true,
        installedAt: new Date().toISOString(),
        manifest: mockParsedPlugin.manifest,
        components: {
          commands: ['hello'],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        installPath: '/test/path',
        symlinkCreated: true
      };

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.listMarketplaces).mockReturnValue(['test-market']);
      vi.mocked(pluginPaths.listPlugins).mockReturnValue(['test-plugin']);
      vi.mocked(pluginPaths.getPluginPath).mockReturnValue('/test/path');

      const { pluginParser } = await import('../pluginParser');
      vi.mocked(pluginParser.parsePlugin).mockResolvedValue(mockParsedPlugin as any);
      vi.mocked(pluginParser.readReadme).mockResolvedValue('# Test Plugin\n\nThis is a test plugin.');

      const { pluginSymlink } = await import('../pluginSymlink');
      vi.mocked(pluginSymlink.checkSymlinks).mockResolvedValue(true);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        birthtime: new Date('2024-01-01')
      } as any);

      // Mock scanInstalledPlugins to return the installed plugin
      const { pluginScanner } = await import('../pluginScanner');
      vi.spyOn(pluginScanner, 'scanInstalledPlugins').mockResolvedValue([mockInstalledPlugin as any]);

      const availablePlugins = await pluginScanner.getAvailablePlugins();

      expect(availablePlugins).toHaveLength(1);
      expect(availablePlugins[0].name).toBe('test-plugin');
      expect(availablePlugins[0].installed).toBe(true);
      expect(availablePlugins[0].enabled).toBe(true);
      expect(availablePlugins[0].readme).toContain('Test Plugin');
    });
  });
});

