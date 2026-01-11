/**
 * Agent Mapping Service
 *
 * Maps A2A agent IDs (UUID v4) to internal project/agent identifiers.
 * Provides bidirectional resolution and lazy generation of A2A IDs.
 *
 * Storage: ~/.claude-agent/a2a-agent-mappings.json (global registry)
 * Format: { version: "1.0.0", mappings: { [a2aAgentId]: AgentMapping } }
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import lockfile from 'proper-lockfile';
import type { AgentMapping, AgentMappingRegistry } from '../../types/a2a.js';
import { A2A_AGENT_MAPPINGS_FILE } from '../../config/paths.js';

const MAPPINGS_FILE = A2A_AGENT_MAPPINGS_FILE;
const LOCK_OPTIONS = {
  retries: { retries: 5, minTimeout: 100, maxTimeout: 500 },
};

// In-memory cache for fast lookups
let cachedRegistry: AgentMappingRegistry | null = null;

/**
 * Load agent mapping registry from disk
 * Uses in-memory cache if available and not explicitly bypassed
 */
async function loadRegistry(bypassCache = false): Promise<AgentMappingRegistry> {
  if (cachedRegistry && !bypassCache) {
    return cachedRegistry;
  }

  try {
    const data = await fs.readFile(MAPPINGS_FILE, 'utf-8');
    const registry: AgentMappingRegistry = JSON.parse(data);
    cachedRegistry = registry;
    return registry;
  } catch (error) {
    // If file doesn't exist, return empty registry
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const emptyRegistry: AgentMappingRegistry = {
        version: '1.0.0',
        mappings: {},
      };
      cachedRegistry = emptyRegistry;
      return emptyRegistry;
    }
    throw error;
  }
}

/**
 * Save agent mapping registry to disk with file locking
 * Invalidates in-memory cache
 */
async function saveRegistry(registry: AgentMappingRegistry): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(MAPPINGS_FILE);
  await fs.mkdir(dir, { recursive: true });

  // Check if file exists, if not create it first (for lockfile to work)
  let fileExists = true;
  try {
    await fs.access(MAPPINGS_FILE);
  } catch {
    fileExists = false;
    // Create empty file first so lockfile can work
    await fs.writeFile(MAPPINGS_FILE, JSON.stringify({ version: '1.0.0', mappings: {} }, null, 2), 'utf-8');
  }

  // Acquire lock for atomic write
  const release = await lockfile.lock(MAPPINGS_FILE, LOCK_OPTIONS);

  try {
    await fs.writeFile(MAPPINGS_FILE, JSON.stringify(registry, null, 2), 'utf-8');
    cachedRegistry = registry;
  } finally {
    await release();
  }
}

/**
 * Get or create A2A agent ID for a project/agent combination
 * Lazily generates UUID v4 on first request
 *
 * @param projectId - Internal project identifier
 * @param agentType - Internal agent type identifier
 * @param workingDirectory - Absolute path to project working directory
 * @returns A2A agent ID (UUID v4)
 */
export async function getOrCreateA2AId(
  projectId: string,
  agentType: string,
  workingDirectory: string
): Promise<string> {
  const registry = await loadRegistry();

  // Check if mapping already exists
  for (const [a2aAgentId, mapping] of Object.entries(registry.mappings)) {
    if (mapping.projectId === projectId && mapping.agentType === agentType) {
      // Update last accessed timestamp
      mapping.lastAccessedAt = new Date().toISOString();
      await saveRegistry(registry);
      return a2aAgentId;
    }
  }

  // Create new mapping
  const a2aAgentId = uuidv4();
  const now = new Date().toISOString();

  const newMapping: AgentMapping = {
    a2aAgentId,
    projectId,
    agentType,
    workingDirectory,
    createdAt: now,
    lastAccessedAt: now,
  };

  registry.mappings[a2aAgentId] = newMapping;
  await saveRegistry(registry);

  return a2aAgentId;
}

/**
 * Resolve A2A agent ID to internal project/agent mapping
 *
 * @param a2aAgentId - A2A agent ID (UUID v4)
 * @returns AgentMapping or null if not found
 */
export async function resolveA2AId(a2aAgentId: string): Promise<AgentMapping | null> {
  const registry = await loadRegistry();
  const mapping = registry.mappings[a2aAgentId];

  if (!mapping) {
    return null;
  }

  // Update last accessed timestamp
  mapping.lastAccessedAt = new Date().toISOString();
  await saveRegistry(registry);

  return mapping;
}

/**
 * List all agent mappings
 *
 * @returns Array of all agent mappings
 */
export async function listAgentMappings(): Promise<AgentMapping[]> {
  const registry = await loadRegistry();
  return Object.values(registry.mappings);
}

/**
 * Delete agent mapping (used when project or agent is deleted)
 *
 * @param a2aAgentId - A2A agent ID to delete
 * @returns true if deleted, false if not found
 */
export async function deleteAgentMapping(a2aAgentId: string): Promise<boolean> {
  const registry = await loadRegistry(true); // Bypass cache

  if (!registry.mappings[a2aAgentId]) {
    return false;
  }

  delete registry.mappings[a2aAgentId];
  await saveRegistry(registry);
  return true;
}

/**
 * Get A2A agent ID for a project/agent combination without creating
 *
 * @param projectId - Internal project identifier
 * @param agentType - Internal agent type identifier
 * @returns A2A agent ID or null if not found
 */
export async function getA2AId(projectId: string, agentType: string): Promise<string | null> {
  const registry = await loadRegistry();

  for (const [a2aAgentId, mapping] of Object.entries(registry.mappings)) {
    if (mapping.projectId === projectId && mapping.agentType === agentType) {
      return a2aAgentId;
    }
  }

  return null;
}

/**
 * Invalidate in-memory cache (useful for testing)
 */
export function invalidateCache(): void {
  cachedRegistry = null;
}
