/**
 * Provider Tools Tests
 *
 * Tests for model provider management MCP tools.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { McpToolCallResult, ToolContext } from '../types.js';

// Mock claudeVersionStorage
const mockProviders = [
  {
    id: 'system',
    name: 'System Claude',
    alias: 'system',
    description: 'System default Claude',
    isSystem: true,
    isDefault: true,
    models: [
      { id: 'sonnet', name: 'Sonnet', isVision: true },
      { id: 'opus', name: 'Opus', isVision: true },
    ],
    environmentVariables: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'custom-1',
    name: 'My Custom Provider',
    alias: 'custom',
    description: 'Custom provider with API key',
    isSystem: false,
    isDefault: false,
    models: [{ id: 'sonnet', name: 'Sonnet', isVision: true }],
    environmentVariables: { ANTHROPIC_API_KEY: 'sk-***' },
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

let mockDefaultVersionId: string | null = 'system';

vi.mock('../../claudeVersionStorage.js', () => ({
  getAllVersions: vi.fn().mockImplementation(() => Promise.resolve(mockProviders)),
  getDefaultVersionId: vi.fn().mockImplementation(() => Promise.resolve(mockDefaultVersionId)),
  setDefaultVersion: vi.fn().mockImplementation((versionId: string) => {
    const exists = mockProviders.find((p) => p.id === versionId);
    if (!exists) {
      throw new Error('版本不存在');
    }
    mockDefaultVersionId = versionId;
    return Promise.resolve();
  }),
  createVersion: vi.fn().mockImplementation((data: any) => {
    const newProvider = {
      id: 'new-provider-id',
      name: data.name,
      alias: data.alias,
      description: data.description,
      isSystem: false,
      isDefault: false,
      models: data.models || [],
      environmentVariables: data.environmentVariables || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return Promise.resolve(newProvider);
  }),
  updateVersion: vi.fn().mockImplementation((versionId: string, data: any) => {
    const provider = mockProviders.find((p) => p.id === versionId);
    if (!provider) {
      throw new Error('版本不存在');
    }
    const updated = {
      ...provider,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return Promise.resolve(updated);
  }),
  deleteVersion: vi.fn().mockImplementation((versionId: string) => {
    const provider = mockProviders.find((p) => p.id === versionId);
    if (!provider) {
      throw new Error('版本不存在');
    }
    if (provider.isSystem) {
      throw new Error('不允许删除系统版本');
    }
    return Promise.resolve();
  }),
  loadClaudeVersions: vi.fn().mockImplementation(() =>
    Promise.resolve({
      versions: mockProviders,
      defaultVersionId: mockDefaultVersionId,
    })
  ),
}));

// Import tools after mocking
import {
  listProvidersTool,
  getProviderTool,
  createProviderTool,
  updateProviderTool,
  deleteProviderTool,
  getDefaultProviderTool,
  setDefaultProviderTool,
  providerTools,
} from '../tools/providerTools.js';

const mockContext: ToolContext = {
  apiKeyId: 'test-key',
  permissions: ['system:read', 'system:write'],
};

describe('Provider Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDefaultVersionId = 'system';
  });

  describe('providerTools array', () => {
    it('should export 7 provider tools', () => {
      expect(providerTools).toHaveLength(7);
    });

    it('should include all expected tools', () => {
      const toolNames = providerTools.map((t) => t.tool.name);
      expect(toolNames).toContain('list_providers');
      expect(toolNames).toContain('get_provider');
      expect(toolNames).toContain('create_provider');
      expect(toolNames).toContain('update_provider');
      expect(toolNames).toContain('delete_provider');
      expect(toolNames).toContain('get_default_provider');
      expect(toolNames).toContain('set_default_provider');
    });
  });

  describe('list_providers', () => {
    it('should list all providers', async () => {
      const result = await listProvidersTool.handler({}, mockContext);

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.total).toBe(2);
      expect(data.providers).toHaveLength(2);
      expect(data.defaultProviderId).toBe('system');
    });

    it('should filter out system provider when includeSystem is false', async () => {
      const result = await listProvidersTool.handler(
        { includeSystem: false },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.total).toBe(1);
      expect(data.providers[0].id).toBe('custom-1');
    });

    it('should require system:read permission', () => {
      expect(listProvidersTool.requiredPermissions).toContain('system:read');
    });
  });

  describe('get_provider', () => {
    it('should return provider details', async () => {
      const result = await getProviderTool.handler(
        { providerId: 'system' },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.id).toBe('system');
      expect(data.isDefault).toBe(true);
      expect(data.isSystem).toBe(true);
    });

    it('should return error for non-existent provider', async () => {
      const result = await getProviderTool.handler(
        { providerId: 'non-existent' },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provider not found');
    });

    it('should require providerId parameter', async () => {
      const result = await getProviderTool.handler({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provider ID is required');
    });
  });

  describe('create_provider', () => {
    it('should create a new provider', async () => {
      const result = await createProviderTool.handler(
        {
          name: 'New Provider',
          alias: 'new-provider',
          description: 'A new provider',
          environmentVariables: { ANTHROPIC_API_KEY: 'sk-test' },
        },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.success).toBe(true);
      expect(data.provider.name).toBe('New Provider');
      expect(data.provider.alias).toBe('new-provider');
    });

    it('should require name and alias', async () => {
      const result = await createProviderTool.handler(
        { name: 'Only Name' },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Name and alias are required');
    });

    it('should require system:write permission', () => {
      expect(createProviderTool.requiredPermissions).toContain('system:write');
    });
  });

  describe('update_provider', () => {
    it('should update provider', async () => {
      const result = await updateProviderTool.handler(
        {
          providerId: 'custom-1',
          name: 'Updated Name',
          description: 'Updated description',
        },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.success).toBe(true);
      expect(data.provider.name).toBe('Updated Name');
    });

    it('should require providerId', async () => {
      const result = await updateProviderTool.handler(
        { name: 'New Name' },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provider ID is required');
    });
  });

  describe('delete_provider', () => {
    it('should delete non-system provider', async () => {
      const result = await deleteProviderTool.handler(
        { providerId: 'custom-1' },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.success).toBe(true);
    });

    it('should not delete system provider', async () => {
      const result = await deleteProviderTool.handler(
        { providerId: 'system' },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('不允许删除系统版本');
    });

    it('should require providerId', async () => {
      const result = await deleteProviderTool.handler({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provider ID is required');
    });
  });

  describe('get_default_provider', () => {
    it('should return default provider info', async () => {
      const result = await getDefaultProviderTool.handler({}, mockContext);

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.defaultProviderId).toBe('system');
      expect(data.defaultProvider.name).toBe('System Claude');
    });

    it('should handle no default provider', async () => {
      mockDefaultVersionId = null;

      const result = await getDefaultProviderTool.handler({}, mockContext);

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.defaultProvider).toBeNull();
      expect(data.message).toContain('No default provider');
    });
  });

  describe('set_default_provider', () => {
    it('should set default provider', async () => {
      const result = await setDefaultProviderTool.handler(
        { providerId: 'custom-1' },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.success).toBe(true);
      expect(data.defaultProviderId).toBe('custom-1');
    });

    it('should require providerId', async () => {
      const result = await setDefaultProviderTool.handler({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provider ID is required');
    });

    it('should fail for non-existent provider', async () => {
      const result = await setDefaultProviderTool.handler(
        { providerId: 'non-existent' },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('版本不存在');
    });

    it('should require system:write permission', () => {
      expect(setDefaultProviderTool.requiredPermissions).toContain('system:write');
    });
  });
});
