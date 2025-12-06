/**
 * API Key Service
 *
 * Manages inbound API keys for authenticating external callers to AgentStudio agents.
 * Keys are stored hashed with bcrypt (salt rounds 10) for security.
 *
 * Storage: {projectPath}/.a2a/api-keys.json
 * Format: { version: "1.0.0", keys: [A2AApiKey[]] }
 *
 * Key Format: agt_proj_{projectId}_{32-hex-chars}
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
// Temporary fix for bcrypt compilation issues
import { v4 as uuidv4 } from 'uuid';
import lockfile from 'proper-lockfile';
import type { A2AApiKey, A2AApiKeyRegistry } from '../../types/a2a.js';
import { getProjectApiKeysFile } from '../../config/paths.js';

const SALT_ROUNDS = 10;

const hashKey = async (key: string): Promise<string> => {
  return bcrypt.hash(key, SALT_ROUNDS);
};

const compareKey = async (key: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(key, hash);
};
const LOCK_OPTIONS = {
  retries: { retries: 5, minTimeout: 100, maxTimeout: 500 },
};

/**
 * Get path to project's API keys file
 * @param projectPath - Absolute path to the project working directory
 */
function getApiKeysPath(projectPath: string): string {
  return getProjectApiKeysFile(projectPath);
}

/**
 * Load API key registry for a project
 */
async function loadApiKeyRegistry(projectId: string): Promise<A2AApiKeyRegistry> {
  const filePath = getApiKeysPath(projectId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as A2AApiKeyRegistry;
  } catch (error) {
    // If file doesn't exist, return empty registry
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        version: '1.0.0',
        keys: [],
      };
    }
    throw error;
  }
}

/**
 * Save API key registry for a project with file locking
 */
async function saveApiKeyRegistry(projectId: string, registry: A2AApiKeyRegistry): Promise<void> {
  const filePath = getApiKeysPath(projectId);
  const dir = path.dirname(filePath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Create empty file if it doesn't exist (helps with file locking)
  try {
    await fs.access(filePath);
  } catch {
    // File doesn't exist, create empty file
    await fs.writeFile(filePath, JSON.stringify({ version: '1.0.0', keys: [] }, null, 2), 'utf-8');
  }

  // Acquire lock for atomic write
  const release = await lockfile.lock(filePath, LOCK_OPTIONS);

  try {
    await fs.writeFile(filePath, JSON.stringify(registry, null, 2), 'utf-8');
  } finally {
    await release();
  }
}

/**
 * Generate a short project identifier from project path
 * Uses first 8 characters of SHA256 hash of the path
 */
function generateProjectIdentifier(projectPath: string): string {
  return crypto.createHash('sha256').update(projectPath).digest('hex').substring(0, 8);
}

/**
 * Generate a new API key for a project
 *
 * @param projectId - Internal project identifier (can be a path)
 * @param description - Human-readable description of the key
 * @returns Object containing the generated key (plaintext, shown once) and key metadata
 */
export async function generateApiKey(
  projectId: string,
  description: string
): Promise<{ key: string; keyData: A2AApiKey }> {
  // Generate short project identifier from path (8-char hash instead of full path)
  const projectIdHash = generateProjectIdentifier(projectId);

  // Generate random API key
  const random = crypto.randomBytes(16).toString('hex'); // 32 hex characters
  const key = `agt_proj_${projectIdHash}_${random}`;

  // Hash the key with bcrypt
  const keyHash = await hashKey(key);

  // Create key metadata
  const keyId = uuidv4();
  const now = new Date().toISOString();

  const keyData: A2AApiKey = {
    id: keyId,
    projectId,
    keyHash,
    description,
    createdAt: now,
  };

  // Load registry and add key
  const registry = await loadApiKeyRegistry(projectId);
  registry.keys.push(keyData);
  await saveApiKeyRegistry(projectId, registry);

  // Return plaintext key (only time it's shown) and metadata
  return { key, keyData };
}

/**
 * Hash an API key using bcrypt
 * This is a pure function used internally and for testing
 *
 * @param key - Plaintext API key
 * @returns Bcrypt hash
 */
export async function hashApiKey(key: string): Promise<string> {
  return hashKey(key);
}

/**
 * Validate an API key against project's stored hashes
 *
 * @param projectId - Internal project identifier
 * @param key - Plaintext API key to validate
 * @returns Object with validation result and key ID if valid
 */
export async function validateApiKey(
  projectId: string,
  key: string
): Promise<{ valid: boolean; keyId?: string; keyData?: A2AApiKey }> {
  const registry = await loadApiKeyRegistry(projectId);

  // Try to match key against each stored hash
  for (const keyData of registry.keys) {
    // Skip revoked keys
    if (keyData.revokedAt) {
      continue;
    }

    // Compare key with hash
    const isMatch = await compareKey(key, keyData.keyHash);

    if (isMatch) {
      // Update last used timestamp
      keyData.lastUsedAt = new Date().toISOString();
      await saveApiKeyRegistry(projectId, registry);

      return {
        valid: true,
        keyId: keyData.id,
        keyData,
      };
    }
  }

  return { valid: false };
}

/**
 * Revoke an API key (soft delete - kept for audit trail)
 *
 * @param projectId - Internal project identifier
 * @param keyId - Key ID to revoke
 * @returns true if key was revoked, false if not found
 */
export async function revokeApiKey(projectId: string, keyId: string): Promise<boolean> {
  const registry = await loadApiKeyRegistry(projectId);

  const key = registry.keys.find((k) => k.id === keyId);

  if (!key) {
    return false;
  }

  // Mark as revoked
  key.revokedAt = new Date().toISOString();
  await saveApiKeyRegistry(projectId, registry);

  return true;
}

/**
 * List all API keys for a project (excluding revoked keys by default)
 *
 * @param projectId - Internal project identifier
 * @param includeRevoked - Whether to include revoked keys
 * @returns Array of API key metadata (hashes only, never plaintext)
 */
export async function listApiKeys(projectId: string, includeRevoked = false): Promise<A2AApiKey[]> {
  const registry = await loadApiKeyRegistry(projectId);

  if (includeRevoked) {
    return registry.keys;
  }

  return registry.keys.filter((key) => !key.revokedAt);
}

/**
 * Rotate an API key (generate new key and revoke old one)
 *
 * @param projectId - Internal project identifier
 * @param oldKeyId - ID of key to rotate
 * @param description - Description for new key
 * @param gracePeriodMs - Grace period in milliseconds before revoking old key (default 5 minutes)
 * @returns New key data
 */
export async function rotateApiKey(
  projectId: string,
  oldKeyId: string,
  description: string,
  gracePeriodMs = 5 * 60 * 1000 // 5 minutes
): Promise<{ key: string; keyData: A2AApiKey; oldKeyId: string }> {
  // Generate new key
  const newKey = await generateApiKey(projectId, description);

  // Schedule revocation of old key after grace period
  setTimeout(async () => {
    try {
      await revokeApiKey(projectId, oldKeyId);
    } catch (error) {
      console.error(`Failed to revoke old key ${oldKeyId} after rotation:`, error);
    }
  }, gracePeriodMs);

  return {
    ...newKey,
    oldKeyId,
  };
}

/**
 * Get API key metadata by ID
 *
 * @param projectId - Internal project identifier
 * @param keyId - Key ID
 * @returns API key metadata or null if not found
 */
export async function getApiKey(projectId: string, keyId: string): Promise<A2AApiKey | null> {
  const registry = await loadApiKeyRegistry(projectId);
  return registry.keys.find((k) => k.id === keyId) || null;
}
