// Subagent type definitions (shared between frontend and backend)
export interface Subagent {
  id: string;
  name: string;
  description: string;
  content: string; // System prompt content
  scope: 'user'; // Only support user-level subagents
  tools?: string[]; // Array of allowed tools
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
