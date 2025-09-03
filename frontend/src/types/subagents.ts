// Subagent type definitions
export interface Subagent {
  id: string;
  name: string;
  description: string;
  content: string; // System prompt content
  scope: 'user'; // Only support user-level subagents
  tools?: string[]; // Comma-separated list of allowed tools
  createdAt: Date;
  updatedAt: Date;
}

export interface SubagentCreate {
  name: string;
  description: string;
  content: string;
  scope: 'user';
  tools?: string[];
}

export interface SubagentUpdate {
  description?: string;
  content?: string;
  tools?: string[];
}

export interface SubagentFilter {
  search?: string;
}

export const SUBAGENT_SCOPES = [
  { value: 'user', label: '个人Subagent', description: '存储在用户配置中，仅个人使用' }
] as const;

export const COMMON_TOOLS = [
  'read_file',
  'write',
  'search_replace',
  'run_terminal_cmd',
  'grep',
  'glob_file_search',
  'codebase_search',
  'web_search',
  'create_diagram'
] as const;
