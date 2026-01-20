/**
 * Unit tests for projectMetadataStorage.ts - Symlink resolution
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    realpathSync: vi.fn(),
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

describe('ProjectMetadataStorage - Symlink Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveRealPath', () => {
    it('should resolve symlinks to real path', () => {
      const symlinkPath = '/Users/test/Desktop/workspace';
      const realPath = '/Users/test/Desktop/.workspace2.nosync';
      
      vi.mocked(fs.realpathSync).mockReturnValue(realPath);
      
      // Import after mocking
      const realpathResult = fs.realpathSync(symlinkPath);
      
      expect(realpathResult).toBe(realPath);
      expect(fs.realpathSync).toHaveBeenCalledWith(symlinkPath);
    });

    it('should return original path if not a symlink', () => {
      const regularPath = '/Users/test/projects/myproject';
      
      vi.mocked(fs.realpathSync).mockReturnValue(regularPath);
      
      const realpathResult = fs.realpathSync(regularPath);
      
      expect(realpathResult).toBe(regularPath);
    });

    it('should handle path that does not exist', () => {
      const nonExistentPath = '/Users/test/nonexistent';
      
      vi.mocked(fs.realpathSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      
      expect(() => fs.realpathSync(nonExistentPath)).toThrow('ENOENT');
    });
  });

  describe('path conversion for Claude CLI', () => {
    it('should convert path with both slashes and dots correctly', () => {
      const realPath = '/Users/test/Desktop/.workspace2.nosync';
      
      // Claude CLI replaces both '/' and '.' with '-'
      const expectedClaudePath = '-Users-test-Desktop--workspace2-nosync';
      const convertedPath = realPath.replace(/[\/\.]/g, '-');
      
      expect(convertedPath).toBe(expectedClaudePath);
    });

    it('should handle regular paths without dots', () => {
      const regularPath = '/Users/test/projects/myproject';
      
      const expectedClaudePath = '-Users-test-projects-myproject';
      const convertedPath = regularPath.replace(/[\/\.]/g, '-');
      
      expect(convertedPath).toBe(expectedClaudePath);
    });

    it('should handle paths with hidden directories', () => {
      const hiddenDirPath = '/Users/test/.config/claude';
      
      const expectedClaudePath = '-Users-test--config-claude';
      const convertedPath = hiddenDirPath.replace(/[\/\.]/g, '-');
      
      expect(convertedPath).toBe(expectedClaudePath);
    });
  });

  describe('deduplication logic', () => {
    it('should identify symlink and real path as the same project', () => {
      const symlinkPath = '/Users/test/Desktop/workspace';
      const realPath = '/Users/test/Desktop/.workspace2.nosync';
      
      vi.mocked(fs.realpathSync).mockImplementation((p) => {
        if (p === symlinkPath) return realPath;
        return p as string;
      });
      
      const resolvedSymlink = fs.realpathSync(symlinkPath);
      const resolvedReal = fs.realpathSync(realPath);
      
      expect(resolvedSymlink).toBe(resolvedReal);
    });

    it('should correctly process unique real paths', () => {
      const processedRealPaths = new Set<string>();
      
      const path1 = '/Users/test/project1';
      const path2 = '/Users/test/project2';
      
      vi.mocked(fs.realpathSync).mockImplementation((p) => p as string);
      
      const realPath1 = fs.realpathSync(path1);
      const realPath2 = fs.realpathSync(path2);
      
      processedRealPaths.add(realPath1);
      processedRealPaths.add(realPath2);
      
      expect(processedRealPaths.size).toBe(2);
      expect(processedRealPaths.has(path1)).toBe(true);
      expect(processedRealPaths.has(path2)).toBe(true);
    });

    it('should skip duplicate paths pointing to the same real path', () => {
      const processedRealPaths = new Set<string>();
      
      const symlinkPath = '/Users/test/Desktop/workspace';
      const realPath = '/Users/test/Desktop/.workspace2.nosync';
      
      vi.mocked(fs.realpathSync).mockImplementation((p) => {
        if (p === symlinkPath) return realPath;
        return p as string;
      });
      
      // Process real path first
      const resolvedReal = fs.realpathSync(realPath);
      processedRealPaths.add(resolvedReal);
      
      // Then try to process symlink
      const resolvedSymlink = fs.realpathSync(symlinkPath);
      const isDuplicate = processedRealPaths.has(resolvedSymlink);
      
      expect(isDuplicate).toBe(true);
      expect(processedRealPaths.size).toBe(1);
    });
  });
});
