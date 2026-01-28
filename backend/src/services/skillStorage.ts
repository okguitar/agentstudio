import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import type { 
  SkillConfig, 
  SkillManifest, 
  SkillDirectoryInfo,
  SkillValidationOptions,
  SkillStorageOptions
} from '../types/skills';
import { getSkillsDir, getSdkDirName } from '../config/sdkConfig.js';

export class SkillStorage {
  private userSkillsDir: string;
  private projectSkillsDir: string;
  private options: SkillStorageOptions;

  constructor(
    userSkillsDir: string = getSkillsDir(),
    projectSkillsDir: string = path.join(process.cwd(), getSdkDirName(), 'skills'),
    options: SkillStorageOptions = {}
  ) {
    this.userSkillsDir = userSkillsDir;
    this.projectSkillsDir = projectSkillsDir;
    this.options = {
      validateManifest: true,
      autoBackup: false,
      ...options
    };
  }

  // Initialize directories
  async initialize(): Promise<void> {
    await this.ensureDirectory(this.userSkillsDir);
    await this.ensureDirectory(this.projectSkillsDir);
  }

  // Get all skills
  async getAllSkills(includeDisabled = false): Promise<SkillConfig[]> {
    const userSkills = await this.getUserSkills(includeDisabled);
    const projectSkills = await this.getProjectSkills(includeDisabled);
    
    return [...userSkills, ...projectSkills];
  }

  // Get user skills
  async getUserSkills(includeDisabled = false): Promise<SkillConfig[]> {
    return this.getSkillsFromDirectory(this.userSkillsDir, 'user', includeDisabled);
  }

  // Get project skills
  async getProjectSkills(includeDisabled = false): Promise<SkillConfig[]> {
    return this.getSkillsFromDirectory(this.projectSkillsDir, 'project', includeDisabled);
  }

  // Get specific skill
  async getSkill(skillId: string, scope?: 'user' | 'project'): Promise<SkillConfig | null> {
    // Try both directories if scope is not specified
    const directories = scope 
      ? [{ dir: scope === 'user' ? this.userSkillsDir : this.projectSkillsDir, scope }]
      : [
          { dir: this.userSkillsDir, scope: 'user' as const },
          { dir: this.projectSkillsDir, scope: 'project' as const }
        ];

    for (const { dir, scope: dirScope } of directories) {
      const skillPath = path.join(dir, skillId);
      try {
        await fs.access(skillPath);
        return await this.loadSkillFromDirectory(skillPath, dirScope);
      } catch (error) {
        // Continue to next directory
      }
    }

    return null;
  }

  // Create skill
  async createSkill(
    skillData: {
      name: string;
      description: string;
      scope: 'user' | 'project';
      allowedTools?: string[];
      content: string;
      additionalFiles?: Array<{
        name: string;
        path: string;
        type: 'markdown' | 'text' | 'script' | 'template' | 'other';
        content: string;
      }>;
    }
  ): Promise<{ success: boolean; skillId: string; errors?: string[] }> {
    try {
      const skillId = this.generateSkillId(skillData.name);
      const baseDir = skillData.scope === 'user' ? this.userSkillsDir : this.projectSkillsDir;
      const skillDir = path.join(baseDir, skillId);

      // Check if skill already exists
      try {
        await fs.access(skillDir);
        return { success: false, skillId: '', errors: ['Skill already exists'] };
      } catch {
        // Directory doesn't exist, continue
      }

      // Create skill directory
      await this.ensureDirectory(skillDir);

      // Create SKILL.md file
      const skillManifestPath = path.join(skillDir, 'SKILL.md');
      const skillContent = this.createSkillManifestContent(
        skillData.name,
        skillData.description,
        skillData.allowedTools
      );
      
      await fs.writeFile(skillManifestPath, skillContent, 'utf8');

      // Create additional files if provided
      if (skillData.additionalFiles) {
        for (const file of skillData.additionalFiles) {
          const filePath = path.join(skillDir, file.path);
          await this.ensureDirectory(path.dirname(filePath));
          await fs.writeFile(filePath, file.content, 'utf8');
        }
      }

      return { success: true, skillId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, skillId: '', errors: [errorMessage] };
    }
  }

