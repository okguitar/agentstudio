// ============================================
// Core Skill Types
// ============================================

// Agent Skills configuration
export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  version?: string;
  
  // Skill metadata
  author?: string;
  homepage?: string;
  tags: string[];
  
  // Content files
  files: SkillFile[];
  
  // Tool permissions
  allowedTools?: string[];
  
  // Scope and visibility
  scope: 'user' | 'project';
  projectId?: string; // Only for project skills
  
  // Source: 'local' for user-created skills, 'plugin' for plugin-installed skills
  source: 'local' | 'plugin';
  
  // Installation path (real path for symlinked plugin skills)
  installPath?: string;
  
  // Status and metadata
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillFile {
  path: string; // Relative path within skill directory
  name: string; // Display name
  type: 'markdown' | 'text' | 'script' | 'template' | 'other';
  content?: string; // Optional inline content for small files
  required: boolean; // Whether this file is required for the skill to work
}

export interface SkillManifest {
  name: string;
  description: string;
  allowedTools?: string[];
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateSkillRequest {
  name: string;
  description: string;
  scope: 'user' | 'project';
  projectId?: string;
  allowedTools?: string[];
  content: string; // SKILL.md content
  additionalFiles?: Array<{
    name: string;
    path: string;
    type: 'markdown' | 'text' | 'script' | 'template' | 'other';
    content: string;
  }>;
}

export interface UpdateSkillRequest {
  name?: string;
  description?: string;
  allowedTools?: string[];
  content?: string; // SKILL.md content
  additionalFiles?: Array<{
    name: string;
    path: string;
    type: 'markdown' | 'text' | 'script' | 'template' | 'other';
    content: string;
  }>;
}

export interface SkillValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    line?: number;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================
// File System Types
// ============================================

export interface SkillFileInfo {
  path: string;
  size: number;
  lastModified: string;
  type: 'file' | 'directory';
}

export interface SkillDirectoryInfo {
  skillId: string;
  path: string;
  files: SkillFileInfo[];
  totalSize: number;
  lastModified: string;
}

// ============================================
// Backend Storage Types
// ============================================

export interface SkillStorageOptions {
  validateManifest?: boolean;
  autoBackup?: boolean;
}

export interface SkillValidationOptions {
  strictMode?: boolean;
  checkFileExists?: boolean;
  validateSyntax?: boolean;
}