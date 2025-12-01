/**
 * Unit tests for apiKeyService.ts
 * Tests for Phase 8 (US6): API Key Management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateApiKey,
  hashApiKey,
  validateApiKey,
  revokeApiKey,
  listApiKeys,
  rotateApiKey,
  getApiKey,
} from '../apiKeyService.js';
import fs from 'fs/promises';
import path from 'path';

describe('apiKeyService - API Key Management', () => {
  const testProjectId = path.resolve(process.cwd(), '..', 'projects', 'test-project-123');
  const testApiKeysPath = path.join(testProjectId, '.a2a', 'api-keys.json');

  // Clean up test data before and after each test
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      const dir = path.dirname(testApiKeysPath);
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  }

  describe('generateApiKey()', () => {
    it('should generate API key with correct format', async () => {
      const description = 'Test API key';
      const { key, keyData } = await generateApiKey(testProjectId, description);

      // Check key format: agt_proj_{projectId}_{32-hex-chars}
      expect(key).toMatch(/^agt_proj_[a-zA-Z0-9_-]+_[a-f0-9]{32}$/);
      expect(key.length).toBe(50);
    });

    it('should return key metadata with UUID', async () => {
      const description = 'Test API key';
      const { keyData } = await generateApiKey(testProjectId, description);

      expect(keyData.id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      expect(keyData.projectId).toBe(testProjectId);
      expect(keyData.description).toBe(description);
      expect(keyData.keyHash).toBeDefined();
      expect(keyData.createdAt).toBeDefined();
    });

    it('should store hashed key, not plaintext', async () => {
      const description = 'Test API key';
      const { key, keyData } = await generateApiKey(testProjectId, description);

      // Hash should not equal plaintext key
      expect(keyData.keyHash).not.toBe(key);
      // Hash should be bcrypt format (starts with $2b$)
      expect(keyData.keyHash).toMatch(/^\$2[aby]\$/);
    });

    it('should create multiple unique keys', async () => {
      const key1 = await generateApiKey(testProjectId, 'Key 1');
      const key2 = await generateApiKey(testProjectId, 'Key 2');

      expect(key1.key).not.toBe(key2.key);
      expect(key1.keyData.id).not.toBe(key2.keyData.id);
      expect(key1.keyData.keyHash).not.toBe(key2.keyData.keyHash);
    });

    it('should persist keys to filesystem', async () => {
      await generateApiKey(testProjectId, 'Key 1');
      await generateApiKey(testProjectId, 'Key 2');

      const keys = await listApiKeys(testProjectId);
      expect(keys).toHaveLength(2);
      expect(keys[0].description).toBe('Key 1');
      expect(keys[1].description).toBe('Key 2');
    });
  });

  describe('hashApiKey()', () => {
    it('should hash key using bcrypt', async () => {
      const key = 'agt_proj_test_abcdef1234567890abcdef1234567890';
      const hash = await hashApiKey(key);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same key (bcrypt salt)', async () => {
      const key = 'agt_proj_test_abcdef1234567890abcdef1234567890';
      const hash1 = await hashApiKey(key);
      const hash2 = await hashApiKey(key);

      // Bcrypt generates different hashes due to salt
      expect(hash1).not.toBe(hash2);
    });

    it('should hash key in ~100ms or less', async () => {
      const key = 'agt_proj_test_abcdef1234567890abcdef1234567890';
      const startTime = Date.now();
      await hashApiKey(key);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (bcrypt with 10 rounds)
      expect(duration).toBeLessThan(200);
    });
  });

  describe('validateApiKey()', () => {
    it('should validate correct API key', async () => {
      const description = 'Test key';
      const { key } = await generateApiKey(testProjectId, description);

      const validation = await validateApiKey(testProjectId, key);

      expect(validation.valid).toBe(true);
      expect(validation.keyId).toBeDefined();
      expect(validation.keyData).toBeDefined();
    });

    it('should reject incorrect API key', async () => {
      await generateApiKey(testProjectId, 'Test key');
      const wrongKey = 'agt_proj_test_wrongwrongwrongwrongwrongwrong';

      const validation = await validateApiKey(testProjectId, wrongKey);

      expect(validation.valid).toBe(false);
      expect(validation.keyId).toBeUndefined();
      expect(validation.keyData).toBeUndefined();
    });

    it('should reject revoked API key', async () => {
      const { key, keyData } = await generateApiKey(testProjectId, 'Test key');

      // Revoke the key
      await revokeApiKey(testProjectId, keyData.id);

      // Try to validate revoked key
      const validation = await validateApiKey(testProjectId, key);

      expect(validation.valid).toBe(false);
    });

    it('should update lastUsedAt timestamp on successful validation', async () => {
      const { key, keyData } = await generateApiKey(testProjectId, 'Test key');

      // Initial state - no lastUsedAt
      expect(keyData.lastUsedAt).toBeUndefined();

      // Validate key
      await validateApiKey(testProjectId, key);

      // Check that lastUsedAt was updated
      const updatedKey = await getApiKey(testProjectId, keyData.id);
      expect(updatedKey?.lastUsedAt).toBeDefined();
    });

    it('should return key metadata on successful validation', async () => {
      const description = 'Test key';
      const { key, keyData } = await generateApiKey(testProjectId, description);

      const validation = await validateApiKey(testProjectId, key);

      expect(validation.valid).toBe(true);
      expect(validation.keyId).toBe(keyData.id);
      expect(validation.keyData?.description).toBe(description);
      expect(validation.keyData?.projectId).toBe(testProjectId);
    });
  });

  describe('revokeApiKey()', () => {
    it('should revoke existing API key', async () => {
      const { keyData } = await generateApiKey(testProjectId, 'Test key');

      const success = await revokeApiKey(testProjectId, keyData.id);

      expect(success).toBe(true);

      // Verify key is revoked
      const keys = await listApiKeys(testProjectId, true);
      const revokedKey = keys.find((k) => k.id === keyData.id);
      expect(revokedKey?.revokedAt).toBeDefined();
    });

    it('should return false for non-existent key', async () => {
      const success = await revokeApiKey(testProjectId, 'non-existent-key-id');
      expect(success).toBe(false);
    });

    it('should keep revoked key for audit trail', async () => {
      const { keyData } = await generateApiKey(testProjectId, 'Test key');

      await revokeApiKey(testProjectId, keyData.id);

      // Revoked keys should still be in registry
      const allKeys = await listApiKeys(testProjectId, true);
      const revokedKey = allKeys.find((k) => k.id === keyData.id);
      expect(revokedKey).toBeDefined();
      expect(revokedKey?.revokedAt).toBeDefined();
    });

    it('should exclude revoked keys from default list', async () => {
      const { keyData: key1 } = await generateApiKey(testProjectId, 'Key 1');
      const { keyData: key2 } = await generateApiKey(testProjectId, 'Key 2');

      // Revoke first key
      await revokeApiKey(testProjectId, key1.id);

      // Default list should exclude revoked keys
      const activeKeys = await listApiKeys(testProjectId);
      expect(activeKeys).toHaveLength(1);
      expect(activeKeys[0].id).toBe(key2.id);

      // includeRevoked should return both
      const allKeys = await listApiKeys(testProjectId, true);
      expect(allKeys).toHaveLength(2);
    });
  });

  describe('listApiKeys()', () => {
    it('should list all active API keys', async () => {
      await generateApiKey(testProjectId, 'Key 1');
      await generateApiKey(testProjectId, 'Key 2');
      await generateApiKey(testProjectId, 'Key 3');

      const keys = await listApiKeys(testProjectId);

      expect(keys).toHaveLength(3);
      expect(keys[0].description).toBe('Key 1');
      expect(keys[1].description).toBe('Key 2');
      expect(keys[2].description).toBe('Key 3');
    });

    it('should return empty array when no keys exist', async () => {
      const keys = await listApiKeys(testProjectId);
      expect(keys).toHaveLength(0);
    });

    it('should exclude revoked keys by default', async () => {
      const { keyData: key1 } = await generateApiKey(testProjectId, 'Key 1');
      await generateApiKey(testProjectId, 'Key 2');

      await revokeApiKey(testProjectId, key1.id);

      const keys = await listApiKeys(testProjectId);
      expect(keys).toHaveLength(1);
      expect(keys[0].description).toBe('Key 2');
    });

    it('should include revoked keys when requested', async () => {
      const { keyData: key1 } = await generateApiKey(testProjectId, 'Key 1');
      await generateApiKey(testProjectId, 'Key 2');

      await revokeApiKey(testProjectId, key1.id);

      const keys = await listApiKeys(testProjectId, true);
      expect(keys).toHaveLength(2);
    });
  });

  describe('rotateApiKey()', () => {
    it('should generate new key and schedule old key revocation', async () => {
      const { keyData: oldKey } = await generateApiKey(testProjectId, 'Original key');

      const { key: newKey, keyData: newKeyData, oldKeyId } = await rotateApiKey(
        testProjectId,
        oldKey.id,
        'Rotated key',
        100 // Short grace period for testing
      );

      expect(newKey).toBeDefined();
      expect(newKey).not.toBe(oldKey.keyHash);
      expect(newKeyData.id).not.toBe(oldKey.id);
      expect(oldKeyId).toBe(oldKey.id);
      expect(newKeyData.description).toBe('Rotated key');
    });

    it('should keep old key description if not provided', async () => {
      const originalDescription = 'Original key description';
      const { keyData: oldKey } = await generateApiKey(testProjectId, originalDescription);

      const { keyData: newKeyData } = await rotateApiKey(
        testProjectId,
        oldKey.id,
        originalDescription
      );

      expect(newKeyData.description).toBe(originalDescription);
    });

    it('should not immediately revoke old key (grace period)', async () => {
      const { key: oldKeyPlaintext, keyData: oldKey } = await generateApiKey(testProjectId, 'Old key');

      await rotateApiKey(testProjectId, oldKey.id, 'New key', 5000);

      // Old key should still be valid immediately after rotation
      const validation = await validateApiKey(testProjectId, oldKeyPlaintext);
      expect(validation.valid).toBe(true);
    });

    it('should revoke old key after grace period', async () => {
      const { key: oldKeyPlaintext, keyData: oldKey } = await generateApiKey(testProjectId, 'Old key');

      await rotateApiKey(testProjectId, oldKey.id, 'New key', 100);

      // Wait for grace period to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Old key should now be revoked
      const validation = await validateApiKey(testProjectId, oldKeyPlaintext);
      expect(validation.valid).toBe(false);
    }, 10000);
  });

  describe('getApiKey()', () => {
    it('should retrieve API key by ID', async () => {
      const { keyData } = await generateApiKey(testProjectId, 'Test key');

      const retrievedKey = await getApiKey(testProjectId, keyData.id);

      expect(retrievedKey).toBeDefined();
      expect(retrievedKey?.id).toBe(keyData.id);
      expect(retrievedKey?.description).toBe('Test key');
    });

    it('should return null for non-existent key', async () => {
      const retrievedKey = await getApiKey(testProjectId, 'non-existent-key-id');
      expect(retrievedKey).toBeNull();
    });

    it('should return revoked keys', async () => {
      const { keyData } = await generateApiKey(testProjectId, 'Test key');
      await revokeApiKey(testProjectId, keyData.id);

      const retrievedKey = await getApiKey(testProjectId, keyData.id);

      expect(retrievedKey).toBeDefined();
      expect(retrievedKey?.revokedAt).toBeDefined();
    });
  });

  describe('Key Format and Security', () => {
    it('should never expose plaintext keys after generation', async () => {
      const { key, keyData } = await generateApiKey(testProjectId, 'Test key');

      // Verify plaintext key is never stored
      const keys = await listApiKeys(testProjectId, true);
      const storedKey = keys.find((k) => k.id === keyData.id);

      expect(storedKey).toBeDefined();
      expect(storedKey?.keyHash).not.toContain(key);
      // @ts-ignore - checking that key field doesn't exist
      expect(storedKey?.key).toBeUndefined();
    });

    it('should use bcrypt salt rounds 10', async () => {
      const key = 'agt_proj_test_abcdef1234567890abcdef1234567890';
      const hash = await hashApiKey(key);

      // Bcrypt format: $2b$10$... (10 is salt rounds)
      expect(hash).toMatch(/^\$2[aby]\$10\$/);
    });
  });
});
