/**
 * Plugin System Frontend Types
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

export interface PluginFile {
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  marketplace: string;
  marketplaceName: string;
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
  installPath: string;
  symlinkCreated: boolean;
}

export interface PluginMarketplace {
  id: string;
  name: string;
  displayName: string;
  type: 'git' | 'github' | 'local';
  source: string;
  description?: string;
  path: string;
  pluginCount: number;
  lastSync?: string;
  owner?: {
    name: string;
    url?: string;
  };
  branch?: string;
}

export interface AvailablePlugin {
  name: string;
  version: string;
  description: string;
  author: PluginAuthor;
  marketplace: string;
  marketplaceName: string;
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

export interface MarketplaceAddRequest {
  name: string;
  type: 'git' | 'github' | 'local';
  source: string;
  description?: string;
  branch?: string;
}

export interface PluginInstallRequest {
  pluginName: string;
  marketplaceName: string;
  marketplaceId: string;
}

export interface PluginDetailResponse {
  plugin: InstalledPlugin;
  components: {
    commands: PluginComponent[];
    agents: PluginComponent[];
    skills: PluginComponent[];
    hooks: PluginComponent[];
    mcpServers: PluginComponent[];
  };
  files: PluginFile[];
  readme?: string;
  manifest: PluginManifest;
}

export interface FileContentResponse {
  content: string;
}

