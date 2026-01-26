/**
 * Slack AI Service
 *
 * Adapts AgentStudio's AI architecture for Slack
 * Reuses sessionManager, AgentStorage, and Claude Code SDK
 * WITHOUT modifying existing SSE implementation
 */

import * as path from 'path';
import * as fs from 'fs';
import { sessionManager } from './sessionManager.js';
import { AgentStorage } from './agentStorage.js';
import { slackThreadMapper } from './slackThreadMapper.js';
import { slackSessionLock } from './slackSessionLock.js';
import { SlackClient } from './slackClient.js';
import { ProjectMetadataStorage } from './projectMetadataStorage.js';
import { getSlackConfig } from '../config/index.js';
import type { SlackMessageEvent, SlackAppMentionEvent, ProjectParseResult, SlackFile } from '../types/slack.js';
import type { ProjectWithAgentInfo } from '../types/projects.js';
import { buildQueryOptions, getDefaultClaudeVersionEnv } from '../utils/claudeUtils.js';
import { getDefaultVersionId, getVersionByIdInternal } from './claudeVersionStorage.js';
import { buildUserMessageContent } from '../utils/sessionUtils.js';

/**
 * Slack messages - Extracted for easier localization
 */
const SLACK_MESSAGES = {
  // Status messages
  THINKING: '🤔 正在思考...',
  THINKING_WITH_AGENT: (agentName: string, projectInfo: string) => 
    `🤔 ${agentName}${projectInfo} 正在思考...`,
  THINKING_LABEL: '💭 **思考中...**',
  COMPLETED: '✅ 完成',
  SESSION_BUSY: (agentName: string) => 
    `🚦 ${agentName} 正在处理其他消息，请稍后再试...`,
  
  // Error messages
  ERROR_GENERIC: '❌ 处理请求时发生错误，请稍后重试',
  ERROR_WITH_MESSAGE: (message: string) => 
    `❌ 错误: ${message}`,
  ERROR_PROCESSING: (message: string) => 
    `❌ 处理消息时发生错误: ${message}`,
  UNKNOWN_ERROR: '未知错误',
  
  // Project messages
  PROJECT_MULTIPLE_MATCHES: (projectList: string) => 
    `🎯 **找到多个匹配的项目，请选择：**\n\n${projectList}\n\n📝 **使用方法：**\n• 指定目录名：\`proj:目录名\`\n• 或指定完整路径：\`proj:/完整/路径\``,
  PROJECT_NOT_FOUND: (identifier: string, sampleProjects: string, moreCount: number) => 
    `❌ **未找到项目 "${identifier}"**\n\n📂 **可用项目：**\n${sampleProjects}${moreCount > 0 ? `\n... 还有 ${moreCount} 个项目` : ''}\n\n💡 **提示：** 使用项目目录名或完整路径来指定项目`,
  PROJECT_INFO: (projectName: string) => ` 在项目 ${projectName} 中`,
  
  // Agent messages
  AGENT_NOT_FOUND: (agentId: string) => `❌ Agent **${agentId}** not found.`,
  AGENT_DISABLED: (agentName: string) => `⚠️ Agent **${agentName}** is currently disabled.`,
  SELECT_AGENT: (agentsList: string) => 
    `🤖 **请选择你想要使用的AI助手：**\n\n${agentsList}\n\n📝 **使用方法：**\n• 直接提及：\`@机器人 ppt-editor 请帮我创建幻灯片\`\n• 或使用别名：\`@机器人 ppt 请帮我创建幻灯片\`\n• 通用对话：\`@机器人 general 随便聊聊\``,
};

/**
 * Parse agent from message text
 * Supports agent mention, agent name, or agent ID
 */
function parseAgentFromMessage(text: string, allAgents: any[]): { agentId: string; cleanText: string } | null {
  // Remove the bot mention if present
  const cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim();

  // Check for agent mention format: @agent-name or agent-name
  const agentMentionMatch = cleanText.match(/^@?([a-zA-Z0-9\-_]+)\s+(.+)/);
  if (agentMentionMatch) {
    const potentialAgentId = agentMentionMatch[1];
    const remainingText = agentMentionMatch[2].trim();

    // First try exact match with agent ID
    let agent = allAgents.find(a => a.id.toLowerCase() === potentialAgentId.toLowerCase());

    // Then try name match
    if (!agent) {
      agent = allAgents.find(a => a.name.toLowerCase().includes(potentialAgentId.toLowerCase()) ||
        potentialAgentId.toLowerCase().includes(a.name.toLowerCase()));
    }

    // Finally try to match with common aliases
    if (!agent) {
      const aliases: { [key: string]: string } = {
        'ppt': 'ppt-editor',
        'slides': 'ppt-editor',
        'presentation': 'ppt-editor',
        'powerpoint': 'ppt-editor',
        'code': 'code-assistant',
        'coding': 'code-assistant',
        'developer': 'code-assistant',
        'programmer': 'code-assistant',
        'document': 'document-writer',
        'docs': 'document-writer',
        'writing': 'document-writer',
        'writer': 'document-writer',
        'general': 'general-chat',
        'chat': 'general-chat',
        'assistant': 'general-chat',
        'help': 'general-chat'
      };

      const aliasId = aliases[potentialAgentId.toLowerCase()];
      if (aliasId) {
        agent = allAgents.find(a => a.id === aliasId);
      }
    }

    if (agent && agent.enabled) {
      return { agentId: agent.id, cleanText: remainingText };
    }
  }

  return null;
}

/**
 * Parse project specification from message text
 * Supports proj:project-name format
 */
