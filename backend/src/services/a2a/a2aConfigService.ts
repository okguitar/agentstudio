/**
 * A2A Configuration Service
 *
 * Manages project-level A2A configuration including allowed agents, timeouts, and limits.
 * Configuration stored in projects/:projectId/.a2a/config.json
 *
 * Phase 5: US3 - Agent as A2A Client (config dependency)
 * Phase 7: US5 - Project-Level A2A Configuration (full implementation)
 */

import fs from 'fs/promises';
import path from 'path';
import lockfile from 'proper-lockfile';
import type { A2AConfig } from '../../types/a2a.js';
import { DEFAULT_A2A_CONFIG } from '../../types/a2a.js';
import { isIPAddress } from '../../middleware/httpsOnly.js';

const LOCK_OPTIONS = {
  retries: { retries: 5, minTimeout: 100, maxTimeout: 500 },
};

/**
 * Get path to project's A2A config file
 *
 * @param projectId - Project identifier (used as directory name)
 * @returns Absolute path to config file
 */
function getConfigPath(projectId: string): string {
  // Check if the projectId looks like an absolute path
  if (path.isAbsolute(projectId)) {
    return path.join(projectId, '.a2a', 'config.json');
  }

  // Projects are stored in ~/.claude/projects/
  const projectsDir = path.join(process.env.HOME || process.cwd(), '.claude', 'projects');
  return path.join(projectsDir, projectId, '.a2a', 'config.json');
}

/**
 * Load A2A configuration for a project
 *
 * Returns default config if file doesn't exist.
 *
 * @param projectId - Project identifier
 * @returns A2A configuration or null on error
 */
export async function loadA2AConfig(projectId: string): Promise<A2AConfig | null> {
  const configPath = getConfigPath(projectId);

  try {
    const data = await fs.readFile(configPath, 'utf-8');
    const config: A2AConfig = JSON.parse(data);
    return config;
  } catch (error) {
    // If file doesn't exist, return default config
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return DEFAULT_A2A_CONFIG;
    }

    console.error(`[A2A Config] Error loading config for project ${projectId}:`, error);
    return null;
  }
}

/**
 * Save A2A configuration for a project
 *
 * Creates directory structure if needed.
 * Uses file locking for concurrent safety.
 *
 * @param projectId - Project identifier
 * @param config - A2A configuration to save
 */
export async function saveA2AConfig(projectId: string, config: A2AConfig): Promise<void> {
  const configPath = getConfigPath(projectId);
  const configDir = path.dirname(configPath);

  // Ensure directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Create empty file if it doesn't exist (helps with file locking)
  try {
    await fs.access(configPath);
  } catch {
    // File doesn't exist, create empty file
    await fs.writeFile(configPath, '{}', 'utf-8');
  }

  // Acquire lock for atomic write
  const release = await lockfile.lock(configPath, LOCK_OPTIONS);

  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } finally {
    await release();
  }
}

/**
 * Validate A2A configuration
 *
 * Checks for required fields and value constraints.
 *
 * @param config - Configuration to validate
 * @returns Validation result with error details if invalid
 */
export function validateA2AConfig(config: A2AConfig): {
  valid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  // Validate allowedAgents
  if (!Array.isArray(config.allowedAgents)) {
    errors.push('allowedAgents must be an array');
  } else {
    config.allowedAgents.forEach((agent, index) => {
      if (!agent.name || typeof agent.name !== 'string') {
        errors.push(`allowedAgents[${index}].name is required and must be a string`);
      }

      if (!agent.url || typeof agent.url !== 'string') {
        errors.push(`allowedAgents[${index}].url is required and must be a string`);
      } else {
        // Validate URL format
        try {
          const parsedUrl = new URL(agent.url);
          // In production, require HTTPS for domain names
          // IP addresses are exempt (internal/proxy scenarios)
          if (process.env.NODE_ENV === 'production' && !agent.url.startsWith('https://')) {
            // Check if hostname is an IP address
            const isIP = isIPAddress(parsedUrl.hostname);
            if (!isIP) {
              errors.push(`allowedAgents[${index}].url must use HTTPS in production (IP addresses exempt)`);
            }
          }
        } catch {
          errors.push(`allowedAgents[${index}].url is not a valid URL`);
        }
      }

      if (agent.apiKey === undefined || typeof agent.apiKey !== 'string') {
        errors.push(`allowedAgents[${index}].apiKey is required and must be a string`);
      }

      if (typeof agent.enabled !== 'boolean') {
        errors.push(`allowedAgents[${index}].enabled must be a boolean`);
      }
    });
  }

  // Validate taskTimeout
  if (typeof config.taskTimeout !== 'number') {
    errors.push('taskTimeout must be a number');
  } else if (config.taskTimeout < 1000 || config.taskTimeout > 1800000) {
    errors.push('taskTimeout must be between 1000 and 1800000 milliseconds');
  }

  // Validate maxConcurrentTasks
  if (typeof config.maxConcurrentTasks !== 'number') {
    errors.push('maxConcurrentTasks must be a number');
  } else if (config.maxConcurrentTasks < 1 || config.maxConcurrentTasks > 50) {
    errors.push('maxConcurrentTasks must be between 1 and 50');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Initialize default A2A config for a new project
 *
 * Creates .a2a directory and config.json with default values.
 *
 * @param projectId - Project identifier
 */
export async function initializeA2AConfig(projectId: string): Promise<void> {
  const existingConfig = await loadA2AConfig(projectId);

  // Only initialize if config doesn't exist (loadA2AConfig returns DEFAULT_A2A_CONFIG for missing files)
  const configPath = getConfigPath(projectId);
  try {
    await fs.access(configPath);
    // File exists, don't overwrite
    return;
  } catch {
    // File doesn't exist, create it
    await saveA2AConfig(projectId, DEFAULT_A2A_CONFIG);
    console.info(`[A2A Config] Initialized default config for project ${projectId}`);
  }
}
