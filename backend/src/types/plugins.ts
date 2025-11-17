/**
 * Plugin System Types
 * Based on Claude Code plugin specification
 * Storage: ~/.claude/plugins/marketplaces/
 */

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: PluginAuthor;
  repository?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
}

export interface PluginComponent {
  type: 'command' | 'agent' | 'skill' | 'hook' | 'mcp';
  name: string;
  path: string;
  relativePath: string;
  description?: string;
}

export interface ParsedPlugin {
  manifest: PluginManifest;
  components: {
    commands: PluginComponent[];
    agents: PluginComponent[];
    skills: PluginComponent[];
    hooks: PluginComponent[];
    mcpServers: PluginComponent[];
  };
  files: PluginFile[];
  path: string;
  marketplaceName: string;
  pluginName: string;
}

export interface PluginFile {
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface InstalledPlugin {
  id: string; // format: pluginName@marketplaceName
  name: string;
  version: string;
  marketplace: string; // marketplace display name
  marketplaceName: string; // marketplace directory name
  enabled: boolean;
  installedAt: string;
  updatedAt?: string;
  manifest: PluginManifest;
  components: {
    commands: string[];
    agents: string[];
    skills: string[];
    hooks: string[];
    mcpServers: string[];
  };
  installPath: string; // Full path to plugin directory
  symlinkCreated: boolean; // Whether symlinks are created
}

export interface PluginMarketplace {
  id: string;
  name: string; // Directory name
  displayName: string; // Human readable name
  type: 'git' | 'github' | 'local';
  source: string; // URL for git/github, path for local
  description?: string;
  path: string; // Full path to marketplace directory
  pluginCount: number;
  lastSync?: string;
  owner?: {
    name: string;
    url?: string;
  };
  branch?: string; // For git repositories
}

export interface MarketplaceManifest {
  name: string;
  owner: {
    name: string;
    url?: string;
  };
  description?: string;
  plugins: MarketplacePlugin[];
}

export interface MarketplacePlugin {
  name: string;
  source: string;
  description?: string;
  version?: string;
}

export interface AvailablePlugin {
  name: string;
  version: string;
  description: string;
  author: PluginAuthor;
  marketplace: string; // marketplace display name
  marketplaceName: string; // marketplace directory name
  marketplaceId: string;
  source: string;
  installed: boolean;
  installedVersion?: string;
  enabled?: boolean;
  components: {
    commands: number;
    agents: number;
    skills: number;
    hooks: number;
    mcpServers: number;
  };
  readme?: string;
}

export interface PluginInstallRequest {
  pluginName: string;
  marketplaceId: string;
  marketplaceName: string;
}

export interface PluginInstallResult {
  success: boolean;
  plugin?: InstalledPlugin;
  error?: string;
  message?: string;
}

export interface MarketplaceAddRequest {
  name: string;
  type: 'git' | 'github' | 'local';
  source: string;
  description?: string;
  branch?: string;
}

export interface MarketplaceSyncResult {
  success: boolean;
  pluginCount?: number;
  error?: string;
  syncedAt: string;
}