function parseProjectFromMessage(text: string): ProjectParseResult | null {
  // Check for project specification format: proj:project-name
  // The pattern can appear anywhere in the text
  const projectMatch = text.match(/proj:([^\s]+)/i);
  if (projectMatch) {
    const projectIdentifier = projectMatch[1];
    // Remove the project specification from the text
    const cleanText = text.replace(/proj:[^\s]+/gi, '').trim();
    return { projectIdentifier, cleanText };
  }

  return null;
}

/**
 * Match project identifier against available projects
 * Priority order: exact path match -> exact directory name match (prefer home paths) -> basename match -> partial match
 */
function matchProject(
  identifier: string,
  allProjects: ProjectWithAgentInfo[]
): { matches: ProjectWithAgentInfo[]; isExactMatch: boolean } {
  const identifierLower = identifier.toLowerCase();

  // Priority 1: Exact path match (full path or real path)
  const exactPathMatches = allProjects.filter(project =>
    project.path.toLowerCase() === identifierLower ||
    project.realPath?.toLowerCase() === identifierLower
  );

  if (exactPathMatches.length > 0) {
    return { matches: exactPathMatches, isExactMatch: true };
  }

  // Priority 2: Exact directory name match
  const exactDirMatches = allProjects.filter(project =>
    project.dirName.toLowerCase() === identifierLower
  );

  if (exactDirMatches.length > 0) {
    // If multiple exact directory matches, prioritize by:
    // 1. Home directory paths (containing /home/ or ~)
    // 2. More recently accessed
    const prioritizedMatches = exactDirMatches.sort((a, b) => {
      const aIsHome = a.path.includes('/home/') || a.path.includes('~');
      const bIsHome = b.path.includes('/home/') || b.path.includes('~');

      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;

      // If both have same home priority, sort by last accessed
      return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
    });

    return { matches: prioritizedMatches, isExactMatch: true };
  }

  // Priority 3: Basename match (match against the last component of paths)
  const basenameMatches = allProjects.filter(project => {
    const pathBasename = path.basename(project.path).toLowerCase();
    const realPathBasename = project.realPath ? path.basename(project.realPath).toLowerCase() : '';

    return pathBasename === identifierLower || realPathBasename === identifierLower;
  });

  if (basenameMatches.length > 0) {
    // Prioritize basename matches the same way
    const prioritizedMatches = basenameMatches.sort((a, b) => {
      const aIsHome = a.path.includes('/home/') || a.path.includes('~');
      const bIsHome = b.path.includes('/home/') || b.path.includes('~');

      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;

      return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
    });

    return { matches: prioritizedMatches, isExactMatch: true };
  }

  // Priority 4: Partial matches (only if no exact matches found)
  // This matches identifier as a substring of directory names
  const partialDirMatches = allProjects.filter(project =>
    project.dirName.toLowerCase().includes(identifierLower) ||
    identifierLower.includes(project.dirName.toLowerCase())
  );

  // Priority 5: Partial basename matches
  const partialBasenameMatches = allProjects.filter(project => {
    const pathBasename = path.basename(project.path).toLowerCase();
    const realPathBasename = project.realPath ? path.basename(project.realPath).toLowerCase() : '';

    return pathBasename.includes(identifierLower) ||
      identifierLower.includes(pathBasename) ||
      realPathBasename.includes(identifierLower) ||
      identifierLower.includes(realPathBasename);
  });

  // Combine all partial matches and remove duplicates, then prioritize
  const allPartialMatches = [...new Set([...partialDirMatches, ...partialBasenameMatches])];

  const prioritizedPartialMatches = allPartialMatches.sort((a, b) => {
    const aIsHome = a.path.includes('/home/') || a.path.includes('~');
    const bIsHome = b.path.includes('/home/') || b.path.includes('~');

    if (aIsHome && !bIsHome) return -1;
    if (!aIsHome && bIsHome) return 1;

    return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
  });

  return { matches: prioritizedPartialMatches, isExactMatch: false };
}

/**
 * Create project selection message for multiple matches
 */
function createProjectSelectionMessage(matches: ProjectWithAgentInfo[]): string {
  const projectList = matches.map((project, index) => {
    const pathInfo = project.realPath ? ` (${project.realPath})` : '';
    return `${index + 1}. **${project.name}** (\`${project.dirName}\`${pathInfo})`;
  }).join('\n');

  return SLACK_MESSAGES.PROJECT_MULTIPLE_MATCHES(projectList);
}

/**
 * Create project not found message
 */
function createProjectNotFoundMessage(identifier: string, availableProjects: ProjectWithAgentInfo[]): string {
  const sampleProjects = availableProjects.slice(0, 5).map(project =>
    `• \`${project.dirName}\` - ${project.name}`
  ).join('\n');
  const moreCount = availableProjects.length > 5 ? availableProjects.length - 5 : 0;

  return SLACK_MESSAGES.PROJECT_NOT_FOUND(identifier, sampleProjects, moreCount);
}

/**
 * Get available agents list for Slack response
 */
function getAvailableAgentsList(allAgents: any[]): string {
  const enabledAgents = allAgents.filter(a => a.enabled);
  return enabledAgents.map(agent => `• **${agent.name}** (\`${agent.id}\`) - ${agent.description}`).join('\n');
}

/**
 * Message context containing all parsed information
 */
interface MessageContext {
  threadTs: string;
  isNewThread: boolean;
  agentId: string;
  agent: any;
  selectedProject: ProjectWithAgentInfo | null;
  cleanText: string;
}

/**
 * Claude version configuration
 */
interface ClaudeVersionConfig {
  versionId?: string;
  model?: string;
  env: Record<string, string> | null;
}

/**
 * Slack AI Service - Main adapter class
 */
export class SlackAIService {
  private slackClient: SlackClient;
  private agentStorage: AgentStorage;
  private projectStorage: ProjectMetadataStorage;
  private defaultAgentId: string;
  private defaultProjectPath: string | null = null;

