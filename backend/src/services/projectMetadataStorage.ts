import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectMetadata, ProjectWithAgentInfo } from '../types/projects';
import { AgentStorage } from './agentStorage';
import { CLAUDE_AGENT_DIR, PROJECTS_METADATA_FILE } from '../config/paths.js';

interface ProjectMetadataStore {
  [projectPath: string]: ProjectMetadata;
}

export class ProjectMetadataStorage {
  private metadataFilePath: string;  // ~/.claude-agent/projects.json
  private projectsDir: string;       // ~/.claude/projects/
  private claudeConfigPath: string;  // ~/.claude.json
  private agentStorage: AgentStorage;
  private metadataCache: ProjectMetadataStore | null = null;

  constructor() {
    this.metadataFilePath = PROJECTS_METADATA_FILE;
    this.projectsDir = path.join(os.homedir(), '.claude', 'projects');
    this.claudeConfigPath = path.join(os.homedir(), '.claude.json');
    this.agentStorage = new AgentStorage();

    // Ensure directories exist
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    if (!fs.existsSync(CLAUDE_AGENT_DIR)) {
      fs.mkdirSync(CLAUDE_AGENT_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
  }

  /**
   * Load all metadata from the single JSON file
   */
  private loadMetadata(): ProjectMetadataStore {
    if (this.metadataCache) {
      return this.metadataCache;
    }

    try {
      if (fs.existsSync(this.metadataFilePath)) {
        const content = fs.readFileSync(this.metadataFilePath, 'utf-8');
        this.metadataCache = JSON.parse(content);
        return this.metadataCache!;
      }
    } catch (error) {
      console.error('Failed to load project metadata:', error);
    }

    // If file doesn't exist, try to migrate from old format
    console.log('📦 Migrating project metadata from old format...');
    this.metadataCache = this.migrateFromOldFormat();

    // Save the migrated data
    if (Object.keys(this.metadataCache).length > 0) {
      this.saveMetadata(this.metadataCache);
      console.log(`✅ Migrated ${Object.keys(this.metadataCache).length} projects`);
    } else {
      this.metadataCache = {};
    }

    return this.metadataCache;
  }

  /**
   * Migrate from old format (~/.claude-agent/projects/*.json) to new format
   */
  private migrateFromOldFormat(): ProjectMetadataStore {
    const oldProjectsDir = path.join(path.dirname(this.metadataFilePath), 'projects');
    const store: ProjectMetadataStore = {};

    if (!fs.existsSync(oldProjectsDir)) {
      return store;
    }

    try {
      const files = fs.readdirSync(oldProjectsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(oldProjectsDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const metadata: ProjectMetadata = JSON.parse(content);

          // The old metadata.path points to ~/.claude/projects/{encoded-name}
          // We need to extract the real project path from session files
          const realPath = this.extractRealProjectPath(metadata.path);

          if (realPath) {
            // Update metadata with real path
            metadata.path = realPath;
            store[realPath] = metadata;
            console.log(`  ✓ Migrated: ${metadata.name} (${realPath})`);
          } else {
            console.warn(`  ⚠ Could not find real path for ${metadata.name}`);
          }
        } catch (error) {
          console.warn(`  ⚠ Failed to migrate ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to read old projects directory:', error);
    }

    return store;
  }

  /**
   * Extract real project path from session files in ~/.claude/projects/
   */
  private extractRealProjectPath(claudeProjectDir: string): string | null {
    try {
      if (!fs.existsSync(claudeProjectDir)) {
        return null;
      }

      // Find all jsonl files in the project directory
      const files = fs.readdirSync(claudeProjectDir).filter(file => file.endsWith('.jsonl'));

      for (const file of files) {
        try {
          const filePath = path.join(claudeProjectDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const firstLine = content.split('\n')[0];

          if (firstLine) {
            const message = JSON.parse(firstLine);
            if (message.cwd) {
              return message.cwd;
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
   * Save all metadata to the single JSON file
   */
  private saveMetadata(metadata: ProjectMetadataStore): void {
    try {
      fs.writeFileSync(this.metadataFilePath, JSON.stringify(metadata, null, 2), 'utf-8');
      this.metadataCache = metadata;
    } catch (error) {
      console.error('Failed to save project metadata:', error);
      throw error;
    }
  }

  /**
   * Read all project paths from ~/.claude.json
   */
  private getClaudeProjects(): string[] {
    try {
      if (fs.existsSync(this.claudeConfigPath)) {
        const content = fs.readFileSync(this.claudeConfigPath, 'utf-8');
        const config = JSON.parse(content);

        if (config.projects && typeof config.projects === 'object') {
          return Object.keys(config.projects);
        }
      }
    } catch (error) {
      console.error('Failed to read Claude config:', error);
    }

    return [];
  }

  /**
   * Get or create metadata for a project path
   * Always resolves symlinks to use the real path for storage
   */
  private getOrCreateMetadataForPath(projectPath: string): ProjectMetadata {
    // Resolve symlinks to get the real path
    const realPath = this.resolveRealPath(projectPath);
    if (realPath !== projectPath) {
      console.log(`🔗 [getOrCreateMetadataForPath] Resolved symlink: ${projectPath} -> ${realPath}`);
    }
    
    const allMetadata = this.loadMetadata();

    // Check if metadata exists for the real path
    if (allMetadata[realPath]) {
      const existing = allMetadata[realPath];
      let shouldUpdate = false;

      // Always get fresh timestamps to compare with stored ones
      const timestamps = this.getProjectTimestamps(realPath);

      // Check if we need to refresh timestamps
      const refreshConditions = [
        // Condition 1: Migration artifacts (same timestamps)
        existing.createdAt === existing.lastAccessed,
        
        // Condition 2: Session directory is newer than stored lastAccessed
        (() => {
          const sessionDirPath = this.findClaudeSessionDir(realPath);
          if (sessionDirPath && fs.existsSync(sessionDirPath)) {
            const sessionStats = fs.statSync(sessionDirPath);
            const sessionTime = new Date(sessionStats.mtime).getTime();
            const storedTime = new Date(existing.lastAccessed).getTime();
            return sessionTime > storedTime + 60000; // More than 1 minute newer
          }
          return false;
        })(),

        // Condition 3: Creation time looks wrong (much older than reasonable)
        (() => {
          const storedCreatedTime = new Date(existing.createdAt).getTime();
          const filesystemCreatedTime = new Date(timestamps.createdAt).getTime();
          const timeDiff = Math.abs(storedCreatedTime - filesystemCreatedTime);
          return timeDiff > 24 * 60 * 60 * 1000; // More than 1 day difference
        })()
      ];

      shouldUpdate = refreshConditions.some(condition => condition);

      if (shouldUpdate) {
        // Only update if we got better timestamps (not current time)
        const now = new Date();
        const timestampDate = new Date(timestamps.createdAt);
        const timeDiff = Math.abs(now.getTime() - timestampDate.getTime());

        // If timestamp is more than 1 minute old, it's likely from filesystem
        if (timeDiff > 60000) {
          existing.createdAt = timestamps.createdAt;
          existing.lastAccessed = timestamps.lastAccessed;
          allMetadata[realPath] = existing;
          this.saveMetadata(allMetadata);
          console.log(`🔄 Refreshed timestamps for: ${realPath}`);
          console.log(`   Created: ${existing.createdAt}`);
          console.log(`   Accessed: ${existing.lastAccessed}`);
        }
      }

      return existing;
    }

    // Create new metadata if not found
    // Try to get real timestamps from filesystem
    const timestamps = this.getProjectTimestamps(realPath);
    const metadataId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const metadata: ProjectMetadata = {
      id: metadataId,
      name: path.basename(realPath),
      description: '',
      path: realPath, // Store the real path (symlinks resolved)
      createdAt: timestamps.createdAt,
      lastAccessed: timestamps.lastAccessed,
      agents: {},
      defaultAgent: '',
      skills: {},
      tags: [],
      metadata: {}
    };

    // Save to store using the real path as key
    allMetadata[realPath] = metadata;
    this.saveMetadata(allMetadata);

    return metadata;
  }

  /**
   * Get project timestamps from filesystem
   */
  private getProjectTimestamps(projectPath: string): { createdAt: string; lastAccessed: string } {
    const now = new Date().toISOString();
    let createdAt = now;
    let lastAccessed = now;

    try {
      // Strategy 1: Try to get last accessed time from Claude sessions directory FIRST
      // This is the most accurate for when the project was actually used
      const sessionDirPath = this.findClaudeSessionDir(projectPath);
      if (sessionDirPath && fs.existsSync(sessionDirPath)) {
        const sessionStats = fs.statSync(sessionDirPath);
        lastAccessed = sessionStats.mtime.toISOString();
      }

      // Strategy 2: Try to get creation time from real project directory
      if (fs.existsSync(projectPath)) {
        const stats = fs.statSync(projectPath);
        createdAt = stats.birthtime.toISOString();
        
        // Only use project directory mtime if we don't have session time
        if (lastAccessed === now) {
          lastAccessed = stats.mtime.toISOString();
        }
      } else {
        // Strategy 3: If project directory doesn't exist, try parent directory
        // This helps for projects that were deleted but still exist in ~/.claude.json
        const parentDir = path.dirname(projectPath);
        if (fs.existsSync(parentDir)) {
          const parentStats = fs.statSync(parentDir);
          createdAt = parentStats.birthtime.toISOString();
          
          // Only use parent directory mtime if we don't have session time
          if (lastAccessed === now) {
            lastAccessed = parentStats.mtime.toISOString();
          }
          console.log(`📁 Using parent directory timestamps for missing project: ${projectPath}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to get timestamps for ${projectPath}:`, error);
    }

    return { createdAt, lastAccessed };
  }

  /**
   * Find the Claude session directory for a project path
   */
  private findClaudeSessionDir(projectPath: string): string | null {
    try {
      // First, try to resolve symlinks to get the real path
      // This is important because Claude CLI stores sessions using the real path
      let resolvedPath = projectPath;
      try {
        resolvedPath = fs.realpathSync(projectPath);
        if (resolvedPath !== projectPath) {
          console.log(`🔗 [ProjectMetadata] Resolved symlink: ${projectPath} -> ${resolvedPath}`);
        }
      } catch {
        // If can't resolve, use original path
      }
      
      // The session directory name is the encoded project path
      // For example: /Users/kongjie/Desktop/.workspace2.nosync -> -Users-kongjie-Desktop--workspace2-nosync
      // Claude CLI replaces both '/' and '.' with '-'
      const encoded = resolvedPath.replace(/[\/\.]/g, '-');
      const sessionDir = path.join(this.projectsDir, encoded);

      if (fs.existsSync(sessionDir)) {
        return sessionDir;
      }
      
      // Also try the original path in case the symlink resolution changed the result
      if (resolvedPath !== projectPath) {
        const originalEncoded = projectPath.replace(/[\/\.]/g, '-');
        const originalSessionDir = path.join(this.projectsDir, originalEncoded);
        if (fs.existsSync(originalSessionDir)) {
          return originalSessionDir;
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return null;
  }

  /**
   * Resolve a path to its real path (following symlinks)
   */
  private resolveRealPath(projectPath: string): string {
    try {
      return fs.realpathSync(projectPath);
    } catch {
      // If path doesn't exist or can't be resolved, return original
      return projectPath;
    }
  }

  /**
   * Get all projects by reading from both ~/.claude.json and AgentStudio metadata
   * Deduplicates projects that point to the same real path (symlinks)
   */
  getAllProjects(): ProjectWithAgentInfo[] {
    const claudeProjectPaths = this.getClaudeProjects();
    const allMetadata = this.loadMetadata();
    const projects: ProjectWithAgentInfo[] = [];
    const processedPaths = new Set<string>();
    // Track real paths to deduplicate symlinks pointing to the same location
    const processedRealPaths = new Set<string>();

    // First, process projects from Claude config (active projects)
    for (const projectPath of claudeProjectPaths) {
      try {
        // Resolve symlinks to get real path for deduplication
        const realPath = this.resolveRealPath(projectPath);
        
        // Skip if we've already processed a project pointing to the same real path
        if (processedRealPaths.has(realPath)) {
          console.log(`🔗 [Dedup] Skipping duplicate project (same real path): ${projectPath} -> ${realPath}`);
          continue;
        }
        
        // Get or create metadata for this project
        const metadata = this.getOrCreateMetadataForPath(projectPath);

        // Enrich with agent info
        const enriched = this.enrichProjectWithAgentInfo(metadata);
        projects.push(enriched);
        processedPaths.add(projectPath);
        processedRealPaths.add(realPath);
      } catch (error) {
        console.error(`Failed to process project ${projectPath}:`, error);
      }
    }

    // Then, process projects that only exist in AgentStudio metadata (created but not yet used)
    for (const projectPath of Object.keys(allMetadata)) {
      if (!processedPaths.has(projectPath)) {
        try {
          // Resolve symlinks to get real path for deduplication
          const realPath = this.resolveRealPath(projectPath);
          
          // Skip if we've already processed a project pointing to the same real path
          if (processedRealPaths.has(realPath)) {
            console.log(`🔗 [Dedup] Skipping duplicate AgentStudio project (same real path): ${projectPath} -> ${realPath}`);
            continue;
          }
          
          const metadata = allMetadata[projectPath];
          
          // Only include if the project has agents associated (active projects)
          if (Object.keys(metadata.agents).length > 0) {
            const enriched = this.enrichProjectWithAgentInfo(metadata);
            projects.push(enriched);
            processedRealPaths.add(realPath);
            console.log(`📋 Added AgentStudio-only project: ${metadata.name}`);
          }
        } catch (error) {
          console.error(`Failed to process AgentStudio project ${projectPath}:`, error);
        }
      }
    }

    return projects.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
  }

  /**
   * Get project metadata by path
   */
  getProjectMetadata(projectPath: string): ProjectMetadata | null {
    const realPath = this.resolveRealPath(projectPath); // Resolve symlinks for lookup
    const allMetadata = this.loadMetadata();
    return allMetadata[realPath] || null;
  }

  /**
   * Save project metadata for a specific path
   */
  saveProjectMetadata(projectPath: string, metadata: ProjectMetadata): void {
    const realPath = this.resolveRealPath(projectPath); // Resolve symlinks for storage
    const allMetadata = this.loadMetadata();
    allMetadata[realPath] = metadata;
    this.saveMetadata(allMetadata);
  }

  /**
   * Get project directory last modified time from filesystem by path
   */
  private getProjectLastModifiedByPath(projectPath: string, metadata: ProjectMetadata): string {
    try {
      // Priority 1: Use session directory time (most accurate for last activity)
      const sessionDirPath = this.findClaudeSessionDir(projectPath);
      if (sessionDirPath && fs.existsSync(sessionDirPath)) {
        const sessionStats = fs.statSync(sessionDirPath);
        return sessionStats.mtime.toISOString();
      }

      // Priority 2: Use project directory time
      if (fs.existsSync(projectPath)) {
        const stats = fs.statSync(projectPath);
        return stats.mtime.toISOString();
      }
    } catch (error) {
      console.warn(`Failed to get filesystem time for project ${projectPath}:`, error);
    }

    // Fallback to metadata lastAccessed if filesystem time is unavailable
    return metadata.lastAccessed;
  }


  /**
   * Enrich project metadata with agent information
   */
  private enrichProjectWithAgentInfo(metadata: ProjectMetadata): ProjectWithAgentInfo {
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
        const allMetadata = this.loadMetadata();
        allMetadata[metadata.path] = metadata;
        this.saveMetadata(allMetadata);
      }
    } else {
      // No agents assigned, use claude-code as default fallback
      const fallbackAgent = this.agentStorage.getAgent('claude-code');
      if (fallbackAgent && fallbackAgent.enabled) {
        defaultAgent = 'claude-code';
        defaultAgentName = fallbackAgent.name;
        defaultAgentIcon = fallbackAgent.ui.icon;
        console.log(`📋 Using fallback agent (claude-code) for project: ${metadata.name}`);
      }
    }

    // Use the path from metadata (which is the real project path)
    const projectPath = metadata.path;

    // Get actual last modified time from filesystem
    const lastAccessed = this.getProjectLastModifiedByPath(projectPath, metadata);

    // Extract directory name from path for compatibility
    const dirName = path.basename(projectPath);

    return {
      id: metadata.id,
      name: metadata.name,
      dirName,
      path: projectPath,
      realPath: projectPath,
      description: metadata.description,
      createdAt: metadata.createdAt,
      lastAccessed: lastAccessed,
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
  addAgentToProject(projectPath: string, agentId: string): void {
    const metadata = this.getProjectMetadata(projectPath);
    if (!metadata) return;

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
    this.saveProjectMetadata(projectPath, metadata);
  }

  /**
   * Remove an agent from a project
   */
  removeAgentFromProject(projectPath: string, agentId: string): void {
    const metadata = this.getProjectMetadata(projectPath);
    if (!metadata) return;

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
      this.saveProjectMetadata(projectPath, metadata);
    }
  }

  /**
   * Set default agent for a project
   */
  setDefaultAgent(projectPath: string, agentId: string): void {
    const metadata = this.getProjectMetadata(projectPath);
    if (!metadata) return;

    // Ensure the agent is enabled for this project
    if (!metadata.agents[agentId]) {
      this.addAgentToProject(projectPath, agentId);
      return;
    }

    if (metadata.agents[agentId].enabled) {
      metadata.defaultAgent = agentId;
      metadata.lastAccessed = new Date().toISOString();
      this.saveProjectMetadata(projectPath, metadata);
    }
  }

  /**
   * Update project tags
   */
  updateProjectTags(projectPath: string, tags: string[]): void {
    const metadata = this.getProjectMetadata(projectPath);
    if (!metadata) return;

    metadata.tags = tags;
    metadata.lastAccessed = new Date().toISOString();
    this.saveProjectMetadata(projectPath, metadata);
  }

  /**
   * Update project custom metadata
   */
  updateProjectMetadata(projectPath: string, customMetadata: Record<string, any>): void {
    const metadata = this.getProjectMetadata(projectPath);
    if (!metadata) return;

    metadata.metadata = { ...metadata.metadata, ...customMetadata };
    metadata.lastAccessed = new Date().toISOString();
    this.saveProjectMetadata(projectPath, metadata);
  }

  /**
   * Update project basic info
   */
  updateProjectInfo(projectPath: string, updates: { name?: string; description?: string }): void {
    const metadata = this.getProjectMetadata(projectPath);
    if (!metadata) return;

    if (updates.name !== undefined) {
      metadata.name = updates.name;
    }
    if (updates.description !== undefined) {
      metadata.description = updates.description;
    }

    metadata.lastAccessed = new Date().toISOString();
    this.saveProjectMetadata(projectPath, metadata);
  }

  /**
   * Record agent usage for a project
   */
  recordAgentUsage(projectPath: string, agentId: string): void {
    const metadata = this.getProjectMetadata(projectPath);
    if (!metadata) return;

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

    this.saveProjectMetadata(projectPath, metadata);
  }

  /**
   * Create a new project metadata entry
   * @param projectPath The project path (will be resolved to real path if it's a symlink)
   * @param initialData Initial project data including name, description, agentId, etc.
   */
  createProject(projectPath: string, initialData: {
    name?: string;
    description?: string;
    agentId?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): ProjectMetadata {
    // Resolve symlinks to always store the real path
    const realPath = this.resolveRealPath(projectPath);
    if (realPath !== projectPath) {
      console.log(`🔗 [createProject] Resolved symlink: ${projectPath} -> ${realPath}`);
    }
    
    const now = new Date().toISOString();

    // Generate a unique metadata ID
    const metadataId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const metadata: ProjectMetadata = {
      id: metadataId,
      name: initialData.name || path.basename(realPath),
      description: initialData.description || '',
      path: realPath, // Store the real project path (symlinks resolved)
      createdAt: now,
      lastAccessed: now,
      agents: {},
      defaultAgent: '',
      skills: {},
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

    // Save metadata using the real path
    this.saveProjectMetadata(realPath, metadata);
    return metadata;
  }

  /**
   * Delete a project (remove metadata, claude config entry, and session directory)
   */
  deleteProject(projectPath: string): boolean {
    try {
      const realPath = this.resolveRealPath(projectPath); // Resolve symlinks for deletion
      let deletedSomething = false;

      // 1. Delete from AgentStudio metadata
      const allMetadata = this.loadMetadata();
      if (allMetadata[realPath]) {
        delete allMetadata[realPath];
        this.saveMetadata(allMetadata);
        deletedSomething = true;
        console.log(`🗑️ Removed project metadata: ${realPath}`);
      }

      // 2. Remove from Claude's config file (~/.claude.json)
      try {
        if (fs.existsSync(this.claudeConfigPath)) {
          const content = fs.readFileSync(this.claudeConfigPath, 'utf-8');
          const config = JSON.parse(content);
          
          // Try to remove both the symlink path and real path from Claude config
          let removed = false;
          if (config.projects && config.projects[realPath]) {
            delete config.projects[realPath];
            removed = true;
          }
          if (config.projects && config.projects[projectPath] && projectPath !== realPath) {
            delete config.projects[projectPath];
            removed = true;
          }
          if (removed) {
            fs.writeFileSync(this.claudeConfigPath, JSON.stringify(config, null, 2));
            deletedSomething = true;
            console.log(`🗑️ Removed from Claude config: ${realPath}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to remove from Claude config:`, error);
      }

      // 3. Remove Claude session directory
      try {
        const sessionDirPath = this.findClaudeSessionDir(realPath);
        if (sessionDirPath && fs.existsSync(sessionDirPath)) {
          fs.rmSync(sessionDirPath, { recursive: true, force: true });
          deletedSomething = true;
          console.log(`🗑️ Removed session directory: ${sessionDirPath}`);
        }
      } catch (error) {
        console.warn(`Failed to remove session directory:`, error);
      }

      return deletedSomething;
    } catch (error) {
      console.error(`Failed to delete project ${projectPath}:`, error);
      return false;
    }
  }

  /**
   * Get project by path
   */
  getProject(projectPath: string): ProjectWithAgentInfo | null {
    try {
      const metadata = this.getProjectMetadata(projectPath);
      if (!metadata) return null;
      return this.enrichProjectWithAgentInfo(metadata);
    } catch (error) {
      console.error(`Failed to get project ${projectPath}:`, error);
      return null;
    }
  }
}