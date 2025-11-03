import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectMetadata, ProjectWithAgentInfo } from '../types/projects';
import { AgentStorage } from './agentStorage';

export class ProjectMetadataStorage {
  private projectsMetaDir: string;  // ~/.claude-agent/projects/
  private projectsDir: string;      // ~/.claude/projects/
  private agentStorage: AgentStorage;

  constructor() {
    const baseDir = path.join(os.homedir(), '.claude-agent');
    this.projectsMetaDir = path.join(baseDir, 'projects');
    this.projectsDir = path.join(os.homedir(), '.claude', 'projects');
    this.agentStorage = new AgentStorage();
    
    // Ensure directories exist
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    if (!fs.existsSync(this.projectsMetaDir)) {
      fs.mkdirSync(this.projectsMetaDir, { recursive: true });
    }
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
  }

  /**
   * Scan ~/.claude/projects directory to discover all project directories
   */
  private scanProjectDirectories(): string[] {
    try {
      const items = fs.readdirSync(this.projectsDir, { withFileTypes: true });
      return items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .sort();
    } catch (error) {
      console.error('Failed to scan projects directory:', error);
      return [];
    }
  }

  /**
   * Get all projects by scanning directories and enriching with metadata
   */
  getAllProjects(): ProjectWithAgentInfo[] {
    const projectDirs = this.scanProjectDirectories();
    const projects: ProjectWithAgentInfo[] = [];

    for (const dirName of projectDirs) {
      try {
        const metadata = this.getProjectMetadata(dirName);
        const enriched = this.enrichProjectWithAgentInfo(dirName, metadata);
        projects.push(enriched);
      } catch (error) {
        console.error(`Failed to process project ${dirName}:`, error);
      }
    }

    return projects.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
  }

  /**
   * Get project metadata for a specific project directory
   */
  getProjectMetadata(dirName: string): ProjectMetadata {
    const metaFilePath = path.join(this.projectsMetaDir, `${dirName}.json`);
    
    try {
      if (fs.existsSync(metaFilePath)) {
        const content = fs.readFileSync(metaFilePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`Failed to read metadata for project ${dirName}:`, error);
    }

    // Create default metadata if file doesn't exist
    return this.createDefaultProjectMetadata(dirName);
  }

  /**
   * Create default metadata for a project
   */
  private createDefaultProjectMetadata(dirName: string): ProjectMetadata {
    const projectPath = path.join(this.projectsDir, dirName);
    const now = new Date().toISOString();
    
    const metadata: ProjectMetadata = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: dirName, // Temporarily use dirName, will be updated below
      description: '',
      path: projectPath,
      createdAt: now,
      lastAccessed: now,
      agents: {},
      defaultAgent: '',
      tags: [],
      metadata: {}
    };

    // Extract clean project name from directory name and metadata
    const cleanProjectName = this.extractCleanProjectName(dirName, metadata);
    metadata.name = cleanProjectName;

    // Save the default metadata
    this.saveProjectMetadata(dirName, metadata);
    return metadata;
  }

