import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentConfig, AgentSession, AgentMessage, BUILTIN_AGENTS } from '../types/agents';
import { Options, query } from '@anthropic-ai/claude-agent-sdk';

export class AgentStorage {
  private agentsDir: string;
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    const baseDir = path.join(os.homedir(), '.claude-agent');
    this.agentsDir = path.join(baseDir, 'agents');
    this.workingDir = workingDir;
    
      // Ensure directories exist
      this.ensureDirectoriesExist();
      
      // Initialize built-in agents if not exists
      this.initializeBuiltinAgents();
  }

  private ensureDirectoriesExist(): void {
    // Ensure global agents directory exists
    if (!fs.existsSync(this.agentsDir)) {
      fs.mkdirSync(this.agentsDir, { recursive: true });
    }
  }

  private getSessionsDir(): string {
    const sessionsDir = path.join(this.workingDir, '.cc-sessions');
    // console.log('AgentStorage getSessionsDir - workingDir:', this.workingDir, 'sessionsDir:', sessionsDir);
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }
    return sessionsDir;
  }

  private initializeBuiltinAgents(): void {
    BUILTIN_AGENTS.forEach(agentTemplate => {
      const agentPath = path.join(this.agentsDir, `${agentTemplate.id}.json`);
      if (!fs.existsSync(agentPath)) {
        const now = new Date().toISOString();
        const fullAgent: AgentConfig = {
          version: '1.0.0',
          maxTurns: 25,
          permissionMode: 'acceptEdits',
          author: 'Claude Agent System',
          createdAt: now,
          updatedAt: now,
          ...agentTemplate
        } as AgentConfig;
        
        this.saveAgent(fullAgent);
      }
    });
  }

  // Agent management
  getAllAgents(): AgentConfig[] {
    const agentFiles = fs.readdirSync(this.agentsDir)
      .filter(file => file.endsWith('.json'));
    
    const agents: AgentConfig[] = [];
    for (const file of agentFiles) {
      try {
        const filePath = path.join(this.agentsDir, file);
        const agentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // Check if this is a symlink (plugin-installed agent)
        let isSymlink = false;
        let realPath = filePath;
        try {
          const stats = fs.lstatSync(filePath);
          isSymlink = stats.isSymbolicLink();
          
          if (isSymlink) {
            const linkTarget = fs.readlinkSync(filePath);
            realPath = path.isAbsolute(linkTarget) ? linkTarget : path.resolve(path.dirname(filePath), linkTarget);
          }
        } catch (error) {
          console.warn(`Failed to check if ${filePath} is symlink:`, error);
        }
        
        // Add source and installPath fields
        agentData.source = isSymlink ? 'plugin' : 'local';
        if (isSymlink) {
          agentData.installPath = realPath;
        }
        
        agents.push(agentData);
      } catch (error) {
        console.error(`Failed to read agent file ${file}:`, error);
      }
    }
    
    return agents.sort((a, b) => a.name.localeCompare(b.name));
  }

  getAgent(agentId: string): AgentConfig | null {
    try {
      const filePath = path.join(this.agentsDir, `${agentId}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const agentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Check if this is a symlink (plugin-installed agent)
      let isSymlink = false;
      let realPath = filePath;
      try {
        const stats = fs.lstatSync(filePath);
        isSymlink = stats.isSymbolicLink();
        
        if (isSymlink) {
          const linkTarget = fs.readlinkSync(filePath);
          realPath = path.isAbsolute(linkTarget) ? linkTarget : path.resolve(path.dirname(filePath), linkTarget);
        }
      } catch (error) {
        console.warn(`Failed to check if ${filePath} is symlink:`, error);
      }
      
      // Add source and installPath fields
      agentData.source = isSymlink ? 'plugin' : 'local';
      if (isSymlink) {
        agentData.installPath = realPath;
      }
      
      return agentData;
    } catch (error) {
      console.error(`Failed to read agent ${agentId}:`, error);
      return null;
    }
  }

  saveAgent(agent: AgentConfig): void {
    try {
      agent.updatedAt = new Date().toISOString();
      const filePath = path.join(this.agentsDir, `${agent.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(agent, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save agent ${agent.id}:`, error);
      throw error;
    }
  }

  deleteAgent(agentId: string): boolean {
    try {
      console.log(`🗑️ [BACKEND DEBUG] Attempting to delete agent: ${agentId}`);
      const filePath = path.join(this.agentsDir, `${agentId}.json`);
      console.log(`🗑️ [BACKEND DEBUG] File path: ${filePath}, exists: ${fs.existsSync(filePath)}`);
      
      if (fs.existsSync(filePath)) {
        // Don't delete built-in agents, just disable them
        const agent = this.getAgent(agentId);
        console.log(`🗑️ [BACKEND DEBUG] Agent data:`, {
          found: !!agent,
          id: agent?.id,
          name: agent?.name,
          enabled: agent?.enabled
        });
        
        if (agent && BUILTIN_AGENTS.some(builtin => builtin.id === agentId)) {
          // Allow deletion of deprecated built-in agents (code-assistant, document-writer)
          const DEPRECATED_BUILTINS = ['code-assistant', 'document-writer'];
          if (DEPRECATED_BUILTINS.includes(agentId)) {
            console.log(`✅ [BACKEND DEBUG] Deleting deprecated built-in agent: ${agentId}`);
          } else {
            // Protect current built-in agents (ppt-editor, general-chat, claude-code)
            console.log(`🛑 [BACKEND DEBUG] Protected built-in agent, disabling instead: ${agentId}`);
            agent.enabled = false;
            this.saveAgent(agent);
            return true;
          }
        }
        
        console.log(`🗑️ [BACKEND DEBUG] Deleting file: ${filePath}`);
        fs.unlinkSync(filePath);
        
        // Also delete all sessions for this agent
        this.deleteAgentSessions(agentId);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete agent ${agentId}:`, error);
      return false;
    }
  }

  createAgent(agentData: Omit<AgentConfig, 'createdAt' | 'updatedAt'>): AgentConfig {
    const now = new Date().toISOString();
    const agent: AgentConfig = {
      ...agentData,
      source: 'local', // Created agents are always local
      createdAt: now,
      updatedAt: now
    };
    
    this.saveAgent(agent);
    return agent;
  }


  // Session management
  getAgentSessionsDir(agentId: string): string {
    const dir = path.join(this.getSessionsDir(), agentId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  getAgentSessions(agentId: string, searchTerm?: string): AgentSession[] {
    const sessionsDir = this.getAgentSessionsDir(agentId);
    const sessionFiles = fs.readdirSync(sessionsDir)
      .filter(file => file.endsWith('.json'));
    
    const sessions: AgentSession[] = [];
    for (const file of sessionFiles) {
      try {
        const filePath = path.join(sessionsDir, file);
        const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        sessions.push(sessionData);
      } catch (error) {
        console.error(`Failed to read session file ${file}:`, error);
      }
    }
    
    let filteredSessions = sessions;
    
    // Filter by search term if provided
    if (searchTerm && searchTerm.trim()) {
      const searchTermLower = searchTerm.trim().toLowerCase();
      filteredSessions = sessions.filter(session => {
        if (session.title.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        return session.messages.some(message => {
          if (message.content && message.content.toLowerCase().includes(searchTermLower)) {
            return true;
          }
          
          if (message.messageParts) {
            return message.messageParts.some(part => {
              if (part.type === 'text' && part.content && part.content.toLowerCase().includes(searchTermLower)) {
                return true;
              }
              if (part.type === 'tool' && part.toolData) {
                if (part.toolData.toolName.toLowerCase().includes(searchTermLower)) {
                  return true;
                }
                const inputStr = JSON.stringify(part.toolData.toolInput).toLowerCase();
                if (inputStr.includes(searchTermLower)) {
                  return true;
                }
              }
              return false;
            });
          }
          
          return false;
        });
      });
    }
    
    return filteredSessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  getSession(agentId: string, sessionId: string): AgentSession | null {
    try {
      const sessionsDir = this.getAgentSessionsDir(agentId);
      const filePath = path.join(sessionsDir, `${sessionId}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.error(`Failed to read session ${sessionId} for agent ${agentId}:`, error);
      return null;
    }
  }

  createSession(agentId: string, title?: string): AgentSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const agent = this.getAgent(agentId);
    
    const session: AgentSession = {
      id: sessionId,
      agentId,
      title: title || `${agent?.name || 'Agent'} 会话 ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      messages: []
    };
    
    this.saveSession(session);
    return session;
  }

  createSessionWithId(agentId: string, sessionId: string, title?: string): AgentSession {
    const agent = this.getAgent(agentId);
    
    const session: AgentSession = {
      id: sessionId, // Use AI-provided session_id
      agentId,
      title: title || `${agent?.name || 'Agent'} 会话 ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      messages: []
      // claudeSessionId will be set when AI returns it in init message
    };
    
    this.saveSession(session);
    return session;
  }

  saveSession(session: AgentSession): void {
    try {
      const sessionsDir = this.getAgentSessionsDir(session.agentId);
      const filePath = path.join(sessionsDir, `${session.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save session ${session.id}:`, error);
      throw error;
    }
  }

  deleteSession(agentId: string, sessionId: string): boolean {
    try {
      const sessionsDir = this.getAgentSessionsDir(agentId);
      const filePath = path.join(sessionsDir, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
      return false;
    }
  }

  deleteAgentSessions(agentId: string): void {
    try {
      const sessionsDir = this.getAgentSessionsDir(agentId);
      const sessionFiles = fs.readdirSync(sessionsDir);
      for (const file of sessionFiles) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(sessionsDir, file));
        }
      }
    } catch (error) {
      console.error(`Failed to delete sessions for agent ${agentId}:`, error);
    }
  }

  // Helper method to check if session title should be updated
  private shouldUpdateTitle(title: string): boolean {
    return title.includes('会话') && title.includes(new Date().toLocaleString().split(' ')[0]);
  }

  // Generate intelligent session title based on first user message using Claude Code SDK
  private async updateSessionTitle(session: AgentSession): Promise<void> {
    // Only update if it's still the default title
    if (!this.shouldUpdateTitle(session.title)) {
      return;
    }
    
    // Find the first user message
    const firstUserMessage = session.messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) {
      return;
    }

    let userQuestion = '';
    
    // Extract text content from the message
    if (firstUserMessage.content) {
      userQuestion = firstUserMessage.content;
    } else if (firstUserMessage.messageParts) {
      userQuestion = firstUserMessage.messageParts
        .filter(part => part.type === 'text')
        .map(part => part.content)
        .join(' ');
    }

    if (userQuestion) {
      try {
        // Use Claude Code SDK to generate a concise title
        
        const titlePrompt = `请为以下用户问题生成一个简洁的标题（不超过25个字符），用于会话列表显示：

用户问题：${userQuestion}

要求：
1. 提取问题的核心要点
2. 使用简洁明了的中文
3. 不超过25个字符
4. 不需要引号或其他标点符号
5. 直接输出标题内容，不要任何前缀或后缀`;

        const queryOptions: Options = {
          systemPrompt: "你是一个专门生成简洁标题的助手。请直接输出标题内容，不要任何解释或格式化。",
          allowedTools: [],  // No tools needed for title generation
          maxTurns: 1,
          cwd: process.cwd()
        };

        let generatedTitle = '';
        
        for await (const sdkMessage of query({
          prompt: titlePrompt,
          options: queryOptions
        })) {
          if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
            for (const block of sdkMessage.message.content) {
              if (block.type === 'text') {
                generatedTitle += block.text;
              }
            }
          }
        }
        
        if (generatedTitle.trim()) {
          // Clean the generated title
          let cleanTitle = generatedTitle.trim()
            .replace(/^["'"']|["'"']$/g, '') // Remove quotes
            .replace(/\n/g, ' ') // Replace newlines
            .replace(/\s+/g, ' '); // Collapse spaces
          
          // Ensure it's not too long
          if (cleanTitle.length > 30) {
            cleanTitle = cleanTitle.substring(0, 27) + '...';
          }
          
          session.title = cleanTitle;
          console.log(`Generated title for session ${session.id}: "${cleanTitle}"`);
        } else {
          // Fallback to simple truncation if AI generation fails
          this.fallbackTitleGeneration(session, userQuestion);
        }
      } catch (error) {
        console.error('Failed to update session title with Claude SDK:', error);
        // Fallback to simple truncation
        this.fallbackTitleGeneration(session, userQuestion);
      }
    }
  }

  // Fallback title generation when Claude SDK fails
  private fallbackTitleGeneration(session: AgentSession, userQuestion: string): void {
    let fallbackTitle = userQuestion.trim()
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 25);
    
    // Take first sentence if it's reasonable
    const firstSentence = fallbackTitle.split(/[.!?。！？]/)[0];
    if (firstSentence.length > 8 && firstSentence.length < 25) {
      fallbackTitle = firstSentence;
    }
    
    if (fallbackTitle.length > 22) {
      fallbackTitle = fallbackTitle.substring(0, 22) + '...';
    }
    
    session.title = fallbackTitle;
    console.log(`Fallback title for session ${session.id}: "${fallbackTitle}"`);
  }

  addMessageToSession(agentId: string, sessionId: string, message: Omit<AgentMessage, 'id' | 'timestamp' | 'agentId'>): AgentMessage | null {
    const session = this.getSession(agentId, sessionId);
    if (!session) {
      return null;
    }

    const newMessage: AgentMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      messageParts: message.messageParts || [],
      agentId
    };

    session.messages.push(newMessage);
    session.lastUpdated = Date.now();
    
    // Save session first, then update title asynchronously
    this.saveSession(session);
    
    // Update session title based on first user message (async, doesn't block)
    if (message.role === 'user' && this.shouldUpdateTitle(session.title)) {
      this.updateSessionTitle(session).then(() => {
        // Save again after title is updated
        this.saveSession(session);
        console.log(`Session title updated to: "${session.title}"`);
      }).catch(err => {
        console.error('Failed to update session title:', err);
      });
    }
    
    return newMessage;
  }
}