  // Update skill
  async updateSkill(
    skillId: string,
    scope: 'user' | 'project',
    updates: {
      name?: string;
      description?: string;
      allowedTools?: string[];
      content?: string;
      additionalFiles?: Array<{
        name: string;
        path: string;
        type: 'markdown' | 'text' | 'script' | 'template' | 'other';
        content: string;
      }>;
    }
  ): Promise<{ success: boolean; updatedFiles: string[]; errors?: string[] }> {
    try {
      const skill = await this.getSkill(skillId, scope);
      if (!skill) {
        return { success: false, updatedFiles: [], errors: ['Skill not found'] };
      }

      const baseDir = scope === 'user' ? this.userSkillsDir : this.projectSkillsDir;
      const skillDir = path.join(baseDir, skillId);
      const updatedFiles: string[] = [];

      // Update SKILL.md if any metadata fields are provided
      if (updates.content || updates.name || updates.description || updates.allowedTools) {
        const skillManifestPath = path.join(skillDir, 'SKILL.md');
        
        // Read existing manifest to get current values
        const existingContent = await fs.readFile(skillManifestPath, 'utf8');
        const existingManifest = await this.parseSkillManifest(existingContent);
        
        // If content is provided, parse it to get new values
        let manifestValues = existingManifest;
        if (updates.content) {
          manifestValues = await this.parseSkillManifest(updates.content);
        }
        
        // Create updated content with merged values
        const updatedContent = this.createSkillManifestContent(
          updates.name ?? manifestValues.name,
          updates.description ?? manifestValues.description,
          updates.allowedTools ?? manifestValues.allowedTools
        );
        
        await fs.writeFile(skillManifestPath, updatedContent, 'utf8');
        updatedFiles.push('SKILL.md');
      }

      // Update/add additional files
      if (updates.additionalFiles) {
        for (const file of updates.additionalFiles) {
          const filePath = path.join(skillDir, file.path);
          await this.ensureDirectory(path.dirname(filePath));
          await fs.writeFile(filePath, file.content, 'utf8');
          updatedFiles.push(file.path);
        }
      }

      return { success: true, updatedFiles };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, updatedFiles: [], errors: [errorMessage] };
    }
  }

  // Delete skill
  async deleteSkill(skillId: string, scope?: 'user' | 'project'): Promise<boolean> {
    const skill = await this.getSkill(skillId, scope);
    if (!skill) {
      return false;
    }

    const baseDir = skill.scope === 'user' ? this.userSkillsDir : this.projectSkillsDir;
    const skillDir = path.join(baseDir, skillId);

    try {
      await fs.rm(skillDir, { recursive: true, force: true });
      return true;
    } catch (error) {
      console.error('Failed to delete skill directory:', error);
      return false;
    }
  }

  // Get skill directory info
  async getSkillDirectoryInfo(skillId: string): Promise<SkillDirectoryInfo | null> {
    const skill = await this.getSkill(skillId);
    if (!skill) {
      return null;
    }

    const baseDir = skill.scope === 'user' ? this.userSkillsDir : this.projectSkillsDir;
    const skillDir = path.join(baseDir, skillId);

    try {
      const files = await this.getDirectoryFiles(skillDir);
      const stats = await fs.stat(skillDir);
      
      return {
        skillId,
        path: skillDir,
        files,
        totalSize: files.reduce((sum, file) => sum + (file.type === 'file' ? file.size : 0), 0),
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      console.error('Failed to get skill directory info:', error);
      return null;
    }
  }

  // Validate skill manifest
  async validateSkillManifest(content: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const manifest = await this.parseSkillManifest(content);
      
      // Validate name and description
      if (!manifest.name || manifest.name.trim() === '') {
        return { valid: false, errors: ['Name is required'] };
      }

      if (!manifest.description || manifest.description.trim() === '') {
        return { valid: false, errors: ['Description is required'] };
      }

      // Validate name format
      if (!/^[a-z0-9-_]+$/.test(manifest.name)) {
        return { valid: false, errors: ['Name must contain only lowercase letters, numbers, hyphens, and underscores'] };
      }

      if (manifest.name.length > 64) {
        return { valid: false, errors: ['Name must be 64 characters or less'] };
      }

      if (manifest.description.length > 1024) {
        return { valid: false, errors: ['Description must be 1024 characters or less'] };
      }

      return { valid: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { valid: false, errors: [errorMessage] };
    }
  }

  // Private helper methods
  private async getSkillsFromDirectory(
    directory: string,
    scope: 'user' | 'project',
    includeDisabled: boolean
  ): Promise<SkillConfig[]> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const skillDirs = entries
        .filter(entry => {
          // Accept both regular directories and symbolic links (which may point to directories)
          return entry.isDirectory() || entry.isSymbolicLink();
        })
        .map(entry => entry.name);

      const skills = await Promise.all(
        skillDirs.map(skillDir => 
          this.loadSkillFromDirectory(path.join(directory, skillDir), scope)
        )
      );

      return skills.filter(skill => includeDisabled || skill.enabled);
    } catch (error) {
      console.warn(`Failed to load skills from ${directory}:`, error);
      return [];
    }
  }

  private async loadSkillFromDirectory(
    skillDir: string,
    scope: 'user' | 'project'
  ): Promise<SkillConfig> {
    const skillId = path.basename(skillDir);
    const skillManifestPath = path.join(skillDir, 'SKILL.md');
    
    // Check if the skill directory is a symlink (indicating it's from a plugin)
    let isSymlink = false;
    let realPath = skillDir;
    try {
      const stats = await fs.lstat(skillDir);
      isSymlink = stats.isSymbolicLink();
      
      // If it's a symlink, resolve to the real path
      if (isSymlink) {
        realPath = await fs.readlink(skillDir);
        // If the symlink is relative, resolve it relative to the parent directory
        if (!path.isAbsolute(realPath)) {
          realPath = path.resolve(path.dirname(skillDir), realPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to check if ${skillDir} is symlink:`, error);
    }
    
    try {
      const manifestContent = await fs.readFile(skillManifestPath, 'utf8');
      const manifest = await this.parseSkillManifest(manifestContent);
      
      // Get all files in skill directory
      const files = await this.getDirectoryFiles(skillDir);
      
      const skillConfig: SkillConfig = {
        id: skillId,
        name: manifest.name,
        description: manifest.description,
        version: '1.0.0',
        files: files.map(file => ({
          path: file.path.replace(skillDir + '/', ''),
          name: path.basename(file.path),
          type: this.getFileType(file.path),
          required: file.path.endsWith('SKILL.md')
        })),
        allowedTools: manifest.allowedTools,
        scope,
        source: isSymlink ? 'plugin' : 'local',
        installPath: realPath, // Real path for plugin skills, regular path for local skills
        enabled: true,
        createdAt: '2024-01-01T00:00:00.000Z', // Would need to get from file stats
        updatedAt: new Date().toISOString(),
        tags: []
      };

      return skillConfig;
    } catch (error) {
      console.error(`Failed to load skill from ${skillDir}:`, error);
      
      // Return a basic skill config with error state
      return {
        id: skillId,
        name: skillId,
        description: `Failed to load skill: ${error instanceof Error ? error.message : 'Unknown error'}`,
        version: '1.0.0',
        files: [],
        scope,
        source: isSymlink ? 'plugin' : 'local',
        installPath: realPath,
        enabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      };
    }
  }

  private async parseSkillManifest(content: string): Promise<SkillManifest> {
    const lines = content.split('\n');
    const frontmatterEnd = lines.findIndex((line, index) => 
      index > 0 && line.trim() === '---'
    );

    if (frontmatterEnd === -1) {
      throw new Error('Invalid skill manifest: missing frontmatter');
    }

    const frontmatterLines = lines.slice(1, frontmatterEnd).join('\n');
    const manifestContent = lines.slice(frontmatterEnd + 1).join('\n');

    try {
      const yaml = require('js-yaml');
      const frontmatter = yaml.load(frontmatterLines) as any;

      return {
        name: frontmatter.name || '',
        description: frontmatter.description || '',
        allowedTools: frontmatter['allowed-tools'] || frontmatter.allowedTools
      };
    } catch (error) {
      throw new Error('Invalid skill manifest: failed to parse YAML');
    }
  }

  private createSkillManifestContent(
    name: string,
    description: string,
    allowedTools?: string[]
  ): string {
    const allowedToolsYaml = allowedTools && allowedTools.length > 0 
      ? `\nallowed-tools: [${allowedTools.map(tool => `"${tool}"`).join(', ')}]`
      : '';

    return `---
name: ${name}
description: ${description}${allowedToolsYaml}
---

# ${name}

## Description
${description}

## Instructions
Add your skill instructions here.

## Examples
Provide examples of how to use this skill.
`;
  }

  private async getDirectoryFiles(dirPath: string): Promise<Array<{
    path: string;
    size: number;
    lastModified: string;
    type: 'file' | 'directory';
  }>> {
    const results: Array<{
      path: string;
      size: number;
      lastModified: string;
      type: 'file' | 'directory';
    }> = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);
        
        results.push({
          path: fullPath,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          type: entry.isDirectory() ? 'directory' : 'file'
        });
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dirPath}:`, error);
    }

    return results;
  }

  private getFileType(filePath: string): 'markdown' | 'text' | 'script' | 'template' | 'other' {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.md':
      case '.markdown':
        return 'markdown';
      case '.js':
      case '.ts':
      case '.py':
      case '.sh':
      case '.bash':
        return 'script';
      case '.txt':
        return 'text';
      case '.template':
      case '.tmpl':
        return 'template';
      default:
        return 'other';
    }
  }

  private generateSkillId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 64);
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
      const fsError = error as any;
      if (fsError.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}