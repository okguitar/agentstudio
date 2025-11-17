/**
 * Unit tests for pluginSymlink.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock modules
vi.mock('fs');
vi.mock('../pluginPaths');

describe('PluginSymlink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSymlinks', () => {
    it('should create symlinks for commands', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: [{
            type: 'command' as const,
            name: 'hello',
            path: '/test/plugins/test-plugin/commands/hello.md',
            relativePath: 'commands/hello.md'
          }],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/plugins/test-plugin',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.symlinkSync).mockReturnValue(undefined);

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getCommandsDir).mockReturnValue('/test/.claude/commands');

      const { pluginSymlink } = await import('../pluginSymlink');
      
      await pluginSymlink.createSymlinks(mockParsedPlugin);

      expect(fs.symlinkSync).toHaveBeenCalledWith(
        '/test/plugins/test-plugin/commands/hello.md',
        '/test/.claude/commands/hello.md'
      );
    });

    it('should create symlinks for skills', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: [],
          agents: [],
          skills: [{
            type: 'skill' as const,
            name: 'my-skill',
            path: '/test/plugins/test-plugin/skills/my-skill/SKILL.md',
            relativePath: 'skills/my-skill/SKILL.md'
          }],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/plugins/test-plugin',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.symlinkSync).mockReturnValue(undefined);

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getSkillsDir).mockReturnValue('/test/.claude/skills');

      const { pluginSymlink } = await import('../pluginSymlink');
      
      await pluginSymlink.createSymlinks(mockParsedPlugin);

      expect(fs.symlinkSync).toHaveBeenCalledWith(
        '/test/plugins/test-plugin/skills/my-skill',
        '/test/.claude/skills/my-skill'
      );
    });

    it('should not create symlink if it already exists and points to correct target', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: [{
            type: 'command' as const,
            name: 'hello',
            path: '/test/plugins/test-plugin/commands/hello.md',
            relativePath: 'commands/hello.md'
          }],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/plugins/test-plugin',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.lstatSync).mockReturnValue({ isSymbolicLink: () => true } as any);
      vi.mocked(fs.readlinkSync).mockReturnValue('/test/plugins/test-plugin/commands/hello.md');

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getCommandsDir).mockReturnValue('/test/.claude/commands');

      const { pluginSymlink } = await import('../pluginSymlink');
      
      await pluginSymlink.createSymlinks(mockParsedPlugin);

      // Should not call symlinkSync since link already exists
      expect(fs.symlinkSync).not.toHaveBeenCalled();
    });

    it('should replace existing symlink if it points to different target', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: [{
            type: 'command' as const,
            name: 'hello',
            path: '/test/plugins/test-plugin/commands/hello.md',
            relativePath: 'commands/hello.md'
          }],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/plugins/test-plugin',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.lstatSync).mockReturnValue({ isSymbolicLink: () => true } as any);
      vi.mocked(fs.readlinkSync).mockReturnValue('/old/path/hello.md');
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
      vi.mocked(fs.symlinkSync).mockReturnValue(undefined);

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getCommandsDir).mockReturnValue('/test/.claude/commands');

      const { pluginSymlink } = await import('../pluginSymlink');
      
      await pluginSymlink.createSymlinks(mockParsedPlugin);

      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(fs.symlinkSync).toHaveBeenCalled();
    });
  });

  describe('removeSymlinks', () => {
    it('should remove symlinks for commands', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: [{
            type: 'command' as const,
            name: 'hello',
            path: '/test/plugins/test-plugin/commands/hello.md',
            relativePath: 'commands/hello.md'
          }],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/plugins/test-plugin',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.lstatSync).mockReturnValue({ isSymbolicLink: () => true } as any);
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getCommandsDir).mockReturnValue('/test/.claude/commands');

      const { pluginSymlink } = await import('../pluginSymlink');
      
      await pluginSymlink.removeSymlinks(mockParsedPlugin);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not remove non-symlink files', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: [{
            type: 'command' as const,
            name: 'hello',
            path: '/test/plugins/test-plugin/commands/hello.md',
            relativePath: 'commands/hello.md'
          }],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/plugins/test-plugin',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.lstatSync).mockReturnValue({ isSymbolicLink: () => false } as any);

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getCommandsDir).mockReturnValue('/test/.claude/commands');

      const { pluginSymlink } = await import('../pluginSymlink');
      
      await pluginSymlink.removeSymlinks(mockParsedPlugin);

      // Should not call unlinkSync for non-symlink files
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('checkSymlinks', () => {
    it('should return true if symlinks exist', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: [{
            type: 'command' as const,
            name: 'hello',
            path: '/test/plugins/test-plugin/commands/hello.md',
            relativePath: 'commands/hello.md'
          }],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/plugins/test-plugin',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const { pluginPaths } = await import('../pluginPaths');
      vi.mocked(pluginPaths.getCommandsDir).mockReturnValue('/test/.claude/commands');

      const { pluginSymlink } = await import('../pluginSymlink');
      
      const result = await pluginSymlink.checkSymlinks(mockParsedPlugin);

      expect(result).toBe(true);
    });

    it('should return false if no symlinks exist', async () => {
      const mockParsedPlugin = {
        manifest: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          author: { name: 'Test' }
        },
        components: {
          commands: [],
          agents: [],
          skills: [],
          hooks: [],
          mcpServers: []
        },
        files: [],
        path: '/test/plugins/test-plugin',
        marketplaceName: 'test-market',
        pluginName: 'test-plugin'
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { pluginSymlink } = await import('../pluginSymlink');
      
      const result = await pluginSymlink.checkSymlinks(mockParsedPlugin);

      expect(result).toBe(false);
    });
  });
});

