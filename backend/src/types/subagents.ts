// Subagent type definitions (backend only)
export interface Subagent {
  id: string;
  name: string;
  description: string;
  content: string; // System prompt content
  scope: 'user' | 'project'; // Support both user-level and project-level subagents
  tools?: string[]; // Array of allowed tools
  createdAt: Date;
  updatedAt: Date;
}

export interface SubagentCreate {
  name: string;
  description: string;
  content: string;
  scope: 'user' | 'project';
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