// Project metadata types for the new project management system

export interface ProjectAgentConfig {
  enabled: boolean;
  lastUsed: string;
  sessionCount: number;
  customConfig: Record<string, any>;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  path: string;
  createdAt: string;
  lastAccessed: string;
  
  // Agent associations
  agents: Record<string, ProjectAgentConfig>;
  defaultAgent: string;
  
  // Simplified metadata
  tags: string[];
  metadata: Record<string, any>; // User-defined custom attributes
}

export interface ProjectWithAgentInfo {
  id: string;
  name: string;
  dirName: string;        // Directory name under ~/.claude/projects
  path: string;
  realPath?: string;      // Real project path from session files
  description?: string;
  createdAt: string;
  lastAccessed: string;
  
  // Agent information
  agents: string[];       // List of enabled agent IDs
  defaultAgent: string;
  defaultAgentName: string;
  defaultAgentIcon: string;
  defaultAgentColor: string;
  
  // Metadata
  tags: string[];
  metadata: Record<string, any>;
}