  constructor(botToken: string, defaultAgentId: string = 'general-chat') {
    this.slackClient = new SlackClient(botToken);
    this.agentStorage = new AgentStorage();
    this.projectStorage = new ProjectMetadataStorage();
    this.defaultAgentId = defaultAgentId;
  }

  /**
   * Get or create default project for Slack
   */
  private async getDefaultProject(): Promise<ProjectWithAgentInfo | null> {
    // Check if already cached
    if (this.defaultProjectPath) {
      const allProjects = this.projectStorage.getAllProjects();
      const cachedProject = allProjects.find(p =>
        p.realPath === this.defaultProjectPath || p.path === this.defaultProjectPath
      );
      if (cachedProject) {
        return cachedProject;
      }
    }

    // Priority 1: Check configuration (from env or config.json)
    const { defaultProject: envProjectPath } = await getSlackConfig();
    if (envProjectPath) {
      console.log(`📂 Found SLACK_DEFAULT_PROJECT config: ${envProjectPath}`);

      // Check if this path exists in projects
      const allProjects = this.projectStorage.getAllProjects();
      const envProject = allProjects.find(p =>
        p.realPath === envProjectPath || p.path === envProjectPath
      );

      if (envProject) {
        this.defaultProjectPath = envProject.realPath || envProject.path;
        console.log(`✅ Using default project from config: ${envProject.name}`);
        return envProject;
      } else {
        console.warn(`⚠️ SLACK_DEFAULT_PROJECT path not found in projects: ${envProjectPath}`);
      }
    }

    // Priority 2: Use or create slack-app project in claude-code-projects
    const homeDir = require('os').homedir();
    const projectsDir = path.join(homeDir, 'claude-code-projects');
    const slackAppPath = path.join(projectsDir, 'slack-app');

    // Ensure claude-code-projects directory exists
    if (!fs.existsSync(projectsDir)) {
      console.log(`📁 Creating claude-code-projects directory: ${projectsDir}`);
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    // Ensure slack-app directory exists
    if (!fs.existsSync(slackAppPath)) {
      console.log(`📁 Creating default Slack project: ${slackAppPath}`);
      fs.mkdirSync(slackAppPath, { recursive: true });

      // Create a README.md to explain this directory
      const readmePath = path.join(slackAppPath, 'README.md');
      const readmeContent = `# Slack App Default Project

This is the default project directory for Slack App interactions.

When you chat with the AI in Slack without specifying a project (using \`proj:\`), 
this directory will be used as the working directory.

## Customizing the Default Project

You can change the default project by:

1. **Environment Variable**: Set \`SLACK_DEFAULT_PROJECT\` to your desired project path
   \`\`\`bash
   export SLACK_DEFAULT_PROJECT=/path/to/your/project
   \`\`\`

2. **Specify in Message**: Use \`proj:project-name\` in your Slack message
   \`\`\`
   @bot proj:my-project help me with this code
   \`\`\`

## Project Structure

Feel free to organize your files here as needed. This directory is managed by AgentStudio.
`;
      fs.writeFileSync(readmePath, readmeContent, 'utf-8');
      console.log(`📝 Created README.md in ${slackAppPath}`);
    }

    // Check if slack-app exists in projects metadata
    const allProjects = this.projectStorage.getAllProjects();
    let slackAppProject = allProjects.find(p =>
      p.realPath === slackAppPath || p.path === slackAppPath || p.dirName === 'slack-app'
    );

    if (!slackAppProject) {
      // Project directory exists but not in metadata, it will be picked up on next scan
      // For now, create a minimal project info
      console.log(`🔄 Slack-app directory exists but not in metadata, will be picked up on next scan`);

      // Try to get it from storage (in case it was just added)
      const metadata = this.projectStorage.getProjectMetadata(slackAppPath);

      if (metadata) {
        // Construct a minimal project info
        slackAppProject = {
          id: metadata.id,
          name: metadata.name || 'Slack App',
          description: metadata.description || 'Default project for Slack interactions',
          path: slackAppPath,
          realPath: slackAppPath,
          dirName: 'slack-app',
          createdAt: metadata.createdAt,
          lastAccessed: metadata.lastAccessed,
          agents: [],
          defaultAgent: metadata.defaultAgent || '',
          defaultAgentName: '',
          defaultAgentIcon: '',
          tags: metadata.tags || [],
          metadata: metadata.metadata || {}
        };
      }
    }

    if (!slackAppProject) {
      console.error(`❌ Failed to create or find slack-app project`);
      return null;
    }

    this.defaultProjectPath = slackAppProject.realPath || slackAppProject.path;
    console.log(`✅ Using default Slack project: ${slackAppProject.name} at ${this.defaultProjectPath}`);

    return slackAppProject;
  }

  /**
   * Parse and validate message context
   */
  private async parseMessageContext(
    event: SlackMessageEvent | SlackAppMentionEvent
  ): Promise<MessageContext | null> {
    const threadTs = event.thread_ts || event.ts;
    const isNewThread = !event.thread_ts;

    // Get all available agents and projects
    const allAgents = this.agentStorage.getAllAgents();
    const enabledAgents = allAgents.filter((agent: any) => agent.enabled);
    const allProjects = this.projectStorage.getAllProjects();

    // Parse agent from message
    const agentSelection = parseAgentFromMessage(event.text, enabledAgents);

    // Start with the cleaned text from agent parsing (if available)
    let cleanText = agentSelection ? agentSelection.cleanText : event.text;

    // Check if this thread already has a session with project info
    const existingSessionId = slackThreadMapper.getSessionId(threadTs, event.channel);
    const existingMapping = existingSessionId
      ? slackThreadMapper.getThreadForSession(existingSessionId)
      : null;
    const hasExistingProject = existingMapping && existingMapping.projectPath;

    // Parse project from message
    // Parse for: new threads OR threads without existing project
    let selectedProject: ProjectWithAgentInfo | null = null;

    if (isNewThread || !hasExistingProject) {
      // Parse project from the already-cleaned text
      const projectSelection = parseProjectFromMessage(cleanText);
      if (projectSelection) {
        console.log(`🎯 Found project specification: ${projectSelection.projectIdentifier}`);

        // Match project against available projects
        const projectMatch = matchProject(projectSelection.projectIdentifier, allProjects);

        if (projectMatch.matches.length === 0) {
          // No projects found
          const errorMessage = createProjectNotFoundMessage(projectSelection.projectIdentifier, allProjects);
          await this.slackClient.postMessage({
            channel: event.channel,
            text: errorMessage,
            thread_ts: threadTs
          });
          return null;
        } else if (projectMatch.matches.length > 1 && !projectMatch.isExactMatch) {
          // Multiple partial matches found - ask user to be more specific
          const selectionMessage = createProjectSelectionMessage(projectMatch.matches);
          await this.slackClient.postMessage({
            channel: event.channel,
            text: selectionMessage,
            thread_ts: threadTs
          });
          return null;
        } else {
          // Single match found, or multiple exact matches (already prioritized)
          selectedProject = projectMatch.matches[0];
          console.log(`✅ Selected project: ${selectedProject.name} (${selectedProject.dirName}) - Path: ${selectedProject.realPath || selectedProject.path}`);

          // If there were multiple exact matches, log this for debugging
          if (projectMatch.matches.length > 1) {
            console.log(`📝 Note: Found ${projectMatch.matches.length} exact matches, selected the highest priority one`);
          }
        }

        // Update cleanText with project specification removed
        cleanText = projectSelection.cleanText;
      } else {
        // No project specified, use default project
        console.log(`📂 No project specified, using default project`);
        selectedProject = await this.getDefaultProject();

        if (selectedProject) {
          console.log(`✅ Using default project: ${selectedProject.name} at ${selectedProject.realPath || selectedProject.path}`);
        } else {
          console.warn(`⚠️ Failed to get default project`);
        }
      }
    } else {
      // Thread already has a project, use it from existing mapping
      if (existingMapping && existingMapping.projectPath) {
        console.log(`♻️  Reusing project from existing thread: ${existingMapping.projectPath}`);
        // Find the project in allProjects
        const existingProject = allProjects.find(p =>
          p.realPath === existingMapping.projectPath ||
          p.path === existingMapping.projectPath
        );
        if (existingProject) {
          selectedProject = existingProject;
          console.log(`✅ Found existing project: ${existingProject.name} (${existingProject.dirName})`);
        } else {
          console.warn(`⚠️ Existing project path not found in projects list: ${existingMapping.projectPath}`);
        }
      }
    }

    // Determine agent to use
    let agentId: string;
    if (agentSelection) {
      agentId = agentSelection.agentId;
      console.log(`🎯 Selected agent: ${agentId} from message`);
    } else {
      // Try to get agent from existing session
      const sessionId = slackThreadMapper.getSessionId(threadTs, event.channel);
      if (sessionId) {
        const existingSession = sessionManager.getSession(sessionId);
        if (existingSession) {
          agentId = existingSession.getAgentId();
          console.log(`♻️  Reusing agent from existing session: ${agentId}`);
        } else {
          agentId = this.defaultAgentId;
        }
      } else {
        agentId = this.defaultAgentId;
      }

      // Validate default agent
      const defaultAgent = this.agentStorage.getAgent(agentId);
      if (!defaultAgent || !defaultAgent.enabled) {
        // Show available agents list
        const agentsList = getAvailableAgentsList(allAgents);
        await this.slackClient.postMessage({
          channel: event.channel,
          text: SLACK_MESSAGES.SELECT_AGENT(agentsList),
          thread_ts: threadTs
        });
        return null;
      }

      console.log(`🔧 Using default agent: ${agentId}`);
    }

    // Get and validate agent
    const agent = this.agentStorage.getAgent(agentId);
    if (!agent) {
      await this.slackClient.postMessage({
        channel: event.channel,
        text: SLACK_MESSAGES.AGENT_NOT_FOUND(agentId),
        thread_ts: threadTs
      });
      return null;
    }

    if (!agent.enabled) {
      await this.slackClient.postMessage({
        channel: event.channel,
        text: SLACK_MESSAGES.AGENT_DISABLED(agent.name),
        thread_ts: threadTs
      });
      return null;
    }

    return {
      threadTs,
      isNewThread,
      agentId,
      agent,
      selectedProject,
      cleanText
    };
  }

  /**
   * Process Slack files and convert to image format for Claude
   */
  private async processSlackFiles(files: SlackFile[]): Promise<any[]> {
    const images: any[] = [];

    // Filter for image files only
    const imageFiles = files.filter(file =>
      file.mimetype.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      return images;
    }

    console.log(`📷 Processing ${imageFiles.length} image(s) from Slack`);

    for (const file of imageFiles) {
      try {
        console.log(`📥 Downloading image: ${file.name} (${file.mimetype}, ${file.size} bytes)`);

        // Download file from Slack
        const fileData = await this.slackClient.downloadFile(file.url_private_download);

        // Convert to base64
        const base64Data = fileData.toString('base64');

        images.push({
          id: file.id,
          mediaType: file.mimetype,
          filename: file.name,
          data: base64Data
        });

        console.log(`✅ Successfully processed image: ${file.name}`);
      } catch (error) {
        console.error(`❌ Failed to process image ${file.name}:`, error);
        // Continue processing other images
      }
    }

    return images;
  }

  /**
   * Get default Claude version configuration
   */
  private async getClaudeVersionConfig(): Promise<ClaudeVersionConfig> {
    try {
      const defaultVersionId = await getDefaultVersionId();
      if (defaultVersionId) {
        const defaultVersion = await getVersionByIdInternal(defaultVersionId);
        if (defaultVersion) {
          const model = defaultVersion.models && defaultVersion.models.length > 0
            ? defaultVersion.models[0].id
            : undefined;

          console.log(`🎯 Using default Claude version: ${defaultVersion.alias}${model ? ` with model: ${model}` : ''}`);

          return {
            versionId: defaultVersion.id,
            model,
            env: defaultVersion.environmentVariables || null
          };
        }
      }
    } catch (error) {
      console.error('Failed to get default Claude version:', error);
    }

    return { env: null };
  }

  /**
   * Acquire session lock or send busy message
   */
  private async acquireSessionLock(
    sessionId: string,
    event: SlackMessageEvent | SlackAppMentionEvent,
    threadTs: string,
    agentId: string,
    placeholderTs: string,
    agentDisplayName: string
  ): Promise<boolean> {
    const lockStatus = slackSessionLock.isSessionLocked(sessionId, true);

    if (lockStatus.locked) {
      console.log(`⚠️  Session ${sessionId} is locked (${lockStatus.reason}), returning busy message`);

      await this.slackClient.updateMessage({
        channel: event.channel,
        ts: placeholderTs,
        text: SLACK_MESSAGES.SESSION_BUSY(agentDisplayName)
      });

      return false;
    }

    const lockAcquired = slackSessionLock.tryAcquireLock(sessionId, {
      sessionId,
      threadTs,
      channel: event.channel,
      agentId
    });

    if (!lockAcquired) {
      console.log(`⚠️  Failed to acquire lock for session ${sessionId}, returning busy message`);

      await this.slackClient.updateMessage({
        channel: event.channel,
        ts: placeholderTs,
        text: SLACK_MESSAGES.SESSION_BUSY(agentDisplayName)
      });

      return false;
    }

    console.log(`🔒 Acquired lock for session ${sessionId}`);
    return true;
  }

  /**
   * Format tool call for display
   */
  private formatToolCall(toolName: string, input: any): string {
    if (!input || typeof input !== 'object') {
      return `🔧 ${toolName}()`;
    }

    // Define large content parameters that should always be hidden
    const largeContentParams: { [key: string]: string[] } = {
      'Write': ['content', 'contents'],
      'write': ['content', 'contents'],
      'search_replace': ['old_string', 'new_string']
    };

    // Determine threshold for "large" content
    const largeContentThreshold = 50; // chars

    // Extract key parameters (limit to avoid too long output)
    const params: string[] = [];
    const keys = Object.keys(input);

    // Check if this tool has large content parameters
    const largeParams = largeContentParams[toolName] || [];

    // Filter out large content params if they exceed threshold
    const displayKeys: string[] = [];
    for (const key of keys) {
      if (largeParams.includes(key)) {
        // Check if this parameter is large
        const value = input[key];
        if (typeof value === 'string') {
          // If content is large (multi-line or long), skip it from display
          if (value.length > largeContentThreshold || value.includes('\n')) {
            continue; // Skip this parameter, will show in summary
          }
        }
      }
      displayKeys.push(key);
      if (displayKeys.length >= 3) break; // Limit to 3 displayed params
    }

    // Format the displayed parameters
    for (const key of displayKeys) {
      let value = input[key];

      // Simplify long values
      if (typeof value === 'string') {
        if (value.length > 50) {
          value = value.substring(0, 47) + '...';
        }
        value = `"${value}"`;
      } else if (typeof value === 'object') {
        const jsonStr = JSON.stringify(value);
        if (jsonStr.length > 50) {
          value = jsonStr.substring(0, 47) + '...';
        } else {
          value = jsonStr;
        }
      }

      params.push(`${key}=${value}`);
    }

    // Add summary for hidden large params
    const hiddenLargeParams: string[] = [];
    if (toolName === 'Write' || toolName === 'write') {
      if (input.content && displayKeys.indexOf('content') === -1) {
        hiddenLargeParams.push(`content: ${input.content.length} chars`);
      }
      if (input.contents && displayKeys.indexOf('contents') === -1) {
        hiddenLargeParams.push(`contents: ${input.contents.length} chars`);
      }
    }
    if (toolName === 'search_replace') {
      if (input.old_string && displayKeys.indexOf('old_string') === -1) {
        hiddenLargeParams.push(`old: ${input.old_string.length} chars`);
      }
      if (input.new_string && displayKeys.indexOf('new_string') === -1) {
        hiddenLargeParams.push(`new: ${input.new_string.length} chars`);
      }
    }

    const moreParamsInfo = hiddenLargeParams.length > 0
      ? `, ${hiddenLargeParams.join(', ')}`
      : (Object.keys(input).length > displayKeys.length ? ', ...' : '');

    return `🔧 ${toolName}(${params.join(', ')}${moreParamsInfo})`;
  }

  /**
   * Build status message from current state
   */
  private buildStatusMessage(
    thinkingContent: string,
    fullResponse: string
  ): string {
    let statusText = '';

    // Add thinking content if exists
    if (thinkingContent) {
      statusText += `💭 **思考中...**\n${thinkingContent}\n\n`;
    }

    // Add response text (which now includes tool calls in order)
    if (fullResponse) {
      statusText += fullResponse;
    }

    // If nothing to show yet, keep the thinking message
    if (!statusText.trim()) {
      statusText = SLACK_MESSAGES.THINKING;
    }

    // Debug log
    console.log('📄 Building status message:', {
      hasThinking: !!thinkingContent,
      hasResponse: !!fullResponse,
      statusTextLength: statusText.length
    });

    return statusText;
  }

  /**
   * Create Slack message updater with throttling
   */
  private createSlackMessageUpdater(
    event: SlackMessageEvent | SlackAppMentionEvent,
    placeholderTs: string,
    stateRef: {
      lastUpdateTime: number;
      pendingUpdate: boolean;
      thinkingContent: string;
      fullResponse: string;
    },
    updateThrottleMs: number = 1000
  ) {
    return async (force: boolean = false) => {
      const now = Date.now();

      // Throttle updates unless forced
      if (!force && now - stateRef.lastUpdateTime < updateThrottleMs) {
        stateRef.pendingUpdate = true;
        return;
      }

      stateRef.pendingUpdate = false;
      stateRef.lastUpdateTime = now;

      const statusText = this.buildStatusMessage(
        stateRef.thinkingContent,
        stateRef.fullResponse
      );

      try {
        await this.slackClient.updateMessage({
          channel: event.channel,
          ts: placeholderTs,
          text: statusText
        });
      } catch (error) {
        console.error('❌ Failed to update Slack message:', error);
      }
    };
  }

  /**
   * Handle Claude init message
   */
  private handleInitMessage(
    sdkMessage: any,
    claudeSession: any,
    event: SlackMessageEvent | SlackAppMentionEvent,
    threadTs: string,
    agentId: string,
    selectedProject: ProjectWithAgentInfo | null,
    configSnapshot?: any
  ): void {
    if (sdkMessage.type === 'system' && sdkMessage.subtype === 'init' && sdkMessage.session_id) {
      const newSessionId = sdkMessage.session_id;
      claudeSession.setClaudeSessionId(newSessionId);
      sessionManager.confirmSessionId(claudeSession, newSessionId, configSnapshot);

      // Update mapping with project information
      slackThreadMapper.setMapping({
        threadTs,
        channel: event.channel,
        sessionId: newSessionId,
        agentId,
        projectId: selectedProject?.dirName,
        projectPath: selectedProject?.realPath || selectedProject?.path
      });

      console.log(`✅ Session confirmed: ${newSessionId} for thread: ${threadTs}`);
    }
  }

  /**
   * Handle Claude thinking message
   */
  private handleThinkingMessage(
    sdkMessage: any,
    stateRef: { thinkingContent: string }
  ): boolean {
    if (sdkMessage.type === 'assistant' && sdkMessage.subtype === 'thinking') {
      if (sdkMessage.thinking || sdkMessage.text) {
        const thinkingText = sdkMessage.thinking || sdkMessage.text;
        stateRef.thinkingContent = thinkingText;
        console.log(`💭 Thinking: ${thinkingText.substring(0, 100)}...`);
        return true; // Trigger update
      }
    }
    return false;
  }

  /**
   * Extract text from assistant message
   */
  private extractTextFromAssistantMessage(sdkMessage: any): string {
    let newText = '';

    // Extract text from message.content array (standard Claude SDK format)
    if (sdkMessage.message?.content && Array.isArray(sdkMessage.message.content)) {
      for (const block of sdkMessage.message.content) {
        if (block.type === 'text' && block.text) {
          newText += block.text;
        }
      }
    }
    // Fallback: Try other formats
    else if (sdkMessage.subtype === 'text' && sdkMessage.text) {
      newText = sdkMessage.text;
    } else if (sdkMessage.message && typeof sdkMessage.message === 'string') {
      newText = sdkMessage.message;
    } else if (sdkMessage.content) {
      if (Array.isArray(sdkMessage.content)) {
        for (const block of sdkMessage.content) {
          if (block.type === 'text' && block.text) {
            newText += block.text;
          }
        }
      } else if (typeof sdkMessage.content === 'string') {
        newText = sdkMessage.content;
      }
    }

    return newText;
  }

  /**
   * Handle Claude assistant message
   */
  private handleAssistantMessage(
    sdkMessage: any,
    stateRef: { fullResponse: string; thinkingContent: string }
  ): boolean {
    if (sdkMessage.type === 'assistant' && sdkMessage.subtype !== 'thinking') {
      console.log('🔍 Assistant message details:', JSON.stringify({
        type: sdkMessage.type,
        subtype: sdkMessage.subtype,
        hasContent: !!(sdkMessage.content || sdkMessage.message?.content),
        contentLength: sdkMessage.content?.length || sdkMessage.message?.content?.length || 0
      }, null, 2));

      const newText = this.extractTextFromAssistantMessage(sdkMessage);

      if (newText) {
        stateRef.fullResponse += newText;
        // Clear thinking when actual response starts
        if (stateRef.thinkingContent) {
          stateRef.thinkingContent = '';
        }
        return true; // Trigger update
      }
    }
    return false;
  }

  /**
   * Handle Claude tool use message
   * Appends tool calls to fullResponse in chronological order
   */
  private handleToolUseMessage(
    sdkMessage: any,
    stateRef: { fullResponse: string; thinkingContent: string }
  ): boolean {
    // Log full message for debugging
    console.log('🔍 Checking for tool_use message:', JSON.stringify({
      type: sdkMessage.type,
      subtype: sdkMessage.subtype,
      hasToolUse: !!sdkMessage.tool_use,
      hasToolName: !!sdkMessage.tool_use?.name,
      fullMessage: sdkMessage
    }, null, 2));

    if (sdkMessage.type === 'tool_use' && sdkMessage.subtype === 'start') {
      const toolName = sdkMessage.tool_use?.name || 'unknown';
      const toolInput = sdkMessage.tool_use?.input || {};

      const formattedTool = this.formatToolCall(toolName, toolInput);

      // Append to fullResponse to maintain chronological order
      stateRef.fullResponse += `${stateRef.fullResponse ? '\n' : ''}${formattedTool}\n`;

      // Clear thinking when tool starts
      if (stateRef.thinkingContent) {
        stateRef.thinkingContent = '';
      }

      console.log(`🔧 Tool started: ${toolName}, formatted: ${formattedTool}`);
      console.log(`📝 Current fullResponse: ${stateRef.fullResponse}`);
      return true; // Trigger update
    }

    // Also check for assistant message with tool_use content
    if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
      const content = sdkMessage.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_use') {
            const toolName = block.name || 'unknown';
            const toolInput = block.input || {};

            const formattedTool = this.formatToolCall(toolName, toolInput);

            // Append to fullResponse to maintain chronological order
            stateRef.fullResponse += `${stateRef.fullResponse ? '\n' : ''}${formattedTool}\n`;

            // Clear thinking when tool starts
            if (stateRef.thinkingContent) {
              stateRef.thinkingContent = '';
            }

            console.log(`🔧 Tool found in assistant content: ${toolName}, formatted: ${formattedTool}`);
            console.log(`📝 Current fullResponse: ${stateRef.fullResponse}`);
            return true; // Trigger update
          }
        }
      }
    }

    return false;
  }

  /**
   * Process Claude response and collect text with real-time updates
   */
  private async processClaudeResponse(
    claudeSession: any,
    userMessage: any,
    event: SlackMessageEvent | SlackAppMentionEvent,
    threadTs: string,
    agentId: string,
    selectedProject: ProjectWithAgentInfo | null,
    placeholderTs: string,
    configSnapshot?: any
  ): Promise<{ fullResponse: string; toolUsageInfo: string; hasError: boolean }> {
    const stateRef = {
      fullResponse: '',
      thinkingContent: '',
      lastUpdateTime: 0,
      pendingUpdate: false
    };

    let hasError = false;
    let isResponseComplete = false;
    const updateThrottleMs = 1000;

    // Create update handler
    const updateSlackMessage = this.createSlackMessageUpdater(
      event,
      placeholderTs,
      stateRef,
      updateThrottleMs
    );

    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;
      let updateIntervalId: NodeJS.Timeout;

      // Set up periodic update check for pending updates
      updateIntervalId = setInterval(() => {
        if (stateRef.pendingUpdate && !isResponseComplete) {
          updateSlackMessage(false);
        }
      }, updateThrottleMs);

      claudeSession.sendMessage(userMessage, async (sdkMessage: any) => {
        console.log(`📦 Received SDK message type: ${sdkMessage.type}, subtype: ${sdkMessage.subtype}`);

        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Set a new timeout in case we don't get a result event
        timeoutId = setTimeout(() => {
          if (!isResponseComplete) {
            console.log('⏰ Response timeout, treating as complete');
            isResponseComplete = true;
            clearInterval(updateIntervalId);
            resolve({
              fullResponse: stateRef.fullResponse,
              toolUsageInfo: '', // No longer used, kept for interface compatibility
              hasError
            });
          }
        }, 30000); // 30 second timeout

        // Handle init message
        this.handleInitMessage(sdkMessage, claudeSession, event, threadTs, agentId, selectedProject, configSnapshot);

        // Handle thinking and trigger update if needed
        if (this.handleThinkingMessage(sdkMessage, stateRef)) {
          await updateSlackMessage(false);
        }

        // Handle assistant message and trigger update if needed
        if (this.handleAssistantMessage(sdkMessage, stateRef)) {
          await updateSlackMessage(false);
        }

        // Handle tool use and trigger update if needed
        if (this.handleToolUseMessage(sdkMessage, stateRef)) {
          await updateSlackMessage(false);
        }

        // Handle errors
        if (sdkMessage.type === 'error') {
          hasError = true;
          console.error('❌ Claude error:', sdkMessage.error || sdkMessage.message);
          isResponseComplete = true;
          clearTimeout(timeoutId);
          clearInterval(updateIntervalId);

          // Final update with error
          await updateSlackMessage(true);

          resolve({
            fullResponse: stateRef.fullResponse,
            toolUsageInfo: '', // No longer used, kept for interface compatibility
            hasError
          });
        }

        // Check for completion
        if (sdkMessage.type === 'result') {
          console.log('✅ AI response completed');
          isResponseComplete = true;
          clearTimeout(timeoutId);
          clearInterval(updateIntervalId);

          // Final update
          await updateSlackMessage(true);

          resolve({
            fullResponse: stateRef.fullResponse,
            toolUsageInfo: '', // No longer used, kept for interface compatibility
            hasError
          });
        }
      }).catch((error: unknown) => {
        console.error('❌ Error in sendMessage:', error);
        hasError = true;
        isResponseComplete = true;

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (updateIntervalId) {
          clearInterval(updateIntervalId);
        }

        resolve({
          fullResponse: stateRef.fullResponse,
          toolUsageInfo: '', // No longer used, kept for interface compatibility
          hasError: true
        });
      });
    });
  }

  /**
   * Handle incoming Slack message
   */
  async handleMessage(event: SlackMessageEvent | SlackAppMentionEvent): Promise<void> {
    try {
      console.log('📨 Received Slack message:', {
        channel: event.channel,
        user: event.user,
        text: event.text.substring(0, 50),
        thread_ts: event.thread_ts || event.ts
      });

      // Step 1: Parse and validate message context (agent, project, etc.)
      const context = await this.parseMessageContext(event);
      if (!context) {
        return; // Early exit if parsing failed (error message already sent)
      }

      const { threadTs, agentId, agent, selectedProject, cleanText } = context;

      // Step 2: Send "thinking" placeholder message
      const agentDisplayName = agent.ui.icon ? `${agent.ui.icon} ${agent.name}` : agent.name;
      const projectInfo = selectedProject ? SLACK_MESSAGES.PROJECT_INFO(selectedProject.name) : '';
      const placeholderMsg = await this.slackClient.postMessage({
        channel: event.channel,
        text: SLACK_MESSAGES.THINKING_WITH_AGENT(agentDisplayName, projectInfo),
        thread_ts: threadTs
      });

      console.log(`📍 Posted placeholder message: ${placeholderMsg.ts}`);
      if (selectedProject) {
        console.log(`📂 Working in project: ${selectedProject.name} (${selectedProject.dirName}) - Path: ${selectedProject.realPath || selectedProject.path}`);
      }

      // Step 3: Get Claude version configuration
      const claudeConfig = await this.getClaudeVersionConfig();

      // Step 4: Build query options with all necessary configurations
      const projectPath = selectedProject ? (selectedProject.realPath || selectedProject.path) : undefined;
      const { queryOptions } = await buildQueryOptions(
        agent,
        selectedProject?.realPath || selectedProject?.path,
        undefined, // mcpTools
        undefined, // permissionMode
        claudeConfig.model,
        claudeConfig.versionId,
        claudeConfig.env || undefined // defaultEnv
      );



      // Slack uses block-based streaming (no partial messages)
      queryOptions.includePartialMessages = false;

      // 构建配置快照用于检测配置变化
      const configSnapshot = {
        model: claudeConfig.model,
        claudeVersionId: claudeConfig.versionId,
        permissionMode: queryOptions.permissionMode,
        mcpTools: [],
        allowedTools: agent.allowedTools
          .filter((tool: any) => tool.enabled)
          .map((tool: any) => tool.name)
      };

      // Step 5: Get or create Claude session
      const sessionId = slackThreadMapper.getSessionId(threadTs, event.channel);
      let claudeSession = sessionId ? sessionManager.getSession(sessionId) : null;

      if (!claudeSession) {
        claudeSession = sessionManager.createNewSession(agentId, queryOptions, undefined, claudeConfig.versionId, claudeConfig.model, configSnapshot);
        console.log(`🆕 Created new Claude session for Slack thread: ${threadTs}`);
      } else {
        console.log(`♻️  Reusing existing Claude session: ${sessionId}`);
        
        // 检查配置是否变化
        if (sessionId && configSnapshot) {
          const configChanged = sessionManager.hasConfigChanged(sessionId, configSnapshot);
          if (configChanged) {
            console.log(`🔄 Config changed for Slack session ${sessionId}, removing old session and creating new one`);
            await sessionManager.removeSession(sessionId);
            claudeSession = sessionManager.createNewSession(agentId, queryOptions, undefined, claudeConfig.versionId, claudeConfig.model, configSnapshot);
            console.log(`🆕 Created new Claude session due to config change for Slack thread: ${threadTs}`);
          }
        }
      }

      // Step 6: Acquire session lock
      const finalSessionId = claudeSession.getClaudeSessionId() || sessionId;
      let lockAcquired = false;

      if (finalSessionId) {
        lockAcquired = await this.acquireSessionLock(
          finalSessionId,
          event,
          threadTs,
          agentId,
          placeholderMsg.ts,
          agentDisplayName
        );

        if (!lockAcquired) {
          return; // Lock acquisition failed, busy message already sent
        }
      }

      try {
        // Step 7: Process images if present
        let images: any[] = [];
        if (event.files && event.files.length > 0) {
          images = await this.processSlackFiles(event.files);

          if (images.length > 0) {
            console.log(`📸 Processed ${images.length} image(s) for Claude`);
          }
        }

        // Step 8: Build user message with images support
        const userMessage = await buildUserMessageContent(
          cleanText,
          images.length > 0 ? images : undefined,
          claudeConfig.model,
          projectPath,
          claudeConfig.versionId
        );

        // Step 9: Process Claude response with real-time updates
        const { fullResponse, toolUsageInfo, hasError } = await this.processClaudeResponse(
          claudeSession,
          userMessage,
          event,
          threadTs,
          agentId,
          selectedProject,
          placeholderMsg.ts, // Pass placeholder message timestamp for real-time updates
          configSnapshot // Pass config snapshot for session confirmation
        );

        // Step 10: Update Slack message with final response
        let finalText = fullResponse || SLACK_MESSAGES.COMPLETED;

        if (toolUsageInfo) {
          finalText += `\n\n${toolUsageInfo}`;
        }

        if (hasError) {
          finalText = SLACK_MESSAGES.ERROR_GENERIC;
        }

        await this.slackClient.updateMessage({
          channel: event.channel,
          ts: placeholderMsg.ts,
          text: finalText
        });

        console.log(`✅ Updated Slack message with AI response (${fullResponse.length} chars)`);

      } catch (error) {
        console.error('❌ Error during Claude processing:', error);

        await this.slackClient.updateMessage({
          channel: event.channel,
          ts: placeholderMsg.ts,
          text: SLACK_MESSAGES.ERROR_WITH_MESSAGE(error instanceof Error ? error.message : SLACK_MESSAGES.UNKNOWN_ERROR)
        });
      } finally {
        // Step 11: Release session lock
        if (finalSessionId && lockAcquired) {
          const released = slackSessionLock.releaseLock(finalSessionId);
          if (released) {
            console.log(`🔓 Released lock for session ${finalSessionId}`);
          } else {
            console.log(`⚠️  Failed to release lock for session ${finalSessionId}`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error handling Slack message:', error);

      // Try to send error message to Slack
      try {
        await this.slackClient.postMessage({
          channel: event.channel,
          text: SLACK_MESSAGES.ERROR_PROCESSING(error instanceof Error ? error.message : SLACK_MESSAGES.UNKNOWN_ERROR),
          thread_ts: event.thread_ts || event.ts
        });
      } catch (sendError) {
        console.error('❌ Failed to send error message to Slack:', sendError);
      }
    }
  }
}
