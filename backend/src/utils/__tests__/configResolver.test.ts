/**
 * Config Resolver Tests
 *
 * Tests for the unified provider and model resolution logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create a mock for getProjectMetadata that we can control
const mockGetProjectMetadata = vi.fn();

// Mock dependencies
vi.mock('../../services/projectMetadataStorage.js', () => ({
  ProjectMetadataStorage: vi.fn().mockImplementation(() => ({
    getProjectMetadata: mockGetProjectMetadata,
  })),
}));

vi.mock('../../services/claudeVersionStorage.js', () => ({
  getDefaultVersionId: vi.fn(),
  getVersionByIdInternal: vi.fn(),
}));

// Import mocked modules and the function under test
import { ProjectMetadataStorage } from '../../services/projectMetadataStorage.js';
import {
  getDefaultVersionId,
  getVersionByIdInternal,
} from '../../services/claudeVersionStorage.js';
import { resolveConfig } from '../configResolver.js';

describe('configResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to no project metadata
    mockGetProjectMetadata.mockReturnValue(null);
  });

  describe('resolveConfig', () => {
    describe('Provider Resolution Priority', () => {
      it('should use channel provider ID when provided', async () => {
        vi.mocked(getVersionByIdInternal).mockResolvedValue({
          id: 'channel-provider',
          name: 'Channel Provider',
          alias: 'channel',
          isDefault: false,
          isSystem: false,
          models: [{ id: 'sonnet', name: 'Sonnet', isVision: true }],
          createdAt: '',
          updatedAt: '',
        });

        const result = await resolveConfig({
          channelProviderId: 'channel-provider',
        });

        expect(result.providerId).toBe('channel-provider');
        expect(result.resolutionTrace.providerSource).toBe('channel');
      });

      it('should use agent claudeVersionId when channel is not provided', async () => {
        vi.mocked(getVersionByIdInternal).mockResolvedValue({
          id: 'agent-provider',
          name: 'Agent Provider',
          alias: 'agent',
          isDefault: false,
          isSystem: false,
          models: [{ id: 'opus', name: 'Opus', isVision: true }],
          createdAt: '',
          updatedAt: '',
        });

        const result = await resolveConfig({
          agent: { claudeVersionId: 'agent-provider' },
        });

        expect(result.providerId).toBe('agent-provider');
        expect(result.resolutionTrace.providerSource).toBe('agent');
      });

      it('should use project default provider when agent is not configured', async () => {
        mockGetProjectMetadata.mockReturnValue({
          defaultProviderId: 'project-provider',
          defaultModel: 'sonnet',
        });

        vi.mocked(getVersionByIdInternal).mockResolvedValue({
          id: 'project-provider',
          name: 'Project Provider',
          alias: 'project',
          isDefault: false,
          isSystem: false,
          models: [{ id: 'sonnet', name: 'Sonnet', isVision: true }],
          createdAt: '',
          updatedAt: '',
        });

        const result = await resolveConfig({
          projectPath: '/test/project',
        });

        expect(result.providerId).toBe('project-provider');
        expect(result.resolutionTrace.providerSource).toBe('project');
      });

      it('should use system default provider as fallback', async () => {
        vi.mocked(getDefaultVersionId).mockResolvedValue('system-default');
        vi.mocked(getVersionByIdInternal).mockResolvedValue({
          id: 'system-default',
          name: 'System Default',
          alias: 'system',
          isDefault: true,
          isSystem: true,
          models: [{ id: 'sonnet', name: 'Sonnet', isVision: true }],
          createdAt: '',
          updatedAt: '',
        });

        const result = await resolveConfig({});

        expect(result.providerId).toBe('system-default');
        expect(result.resolutionTrace.providerSource).toBe('system');
      });

      it('should return none when no provider is available', async () => {
        vi.mocked(getDefaultVersionId).mockResolvedValue(null);

        const result = await resolveConfig({});

        expect(result.providerId).toBeNull();
        expect(result.resolutionTrace.providerSource).toBe('none');
      });
    });

    describe('Model Resolution Priority', () => {
      it('should use channel model when provided', async () => {
        const result = await resolveConfig({
          channelModel: 'opus',
        });

        expect(result.model).toBe('opus');
        expect(result.resolutionTrace.modelSource).toBe('channel');
      });

      it('should use project default model when channel is not provided', async () => {
        mockGetProjectMetadata.mockReturnValue({
          defaultModel: 'haiku',
        });

        const result = await resolveConfig({
          projectPath: '/test/project',
        });

        expect(result.model).toBe('haiku');
        expect(result.resolutionTrace.modelSource).toBe('project');
      });

      it('should use provider first model when project model is not set', async () => {
        vi.mocked(getDefaultVersionId).mockResolvedValue('provider-1');
        vi.mocked(getVersionByIdInternal).mockResolvedValue({
          id: 'provider-1',
          name: 'Provider',
          alias: 'provider',
          isDefault: true,
          isSystem: false,
          models: [
            { id: 'claude-3-opus', name: 'Opus', isVision: true },
            { id: 'claude-3-sonnet', name: 'Sonnet', isVision: true },
          ],
          createdAt: '',
          updatedAt: '',
        });

        const result = await resolveConfig({});

        expect(result.model).toBe('claude-3-opus'); // First model
        expect(result.resolutionTrace.modelSource).toBe('provider');
      });

      it('should fallback to sonnet when no model source is available', async () => {
        vi.mocked(getDefaultVersionId).mockResolvedValue(null);

        const result = await resolveConfig({});

        expect(result.model).toBe('sonnet');
        expect(result.resolutionTrace.modelSource).toBe('fallback');
      });
    });

    describe('Combined Resolution', () => {
      it('should correctly combine provider and model resolution', async () => {
        mockGetProjectMetadata.mockReturnValue({
          defaultProviderId: 'project-provider',
          // No defaultModel set
        });

        vi.mocked(getVersionByIdInternal).mockResolvedValue({
          id: 'project-provider',
          name: 'Project Provider',
          alias: 'project',
          isDefault: false,
          isSystem: false,
          models: [
            { id: 'opus-4', name: 'Opus 4', isVision: true },
            { id: 'sonnet-4', name: 'Sonnet 4', isVision: true },
          ],
          createdAt: '',
          updatedAt: '',
        });

        const result = await resolveConfig({
          projectPath: '/test/project',
        });

        // Provider from project config
        expect(result.providerId).toBe('project-provider');
        expect(result.resolutionTrace.providerSource).toBe('project');

        // Model from provider's first model (since project didn't specify)
        expect(result.model).toBe('opus-4');
        expect(result.resolutionTrace.modelSource).toBe('provider');
      });

      it('should allow channel to override project settings', async () => {
        mockGetProjectMetadata.mockReturnValue({
          defaultProviderId: 'project-provider',
          defaultModel: 'project-model',
        });

        vi.mocked(getVersionByIdInternal).mockResolvedValue({
          id: 'channel-provider',
          name: 'Channel Provider',
          alias: 'channel',
          isDefault: false,
          isSystem: false,
          models: [{ id: 'sonnet', name: 'Sonnet', isVision: true }],
          createdAt: '',
          updatedAt: '',
        });

        const result = await resolveConfig({
          channelProviderId: 'channel-provider',
          channelModel: 'channel-model',
          projectPath: '/test/project',
        });

        // Channel overrides project
        expect(result.providerId).toBe('channel-provider');
        expect(result.resolutionTrace.providerSource).toBe('channel');
        expect(result.model).toBe('channel-model');
        expect(result.resolutionTrace.modelSource).toBe('channel');
      });
    });
  });
});