  /**
   * Save project metadata
   */
  saveProjectMetadata(dirName: string, metadata: ProjectMetadata): void {
    try {
      const metaFilePath = path.join(this.projectsMetaDir, `${dirName}.json`);
      fs.writeFileSync(metaFilePath, JSON.stringify(metadata, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save metadata for project ${dirName}:`, error);
      throw error;
    }
  }

  /**
   * Get Claude project directory last modified time from filesystem
   */
  private getProjectLastModified(dirName: string, metadata: ProjectMetadata): string {
    try {
      // Use the Claude project directory path: ~/.claude/projects/{dirName}
      const claudeProjectPath = path.join(this.projectsDir, dirName);
      
      // Get the directory stats
      const stats = fs.statSync(claudeProjectPath);
      return stats.mtime.toISOString();
    } catch (error) {
      console.warn(`Failed to get filesystem time for Claude project ${dirName}:`, error);
      // Fallback to metadata lastAccessed if filesystem time is unavailable
      return metadata.lastAccessed;
    }
  }

  /**
   * Enrich project metadata with agent information
   */
  private enrichProjectWithAgentInfo(dirName: string, metadata: ProjectMetadata): ProjectWithAgentInfo {
    const enabledAgents = Object.keys(metadata.agents).filter(
      agentId => metadata.agents[agentId].enabled
    );

    // Get default agent info
    let defaultAgent = metadata.defaultAgent;
    let defaultAgentName = '';
    let defaultAgentIcon = '';

    if (defaultAgent && metadata.agents[defaultAgent]?.enabled) {
      const agent = this.agentStorage.getAgent(defaultAgent);
      if (agent) {
        defaultAgentName = agent.name;
        defaultAgentIcon = agent.ui.icon;
      }
    } else if (enabledAgents.length > 0) {
      // Use the most recently used agent as default
      defaultAgent = enabledAgents.reduce((latest, agentId) => {
        const latestTime = metadata.agents[latest]?.lastUsed || '';
        const currentTime = metadata.agents[agentId]?.lastUsed || '';
        return currentTime > latestTime ? agentId : latest;
      }, enabledAgents[0]);

      const agent = this.agentStorage.getAgent(defaultAgent);
      if (agent) {
        defaultAgentName = agent.name;
        defaultAgentIcon = agent.ui.icon;

        // Update metadata with new default
        metadata.defaultAgent = defaultAgent;
        this.saveProjectMetadata(dirName, metadata);
      }
    }

    // Extract real project path from session files
    const realProject = this.extractRealProjectPath(dirName);
    
    // Get actual last modified time from filesystem
    const lastAccessed = this.getProjectLastModified(dirName, metadata);

    return {
      id: metadata.id,
      name: metadata.name,
      dirName,
      path: realProject?.realPath || metadata.path, // Use real path when available
      realPath: realProject?.realPath,
      description: metadata.description,
      createdAt: metadata.createdAt,
      lastAccessed: lastAccessed, // Use filesystem time instead of metadata
      agents: enabledAgents,
      defaultAgent,
      defaultAgentName,
      defaultAgentIcon,
      tags: metadata.tags,
      metadata: metadata.metadata
    };
  }

  /**
   * Add an agent to a project
   */
  addAgentToProject(dirName: string, agentId: string): void {
    const metadata = this.getProjectMetadata(dirName);
    const now = new Date().toISOString();

    if (!metadata.agents[agentId]) {
      metadata.agents[agentId] = {
        enabled: true,
        lastUsed: now,
        sessionCount: 0,
        customConfig: {}
      };
    } else {
      metadata.agents[agentId].enabled = true;
      metadata.agents[agentId].lastUsed = now;
    }

    // Set as default if no default agent exists
    if (!metadata.defaultAgent) {
      metadata.defaultAgent = agentId;
    }

    metadata.lastAccessed = now;
    this.saveProjectMetadata(dirName, metadata);
  }

  /**
   * Remove an agent from a project
   */
  removeAgentFromProject(dirName: string, agentId: string): void {
    const metadata = this.getProjectMetadata(dirName);
    
    if (metadata.agents[agentId]) {
      metadata.agents[agentId].enabled = false;
      
      // If this was the default agent, find a new default
      if (metadata.defaultAgent === agentId) {
        const enabledAgents = Object.keys(metadata.agents).filter(
          id => id !== agentId && metadata.agents[id].enabled
        );
        metadata.defaultAgent = enabledAgents.length > 0 ? enabledAgents[0] : '';
      }
      
      metadata.lastAccessed = new Date().toISOString();
      this.saveProjectMetadata(dirName, metadata);
    }
  }

  /**
   * Set default agent for a project
   */
  setDefaultAgent(dirName: string, agentId: string): void {
    const metadata = this.getProjectMetadata(dirName);
    
    // Ensure the agent is enabled for this project
    if (!metadata.agents[agentId]) {
      this.addAgentToProject(dirName, agentId);
      return;
    }
    
    if (metadata.agents[agentId].enabled) {
      metadata.defaultAgent = agentId;
      metadata.lastAccessed = new Date().toISOString();
      this.saveProjectMetadata(dirName, metadata);
    }
  }

  /**
   * Update project tags
   */
  updateProjectTags(dirName: string, tags: string[]): void {
    const metadata = this.getProjectMetadata(dirName);
    metadata.tags = tags;
    metadata.lastAccessed = new Date().toISOString();
    this.saveProjectMetadata(dirName, metadata);
  }

  /**
   * Update project custom metadata
   */
  updateProjectMetadata(dirName: string, customMetadata: Record<string, any>): void {
    const metadata = this.getProjectMetadata(dirName);
    metadata.metadata = { ...metadata.metadata, ...customMetadata };
    metadata.lastAccessed = new Date().toISOString();
    this.saveProjectMetadata(dirName, metadata);
  }

  /**
   * Update project basic info
   */
  updateProjectInfo(dirName: string, updates: { name?: string; description?: string }): void {
    const metadata = this.getProjectMetadata(dirName);
    
    if (updates.name !== undefined) {
      metadata.name = updates.name;
    }
    if (updates.description !== undefined) {
      metadata.description = updates.description;
    }
    
    metadata.lastAccessed = new Date().toISOString();
    this.saveProjectMetadata(dirName, metadata);
  }

  /**
   * Record agent usage for a project
   */
  recordAgentUsage(dirName: string, agentId: string): void {
    const metadata = this.getProjectMetadata(dirName);
    const now = new Date().toISOString();

    if (!metadata.agents[agentId]) {
      metadata.agents[agentId] = {
        enabled: true,
        lastUsed: now,
        sessionCount: 1,
        customConfig: {}
      };
    } else {
      metadata.agents[agentId].lastUsed = now;
      metadata.agents[agentId].sessionCount += 1;
      metadata.agents[agentId].enabled = true;
    }

    // Update default agent to the most recently used
    metadata.defaultAgent = agentId;
    metadata.lastAccessed = now;
    
    this.saveProjectMetadata(dirName, metadata);
  }

  /**
   * Create a new project directory and metadata
   */
  createProject(dirName: string, initialData: {
    name?: string;
    description?: string;
    agentId?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): ProjectMetadata {
    const projectPath = path.join(this.projectsDir, dirName);
    
    // Create project directory
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const now = new Date().toISOString();
    const metadata: ProjectMetadata = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: initialData.name || dirName,
      description: initialData.description || '',
      path: projectPath,
      createdAt: now,
      lastAccessed: now,
      agents: {},
      defaultAgent: '',
      tags: initialData.tags || [],
      metadata: initialData.metadata || {}
    };

    // Add initial agent if specified
    if (initialData.agentId) {
      metadata.agents[initialData.agentId] = {
        enabled: true,
        lastUsed: now,
        sessionCount: 0,
        customConfig: {}
      };
      metadata.defaultAgent = initialData.agentId;
    }

    this.saveProjectMetadata(dirName, metadata);
    return metadata;
  }

  /**
   * Delete a project (remove metadata, but keep directory)
   */
  deleteProject(dirName: string): boolean {
    try {
      const metaFilePath = path.join(this.projectsMetaDir, `${dirName}.json`);
      if (fs.existsSync(metaFilePath)) {
        fs.unlinkSync(metaFilePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete project metadata for ${dirName}:`, error);
      return false;
    }
  }

  /**
   * Get project by directory name
   */
  getProject(dirName: string): ProjectWithAgentInfo | null {
    try {
      const metadata = this.getProjectMetadata(dirName);
      return this.enrichProjectWithAgentInfo(dirName, metadata);
    } catch (error) {
      console.error(`Failed to get project ${dirName}:`, error);
      return null;
    }
  }

  /**
   * Extract real project path from jsonl session files
   */
  private extractRealProjectPath(dirName: string): { realPath: string; projectName: string } | null {
    const projectDir = path.join(this.projectsDir, dirName);
    
    try {
      // Find all jsonl files in the project directory
      const files = fs.readdirSync(projectDir).filter(file => file.endsWith('.jsonl'));
      
      for (const file of files) {
        try {
          const filePath = path.join(projectDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const firstLine = content.split('\n')[0];
          
          if (firstLine) {
            const message = JSON.parse(firstLine);
            if (message.cwd) {
              return {
                realPath: message.cwd,
                projectName: path.basename(message.cwd)
              };
            }
          }
        } catch {
          // Skip this file and try the next one
          continue;
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
    
    return null;
  }

  /**
   * Extract clean project name from directory name and metadata
   */
  private extractCleanProjectName(dirName: string, metadata?: ProjectMetadata): string {
    // Try to extract from jsonl session files first
    const realProject = this.extractRealProjectPath(dirName);
    if (realProject) {
      return realProject.projectName;
    }
    
    // If metadata has migratedFrom, use the original path to extract the real directory name
    if (metadata?.metadata?.migratedFrom) {
      const originalPath = metadata.metadata.migratedFrom as string;
      return path.basename(originalPath);
    }
    
    // Otherwise, try to extract from the dirName (which is the actual directory name in ~/.claude/projects)
    // The dirName is already the real directory name, so we can try to extract meaningful parts
    if (dirName.includes('-')) {
      // This might be an encoded path, try to extract the last meaningful segment
      const segments = dirName.split('-').filter(segment => segment.length > 0);
      if (segments.length > 0) {
        return segments[segments.length - 1];
      }
    }
    
    // Fallback to original directory name
    return dirName;
  }
}