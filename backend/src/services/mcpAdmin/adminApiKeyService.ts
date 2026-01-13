/**
 * Admin API Key Service
 *
 * Manages API keys for MCP Admin Server authentication.
 * Keys are stored globally (not per-project) with permission-based access control.
 *
 * Storage: ~/.claude-agent/admin-api-keys.json
 * Key Format: ask_{32-hex-chars}
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import lockfile from 'proper-lockfile';
import type { AdminApiKey, AdminApiKeyRegistry, AdminPermission } from './types.js';

const SALT_ROUNDS = 10;
const KEY_PREFIX = 'ask_'; // Admin Server Key

// AES-256-GCM encryption key derived from a stable secret
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.ADMIN_API_KEY_SECRET || 'agentstudio-admin-api-key-secret-v1')
  .digest();

const LOCK_OPTIONS = {
  retries: { retries: 5, minTimeout: 100, maxTimeout: 500 },
};

/**
 * Get path to admin API keys file
 */
function getAdminApiKeysPath(): string {
  const homeDir = process.env.HOME || process.cwd();
  return path.join(homeDir, '.claude-agent', 'admin-api-keys.json');
}

/**
 * Encrypt a plaintext API key using AES-256-GCM
 */
function encryptKey(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted API key
 */
function decryptKey(encryptedData: string): string | null {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    if (!ivHex || !authTagHex || !encrypted) {
      return null;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Load admin API key registry
 */
async function loadRegistry(): Promise<AdminApiKeyRegistry> {
  const filePath = getAdminApiKeysPath();

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as AdminApiKeyRegistry;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: '1.0.0', keys: [] };
    }
    throw error;
  }
}

/**
 * Save admin API key registry with file locking
 */
async function saveRegistry(registry: AdminApiKeyRegistry): Promise<void> {
  const filePath = getAdminApiKeysPath();
  const dir = path.dirname(filePath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Check if file exists for lockfile
  let fileExists = true;
  try {
    await fs.access(filePath);
  } catch {
    fileExists = false;
    await fs.writeFile(filePath, JSON.stringify({ version: '1.0.0', keys: [] }, null, 2), 'utf-8');
  }

  const release = await lockfile.lock(filePath, LOCK_OPTIONS);

  try {
    await fs.writeFile(filePath, JSON.stringify(registry, null, 2), 'utf-8');
  } finally {
    await release();
  }
}

/**
 * Generate a new admin API key
 * @param description - Human-readable description of the key
 * @param permissions - Array of permission strings (default: ['admin:*'])
 * @param allowedTools - Optional array of tool names this key can access. If undefined, all tools are accessible (based on permissions).
 */
export async function generateAdminApiKey(
  description: string,
  permissions: AdminPermission[] = ['admin:*'],
  allowedTools?: string[]
): Promise<{ key: string; keyData: AdminApiKey }> {
  const registry = await loadRegistry();

  // Generate key: ask_{32-hex-chars}
  const keyBytes = crypto.randomBytes(16);
  const plainKey = `${KEY_PREFIX}${keyBytes.toString('hex')}`;

  // Hash the key for storage
  const keyHash = await bcrypt.hash(plainKey, SALT_ROUNDS);

  // Encrypt the key for display purposes
  const encryptedKey = encryptKey(plainKey);

  const keyData: AdminApiKey = {
    id: uuidv4(),
    keyHash,
    encryptedKey,
    description,
    createdAt: new Date().toISOString(),
    permissions,
    allowedTools: allowedTools && allowedTools.length > 0 ? allowedTools : undefined,
  };

  registry.keys.push(keyData);
  await saveRegistry(registry);

  return { key: plainKey, keyData };
}

/**
 * Validate an admin API key
 */
export async function validateAdminApiKey(
  apiKey: string
): Promise<{ valid: boolean; keyId?: string; permissions?: AdminPermission[]; allowedTools?: string[]; disabled?: boolean }> {
  if (!apiKey || !apiKey.startsWith(KEY_PREFIX)) {
    return { valid: false };
  }

  const registry = await loadRegistry();

  for (const keyData of registry.keys) {
    // Skip revoked keys
    if (keyData.revokedAt) {
      continue;
    }

    // Compare key hash
    const isMatch = await bcrypt.compare(apiKey, keyData.keyHash);

    if (isMatch) {
      // Check if key is disabled
      if (keyData.enabled === false) {
        return { valid: false, disabled: true };
      }

      // Update last used timestamp
      keyData.lastUsedAt = new Date().toISOString();
      await saveRegistry(registry);

      return {
        valid: true,
        keyId: keyData.id,
        permissions: keyData.permissions,
        allowedTools: keyData.allowedTools,
      };
    }
  }

  return { valid: false };
}

/**
 * List all admin API keys (with decrypted keys for display)
 */
export async function listAdminApiKeys(): Promise<
  Array<AdminApiKey & { decryptedKey?: string }>
> {
  const registry = await loadRegistry();

  return registry.keys.map((key) => ({
    ...key,
    decryptedKey: decryptKey(key.encryptedKey) || undefined,
  }));
}

/**
 * Revoke an admin API key
 */
export async function revokeAdminApiKey(keyId: string): Promise<boolean> {
  const registry = await loadRegistry();

  const key = registry.keys.find((k) => k.id === keyId);
  if (!key) {
    return false;
  }

  key.revokedAt = new Date().toISOString();
  await saveRegistry(registry);

  return true;
}

/**
 * Check if a permission is granted
 */
export function hasPermission(
  userPermissions: AdminPermission[],
  requiredPermission: AdminPermission
): boolean {
  // admin:* grants all permissions
  if (userPermissions.includes('admin:*')) {
    return true;
  }

  // Check for exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard (e.g., 'projects:write' implies 'projects:read')
  const [category, action] = requiredPermission.split(':');
  if (action === 'read' && userPermissions.includes(`${category}:write` as AdminPermission)) {
    return true;
  }

  return false;
}

/**
 * Delete an admin API key permanently
 */
export async function deleteAdminApiKey(keyId: string): Promise<boolean> {
  const registry = await loadRegistry();

  const index = registry.keys.findIndex((k) => k.id === keyId);
  if (index === -1) {
    return false;
  }

  registry.keys.splice(index, 1);
  await saveRegistry(registry);

  return true;
}

/**
 * Update an admin API key
 */
export async function updateAdminApiKey(
  keyId: string,
  updates: {
    description?: string;
    allowedTools?: string[];
    enabled?: boolean;
  }
): Promise<AdminApiKey | null> {
  const registry = await loadRegistry();

  const key = registry.keys.find((k) => k.id === keyId);
  if (!key) {
    return null;
  }

  // Apply updates
  if (updates.description !== undefined) {
    key.description = updates.description;
  }
  if (updates.allowedTools !== undefined) {
    key.allowedTools = updates.allowedTools.length > 0 ? updates.allowedTools : undefined;
  }
  if (updates.enabled !== undefined) {
    key.enabled = updates.enabled;
  }

  await saveRegistry(registry);

  return key;
}

/**
 * Toggle admin API key enabled status
 */
export async function toggleAdminApiKey(keyId: string, enabled: boolean): Promise<boolean> {
  const registry = await loadRegistry();

  const key = registry.keys.find((k) => k.id === keyId);
  if (!key) {
    return false;
  }

  key.enabled = enabled;
  await saveRegistry(registry);

  return true;
}
