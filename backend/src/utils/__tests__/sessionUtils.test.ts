/**
 * Unit tests for sessionUtils.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  handleSessionManagement,
  isVisionModel,
  saveImageToHiddenDir,
  buildUserMessageContent
} from '../sessionUtils';

// Mock sessionManager
vi.mock('../../services/sessionManager', () => ({
  sessionManager: {
    getSession: vi.fn(),
    checkSessionExists: vi.fn(),
    createNewSession: vi.fn(),
    isSessionBusy: vi.fn().mockReturnValue(false)
  }
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn()
}));

// Mock claudeVersionStorage
vi.mock('../../services/claudeVersionStorage', () => ({
  getDefaultVersionId: vi.fn(),
  getAllVersions: vi.fn()
}));

describe('sessionUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleSessionManagement', () => {
    const mockAgent = 'test-agent';
    const mockQueryOptions = { cwd: '/test', model: 'sonnet' };

    it('should reuse existing session from memory', async () => {
      const mockSession = { id: 'existing-session' };
      const { sessionManager } = await import('../../services/sessionManager');
      
      vi.mocked(sessionManager.getSession).mockReturnValue(mockSession as any);

      const result = await handleSessionManagement(
        mockAgent,
        'existing-session',
        '/test/path',
        mockQueryOptions
      );

      expect(result.claudeSession).toBe(mockSession);
      expect(result.actualSessionId).toBe('existing-session');
      expect(sessionManager.getSession).toHaveBeenCalledWith('existing-session');
    });

    it('should resume session if history exists in project', async () => {
      const mockNewSession = { id: 'resumed-session' };
      const { sessionManager } = await import('../../services/sessionManager');
      
      vi.mocked(sessionManager.getSession).mockReturnValue(null);
      vi.mocked(sessionManager.checkSessionExists).mockReturnValue(true);
      vi.mocked(sessionManager.createNewSession).mockReturnValue(mockNewSession as any);

      const result = await handleSessionManagement(
        mockAgent,
        'old-session',
        '/test/path',
        mockQueryOptions,
        'version-1'
      );

      expect(result.claudeSession).toBe(mockNewSession);
      expect(sessionManager.checkSessionExists).toHaveBeenCalledWith('old-session', '/test/path');
      expect(sessionManager.createNewSession).toHaveBeenCalledWith(
        mockAgent,
        mockQueryOptions,
        'old-session',
        'version-1',
        undefined  // modelId
      );
    });

    it('should create new session if no history found', async () => {
      const mockNewSession = { id: 'new-session' };
      const { sessionManager } = await import('../../services/sessionManager');
      
      vi.mocked(sessionManager.getSession).mockReturnValue(null);
      vi.mocked(sessionManager.checkSessionExists).mockReturnValue(false);
      vi.mocked(sessionManager.createNewSession).mockReturnValue(mockNewSession as any);

      const result = await handleSessionManagement(
        mockAgent,
        'non-existent-session',
        '/test/path',
        mockQueryOptions
      );

      expect(result.claudeSession).toBe(mockNewSession);
      expect(sessionManager.createNewSession).toHaveBeenCalledWith(
        mockAgent,
        mockQueryOptions,
        undefined,
        undefined,
        undefined  // modelId
      );
    });

    it('should create new session when no sessionId provided', async () => {
      const mockNewSession = { id: 'brand-new-session' };
      const { sessionManager } = await import('../../services/sessionManager');
      
      vi.mocked(sessionManager.createNewSession).mockReturnValue(mockNewSession as any);

      const result = await handleSessionManagement(
        mockAgent,
        null,
        '/test/path',
        mockQueryOptions
      );

      expect(result.claudeSession).toBe(mockNewSession);
      expect(result.actualSessionId).toBeNull();
      expect(sessionManager.createNewSession).toHaveBeenCalledWith(
        mockAgent,
        mockQueryOptions,
        undefined,
        undefined,
        undefined  // modelId
      );
    });
  });

  describe('isVisionModel', () => {
    it('should return true if model supports vision', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          models: [
            { id: 'sonnet', isVision: true },
            { id: 'opus', isVision: false }
          ]
        }
      ];

      const { getAllVersions, getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue('version-1');
      vi.mocked(getAllVersions).mockResolvedValue(mockVersions as any);

      const result = await isVisionModel('sonnet');
      expect(result).toBe(true);
    });

    it('should return false if model does not support vision', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          models: [
            { id: 'sonnet', isVision: true },
            { id: 'opus', isVision: false }
          ]
        }
      ];

      const { getAllVersions, getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue('version-1');
      vi.mocked(getAllVersions).mockResolvedValue(mockVersions as any);

      const result = await isVisionModel('opus');
      expect(result).toBe(false);
    });

    it('should return true if version not found', async () => {
      const { getAllVersions, getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue('non-existent');
      vi.mocked(getAllVersions).mockResolvedValue([]);

      const result = await isVisionModel('sonnet');
      expect(result).toBe(true);
    });

    it('should return true if model not found in version', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          models: [
            { id: 'sonnet', isVision: true }
          ]
        }
      ];

      const { getAllVersions, getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue('version-1');
      vi.mocked(getAllVersions).mockResolvedValue(mockVersions as any);

      const result = await isVisionModel('unknown-model');
      expect(result).toBe(true);
    });
  });

  describe('saveImageToHiddenDir', () => {
    it('should save image to hidden directory and return relative path', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const imageData = Buffer.from('test-image-data').toString('base64');
      const result = saveImageToHiddenDir(imageData, 'image/jpeg', 1, '/test/project');

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toMatch(/^\.agentstudio-images\/image1_\d+\.jpg$/);
    });

    it('should create hidden directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const imageData = Buffer.from('test-image-data').toString('base64');
      saveImageToHiddenDir(imageData, 'image/png', 2, '/test/project');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join('/test/project', '.agentstudio-images'),
        { recursive: true }
      );
    });

    it('should use correct file extension for different media types', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const imageData = Buffer.from('test-image-data').toString('base64');
      
      const pngResult = saveImageToHiddenDir(imageData, 'image/png', 1);
      expect(pngResult).toMatch(/\.png$/);

      const gifResult = saveImageToHiddenDir(imageData, 'image/gif', 2);
      expect(gifResult).toMatch(/\.gif$/);

      const webpResult = saveImageToHiddenDir(imageData, 'image/webp', 3);
      expect(webpResult).toMatch(/\.webp$/);
    });
  });

  describe('buildUserMessageContent', () => {
    it('should build message with text only', async () => {
      const result = await buildUserMessageContent('Hello, Claude!');

      expect(result).toEqual({
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Hello, Claude!'
            }
          ]
        }
      });
    });

    it('should include images directly for vision models', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          models: [{ id: 'sonnet', isVision: true }]
        }
      ];

      const { getAllVersions, getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue('version-1');
      vi.mocked(getAllVersions).mockResolvedValue(mockVersions as any);

      const images = [
        {
          id: 'img1',
          data: 'base64imagedata',
          mediaType: 'image/jpeg',
          filename: 'test.jpg'
        }
      ];

      const result = await buildUserMessageContent(
        'Analyze this image',
        images,
        'sonnet',
        '/test/path',
        'version-1'
      );

      expect(result.message.content).toHaveLength(2);
      expect(result.message.content[0]).toEqual({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: 'base64imagedata'
        }
      });
      expect(result.message.content[1]).toEqual({
        type: 'text',
        text: 'Analyze this image'
      });
    });

    it('should save images to file for non-vision models', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          models: [{ id: 'opus', isVision: false }]
        }
      ];

      const { getAllVersions, getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue('version-1');
      vi.mocked(getAllVersions).mockResolvedValue(mockVersions as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const images = [
        {
          id: 'img1',
          data: Buffer.from('test-image-data').toString('base64'),
          mediaType: 'image/jpeg',
          filename: 'test.jpg'
        }
      ];

      const result = await buildUserMessageContent(
        'Look at [image1]',
        images,
        'opus',
        '/test/path',
        'version-1'
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result.message.content[0].text).toMatch(/@\.agentstudio-images\/image1_\d+\.jpg/);
    });

    it('should handle multiple images', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          models: [{ id: 'sonnet', isVision: true }]
        }
      ];

      const { getAllVersions, getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue('version-1');
      vi.mocked(getAllVersions).mockResolvedValue(mockVersions as any);

      const images = [
        {
          id: 'img1',
          data: 'imagedata1',
          mediaType: 'image/jpeg'
        },
        {
          id: 'img2',
          data: 'imagedata2',
          mediaType: 'image/png'
        }
      ];

      const result = await buildUserMessageContent(
        'Analyze these images',
        images,
        'sonnet',
        '/test/path',
        'version-1'
      );

      expect(result.message.content).toHaveLength(3); // 2 images + 1 text
      expect(result.message.content[0].type).toBe('image');
      expect(result.message.content[1].type).toBe('image');
      expect(result.message.content[2].type).toBe('text');
    });
  });
});

