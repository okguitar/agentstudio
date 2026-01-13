/**
 * Admin API Key Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  generateAdminApiKey,
  validateAdminApiKey,
  listAdminApiKeys,
  revokeAdminApiKey,
  deleteAdminApiKey,
  updateAdminApiKey,
  toggleAdminApiKey,
  hasPermission,
} from '../adminApiKeyService.js';
import type { AdminPermission } from '../types.js';

// Use a temp directory for testing
const TEST_HOME = path.join(os.tmpdir(), 'mcp-admin-test-' + Date.now());
const TEST_KEYS_FILE = path.join(TEST_HOME, '.claude-agent', 'admin-api-keys.json');

describe('adminApiKeyService', () => {
  beforeEach(async () => {
    // Set test home directory
    process.env.HOME = TEST_HOME;

    // Ensure clean state
    try {
      await fs.rm(TEST_HOME, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await fs.mkdir(path.dirname(TEST_KEYS_FILE), { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(TEST_HOME, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('generateAdminApiKey', () => {
    it('should generate a new API key', async () => {
      const result = await generateAdminApiKey('Test key');

      expect(result.key).toBeDefined();
      expect(result.key.startsWith('ask_')).toBe(true);
      expect(result.key.length).toBe(36); // ask_ + 32 hex chars

      expect(result.keyData.id).toBeDefined();
      expect(result.keyData.description).toBe('Test key');
      expect(result.keyData.permissions).toContain('admin:*');
      expect(result.keyData.createdAt).toBeDefined();
    });

    it('should generate key with custom permissions', async () => {
      const permissions: AdminPermission[] = ['projects:read', 'agents:read'];
      const result = await generateAdminApiKey('Limited key', permissions);

      expect(result.keyData.permissions).toEqual(permissions);
    });

    it('should store key hash, not plaintext', async () => {
      const result = await generateAdminApiKey('Test key');

      // Read the stored file
      const fileContent = await fs.readFile(TEST_KEYS_FILE, 'utf-8');
      const registry = JSON.parse(fileContent);

      const storedKey = registry.keys[0];
      expect(storedKey.keyHash).toBeDefined();
      expect(storedKey.keyHash).not.toBe(result.key); // Hash, not plaintext
      expect(storedKey.keyHash.startsWith('$2')).toBe(true); // bcrypt hash
    });
  });

  describe('validateAdminApiKey', () => {
    let validKey: string;

    beforeEach(async () => {
      const result = await generateAdminApiKey('Test key');
      validKey = result.key;
    });

    it('should validate a correct API key', async () => {
      const result = await validateAdminApiKey(validKey);

      expect(result.valid).toBe(true);
      expect(result.keyId).toBeDefined();
      expect(result.permissions).toContain('admin:*');
    });

    it('should reject an invalid API key', async () => {
      const result = await validateAdminApiKey('ask_invalid_key_1234567890123456');

      expect(result.valid).toBe(false);
      expect(result.keyId).toBeUndefined();
    });

    it('should reject key without correct prefix', async () => {
      const result = await validateAdminApiKey('wrong_prefix');

      expect(result.valid).toBe(false);
    });

    it('should reject empty key', async () => {
      const result = await validateAdminApiKey('');

      expect(result.valid).toBe(false);
    });

    it('should reject revoked key', async () => {
      // First revoke the key
      const keys = await listAdminApiKeys();
      await revokeAdminApiKey(keys[0].id);

      const result = await validateAdminApiKey(validKey);

      expect(result.valid).toBe(false);
    });

    it('should update lastUsedAt on successful validation', async () => {
      await validateAdminApiKey(validKey);

      const keys = await listAdminApiKeys();
      expect(keys[0].lastUsedAt).toBeDefined();
    });
  });

  describe('listAdminApiKeys', () => {
    it('should return empty list when no keys exist', async () => {
      const keys = await listAdminApiKeys();
      expect(keys).toEqual([]);
    });

    it('should list all keys with decrypted values', async () => {
      await generateAdminApiKey('Key 1');
      await generateAdminApiKey('Key 2');

      const keys = await listAdminApiKeys();

      expect(keys).toHaveLength(2);
      expect(keys[0].decryptedKey).toBeDefined();
      expect(keys[0].decryptedKey?.startsWith('ask_')).toBe(true);
    });
  });

  describe('revokeAdminApiKey', () => {
    it('should revoke an existing key', async () => {
      const { keyData } = await generateAdminApiKey('Test key');

      const result = await revokeAdminApiKey(keyData.id);

      expect(result).toBe(true);

      const keys = await listAdminApiKeys();
      expect(keys[0].revokedAt).toBeDefined();
    });

    it('should return false for non-existent key', async () => {
      const result = await revokeAdminApiKey('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('deleteAdminApiKey', () => {
    it('should delete an existing key', async () => {
      const { keyData } = await generateAdminApiKey('Test key');

      const result = await deleteAdminApiKey(keyData.id);

      expect(result).toBe(true);

      const keys = await listAdminApiKeys();
      expect(keys).toHaveLength(0);
    });

    it('should return false for non-existent key', async () => {
      const result = await deleteAdminApiKey('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should grant access for exact permission match', () => {
      const permissions: AdminPermission[] = ['projects:read'];
      expect(hasPermission(permissions, 'projects:read')).toBe(true);
    });

    it('should grant access for admin:* wildcard', () => {
      const permissions: AdminPermission[] = ['admin:*'];
      expect(hasPermission(permissions, 'projects:read')).toBe(true);
      expect(hasPermission(permissions, 'agents:write')).toBe(true);
      expect(hasPermission(permissions, 'system:read')).toBe(true);
    });

    it('should deny access for missing permission', () => {
      const permissions: AdminPermission[] = ['projects:read'];
      expect(hasPermission(permissions, 'agents:read')).toBe(false);
    });

    it('should grant read access when write is granted', () => {
      const permissions: AdminPermission[] = ['projects:write'];
      expect(hasPermission(permissions, 'projects:read')).toBe(true);
    });

    it('should not grant write access when only read is granted', () => {
      const permissions: AdminPermission[] = ['projects:read'];
      expect(hasPermission(permissions, 'projects:write')).toBe(false);
    });
  });

  describe('generateAdminApiKey with allowedTools', () => {
    it('should generate key with specific allowed tools', async () => {
      const allowedTools = ['list_projects', 'get_project'];
      const result = await generateAdminApiKey('Limited tool key', ['admin:*'], allowedTools);

      expect(result.keyData.allowedTools).toEqual(allowedTools);
    });

    it('should generate key with empty allowedTools', async () => {
      const result = await generateAdminApiKey('Full access key', ['admin:*']);

      expect(result.keyData.allowedTools).toBeUndefined();
    });

    it('should generate key without enabled field by default (undefined means enabled)', async () => {
      const result = await generateAdminApiKey('Test key');

      // enabled is optional - undefined means enabled
      expect(result.keyData.enabled).toBeUndefined();
    });
  });

  describe('validateAdminApiKey with enabled status', () => {
    it('should reject disabled key', async () => {
      const { key, keyData } = await generateAdminApiKey('Test key');

      // Disable the key
      await toggleAdminApiKey(keyData.id, false);

      const result = await validateAdminApiKey(key);

      expect(result.valid).toBe(false);
    });

    it('should return allowedTools in validation result', async () => {
      const allowedTools = ['list_projects', 'get_project'];
      const { key } = await generateAdminApiKey('Limited key', ['admin:*'], allowedTools);

      const result = await validateAdminApiKey(key);

      expect(result.valid).toBe(true);
      expect(result.allowedTools).toEqual(allowedTools);
    });
  });

  describe('updateAdminApiKey', () => {
    it('should update key description', async () => {
      const { keyData } = await generateAdminApiKey('Original description');

      const updatedKey = await updateAdminApiKey(keyData.id, {
        description: 'Updated description',
      });

      expect(updatedKey).not.toBeNull();
      expect(updatedKey?.description).toBe('Updated description');

      const keys = await listAdminApiKeys();
      expect(keys[0].description).toBe('Updated description');
    });

    it('should update key allowedTools', async () => {
      const { keyData } = await generateAdminApiKey('Test key');

      const allowedTools = ['list_projects', 'list_agents'];
      const updatedKey = await updateAdminApiKey(keyData.id, {
        allowedTools,
      });

      expect(updatedKey).not.toBeNull();
      expect(updatedKey?.allowedTools).toEqual(allowedTools);

      const keys = await listAdminApiKeys();
      expect(keys[0].allowedTools).toEqual(allowedTools);
    });

    it('should update multiple fields at once', async () => {
      const { keyData } = await generateAdminApiKey('Original', ['admin:*']);

      const result = await updateAdminApiKey(keyData.id, {
        description: 'Updated',
        allowedTools: ['list_projects'],
      });

      expect(result).not.toBeNull();

      const keys = await listAdminApiKeys();
      expect(keys[0].description).toBe('Updated');
      expect(keys[0].allowedTools).toEqual(['list_projects']);
    });

    it('should return null for non-existent key', async () => {
      const result = await updateAdminApiKey('non-existent-id', {
        description: 'New description',
      });

      expect(result).toBeNull();
    });
  });

  describe('toggleAdminApiKey', () => {
    it('should disable an enabled key', async () => {
      const { keyData } = await generateAdminApiKey('Test key');

      // Verify key is enabled by default (undefined or true means enabled)
      let keys = await listAdminApiKeys();
      expect(keys[0].enabled).toBeUndefined(); // undefined means enabled

      // Disable the key
      const success = await toggleAdminApiKey(keyData.id, false);

      expect(success).toBe(true);

      keys = await listAdminApiKeys();
      expect(keys[0].enabled).toBe(false);
    });

    it('should enable a disabled key', async () => {
      const { keyData } = await generateAdminApiKey('Test key');

      // First disable the key
      await toggleAdminApiKey(keyData.id, false);

      // Then enable it
      const success = await toggleAdminApiKey(keyData.id, true);

      expect(success).toBe(true);

      const keys = await listAdminApiKeys();
      expect(keys[0].enabled).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const success = await toggleAdminApiKey('non-existent-id', false);

      expect(success).toBe(false);
    });
  });

  describe('listAdminApiKeys with new fields', () => {
    it('should include allowedTools in listed keys', async () => {
      const allowedTools = ['list_projects', 'get_project'];
      await generateAdminApiKey('Limited key', ['admin:*'], allowedTools);

      const keys = await listAdminApiKeys();

      expect(keys[0].allowedTools).toEqual(allowedTools);
      // enabled is undefined by default (means enabled)
      expect(keys[0].enabled).toBeUndefined();
    });

    it('should include enabled status after toggle', async () => {
      const { keyData } = await generateAdminApiKey('Test key');

      // Toggle to disabled
      await toggleAdminApiKey(keyData.id, false);

      const keys = await listAdminApiKeys();
      expect(keys[0].enabled).toBe(false);

      // Toggle back to enabled
      await toggleAdminApiKey(keyData.id, true);

      const keysAfter = await listAdminApiKeys();
      expect(keysAfter[0].enabled).toBe(true);
    });
  });
});
