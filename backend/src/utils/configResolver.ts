/**
 * Config Resolver - Unified configuration resolution for provider and model selection
 *
 * Priority Chain:
 * - Provider: channel input > agent config > project config > system default
 * - Model: channel input > project config > provider's first model > system default ('sonnet')
 */

import { ProjectMetadataStorage } from '../services/projectMetadataStorage.js';
import {
  getDefaultVersionId,
  getVersionByIdInternal,
} from '../services/claudeVersionStorage.js';
import type { ClaudeVersion } from '../types/claude-versions.js';

export interface ResolvedConfig {
  /** Resolved provider ID */
  providerId: string | null;
  /** Resolved model */
  model: string;
  /** Provider details (if found) */
  provider: ClaudeVersion | null;
  /** Resolution trace for debugging */
  resolutionTrace: {
    providerSource: 'channel' | 'agent' | 'project' | 'system' | 'none';
    modelSource: 'channel' | 'project' | 'provider' | 'fallback';
  };
}

export interface ConfigResolverOptions {
  /** Provider ID explicitly passed from calling channel */
  channelProviderId?: string;
  /** Model explicitly passed from calling channel */
  channelModel?: string;
  /** Agent configuration (may contain claudeVersionId) */
  agent?: {
    claudeVersionId?: string;
  };
  /** Project path for project-level defaults */
  projectPath?: string;
}

// Singleton instance for project metadata
let projectMetadataStorage: ProjectMetadataStorage | null = null;

function getProjectMetadataStorage(): ProjectMetadataStorage {
  if (!projectMetadataStorage) {
    projectMetadataStorage = new ProjectMetadataStorage();
  }
  return projectMetadataStorage;
}

/**
 * Resolve provider and model configuration based on priority chain
 *
 * Provider Priority:
 * 1. Channel input (explicit)
 * 2. Agent config (claudeVersionId)
 * 3. Project config (defaultProviderId)
 * 4. System default provider
 *
 * Model Priority:
 * 1. Channel input (explicit)
 * 2. Project config (defaultModel)
 * 3. Provider's first model
 * 4. System default ('sonnet')
 */
export async function resolveConfig(
  options: ConfigResolverOptions
): Promise<ResolvedConfig> {
  const { channelProviderId, channelModel, agent, projectPath } = options;

  // Get project metadata if path is provided
  let projectMeta: { defaultProviderId?: string; defaultModel?: string } | null = null;
  if (projectPath) {
    try {
      const storage = getProjectMetadataStorage();
      projectMeta = storage.getProjectMetadata(projectPath);
    } catch (error) {
      console.warn(`Failed to get project metadata for ${projectPath}:`, error);
    }
  }

  // ========== Resolve Provider ==========
  let providerId: string | null = null;
  let providerSource: ResolvedConfig['resolutionTrace']['providerSource'] = 'none';

  if (channelProviderId) {
    providerId = channelProviderId;
    providerSource = 'channel';
  } else if (agent?.claudeVersionId) {
    providerId = agent.claudeVersionId;
    providerSource = 'agent';
  } else if (projectMeta?.defaultProviderId) {
    providerId = projectMeta.defaultProviderId;
    providerSource = 'project';
  } else {
    providerId = await getDefaultVersionId();
    providerSource = providerId ? 'system' : 'none';
  }

  // Get provider details
  let provider: ClaudeVersion | null = null;
  if (providerId) {
    try {
      provider = await getVersionByIdInternal(providerId);
    } catch (error) {
      console.warn(`Failed to get provider ${providerId}:`, error);
    }
  }

  // ========== Resolve Model ==========
  let model: string;
  let modelSource: ResolvedConfig['resolutionTrace']['modelSource'];

  if (channelModel) {
    model = channelModel;
    modelSource = 'channel';
  } else if (projectMeta?.defaultModel) {
    model = projectMeta.defaultModel;
    modelSource = 'project';
  } else if (provider?.models && provider.models.length > 0) {
    // Use provider's first model as default
    model = provider.models[0].id;
    modelSource = 'provider';
  } else {
    model = 'sonnet';
    modelSource = 'fallback';
  }

  // Log resolution for debugging
  console.log(
    `🔧 Config resolved: provider=${providerId || 'none'} (${providerSource}), model=${model} (${modelSource})`
  );

  return {
    providerId,
    model,
    provider,
    resolutionTrace: {
      providerSource,
      modelSource,
    },
  };
}

/**
 * Update project's default provider and model
 */
export function updateProjectDefaults(
  projectPath: string,
  updates: {
    defaultProviderId?: string;
    defaultModel?: string;
  }
): void {
  const storage = getProjectMetadataStorage();
  const metadata = storage.getProjectMetadata(projectPath);
  
  if (!metadata) {
    console.warn(`Project not found: ${projectPath}`);
    return;
  }

  if (updates.defaultProviderId !== undefined) {
    metadata.defaultProviderId = updates.defaultProviderId || undefined;
  }
  
  if (updates.defaultModel !== undefined) {
    metadata.defaultModel = updates.defaultModel || undefined;
  }

  metadata.lastAccessed = new Date().toISOString();
  storage.saveProjectMetadata(projectPath, metadata);
}
