/**
 * Unit tests for pluginParser.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs');

describe('PluginParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readManifest', () => {
    it('should read and parse valid plugin manifest', async () => {
      const mockManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: {
          name: 'Test Author'
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockManifest));
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false, birthtime: new Date() } as any);
      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      const { pluginParser } = await import('../pluginParser');
      const parsed = await pluginParser.parsePlugin('/test/path', 'test-market', 'test-plugin');

      expect(parsed.manifest.name).toBe('test-plugin');
      expect(parsed.manifest.version).toBe('1.0.0');
      expect(parsed.manifest.author.name).toBe('Test Author');
    });

    it('should throw error if manifest is missing', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { pluginParser } = await import('../pluginParser');
      
      await expect(
        pluginParser.parsePlugin('/test/path', 'test-market', 'test-plugin')
      ).rejects.toThrow('Plugin manifest not found');
    });

    it('should throw error if manifest is missing required fields', async () => {
      const invalidManifest = {
        name: 'test-plugin'
        // missing version, description, author
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidManifest));

      const { pluginParser } = await import('../pluginParser');
      
      await expect(
        pluginParser.parsePlugin('/test/path', 'test-market', 'test-plugin')
      ).rejects.toThrow('missing required fields');
    });
  });

  describe('parseComponents', () => {
    it('should parse commands from commands directory', async () => {
      const mockManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' }
      };

      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        if (pathStr.includes('plugin.json')) return true;
        if (pathStr.includes('commands')) return true;
        if (pathStr.includes('hello.md')) return true;
        return false;
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        if (pathStr.includes('plugin.json')) {
          return JSON.stringify(mockManifest);
        }
        if (pathStr.includes('hello.md')) {
          return '---\ndescription: A hello command\n---\n\n# Hello\n\nSay hello';
        }
        return '';
      });

      vi.mocked(fs.statSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        return {
          isDirectory: () => pathStr.includes('commands') && !pathStr.includes('.md'),
          birthtime: new Date(),
          size: 100
        } as any;
      });

      vi.mocked(fs.readdirSync).mockImplementation((p: any, options?: any) => {
        const pathStr = p.toString();
        if (pathStr.includes('commands')) {
          if (options?.withFileTypes) {
            return [{ name: 'hello.md', isDirectory: () => false }] as any;
          }
          return ['hello.md'] as any;
        }
        return [] as any;
      });

      const { pluginParser } = await import('../pluginParser');
      const parsed = await pluginParser.parsePlugin('/test/path', 'test-market', 'test-plugin');

      expect(parsed.components.commands).toHaveLength(1);
      expect(parsed.components.commands[0].name).toBe('hello');
      expect(parsed.components.commands[0].description).toBe('A hello command');
    });

    it('should parse skills from skills directory', async () => {
      const mockManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' }
      };

      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        if (pathStr.includes('plugin.json')) return true;
        if (pathStr.includes('skills')) return true;
        if (pathStr.includes('SKILL.md')) return true;
        return false;
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        if (pathStr.includes('plugin.json')) {
          return JSON.stringify(mockManifest);
        }
        if (pathStr.includes('SKILL.md')) {
          return '# My Skill\n\nThis is a skill description.';
        }
        return '';
      });

      vi.mocked(fs.statSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        return {
          isDirectory: () => pathStr.includes('skills') || pathStr.includes('my-skill'),
          birthtime: new Date(),
          size: 100
        } as any;
      });

      vi.mocked(fs.readdirSync).mockImplementation((p: any, options?: any) => {
        const pathStr = p.toString();
        if (pathStr.includes('skills') && !pathStr.includes('my-skill')) {
          if (options?.withFileTypes) {
            return [{ name: 'my-skill', isDirectory: () => true }] as any;
          }
          return ['my-skill'] as any;
        }
        return [] as any;
      });

      const { pluginParser } = await import('../pluginParser');
      const parsed = await pluginParser.parsePlugin('/test/path', 'test-market', 'test-plugin');

      expect(parsed.components.skills).toHaveLength(1);
      expect(parsed.components.skills[0].name).toBe('my-skill');
    });

    it('should parse MCP servers from .mcp.json', async () => {
      const mockManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' }
      };

      const mockMcp = {
        mcpServers: {
          'test-server': {
            type: 'stdio',
            command: 'node',
            args: ['server.js'],
            description: 'Test MCP server'
          }
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        if (pathStr.includes('plugin.json')) return true;
        if (pathStr.includes('.mcp.json')) return true;
        return false;
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
        const pathStr = p.toString();
        if (pathStr.includes('plugin.json')) {
          return JSON.stringify(mockManifest);
        }
        if (pathStr.includes('.mcp.json')) {
          return JSON.stringify(mockMcp);
        }
        return '';
      });

      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
        birthtime: new Date(),
        size: 100
      } as any);

      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      const { pluginParser } = await import('../pluginParser');
      const parsed = await pluginParser.parsePlugin('/test/path', 'test-market', 'test-plugin');

      expect(parsed.components.mcpServers).toHaveLength(1);
      expect(parsed.components.mcpServers[0].name).toBe('test-server');
    });
  });

  describe('validatePlugin', () => {
    it('should validate a valid plugin', async () => {
      const mockManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockManifest));
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

      const { pluginParser } = await import('../pluginParser');
      const result = await pluginParser.validatePlugin('/test/path');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid plugin', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { pluginParser } = await import('../pluginParser');
      const result = await pluginParser.validatePlugin('/test/path');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('readFileContent', () => {
    it('should read file content', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue('file content');

      const { pluginParser } = await import('../pluginParser');
      const content = await pluginParser.readFileContent('/test/file.txt');

      expect(content).toBe('file content');
    });

    it('should throw error for missing file', async () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const { pluginParser } = await import('../pluginParser');
      
      await expect(
        pluginParser.readFileContent('/test/missing.txt')
      ).rejects.toThrow();
    });
  });
});

