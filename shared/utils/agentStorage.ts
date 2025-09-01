import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentConfig, AgentSession, AgentMessage, BUILTIN_AGENTS } from '../types/agents.js';

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
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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
      const filePath = path.join(this.agentsDir, `${agentId}.json`);
      if (fs.existsSync(filePath)) {
        // Don't delete built-in agents, just disable them
        const agent = this.getAgent(agentId);
        if (agent && BUILTIN_AGENTS.some(builtin => builtin.id === agentId)) {
          agent.enabled = false;
          this.saveAgent(agent);
          return true;
        }
        
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
      createdAt: now,
      updatedAt: now
    };
    
    this.saveAgent(agent);
    return agent;
  }

  // Project tracking for agents
  addAgentProject(agentId: string, projectPath: string): void {
    const agent = this.getAgent(agentId);
    if (!agent) return;

    if (!agent.projects) {
      agent.projects = [];
    }

    const normalizedPath = path.resolve(projectPath);
    if (!agent.projects.includes(normalizedPath)) {
      agent.projects.push(normalizedPath);
      agent.updatedAt = new Date().toISOString();
      this.saveAgent(agent);
    }
  }

  getAgentProjects(agentId: string): string[] {
    const agent = this.getAgent(agentId);
    return agent?.projects || [];
  }

  removeAgentProject(agentId: string, projectPath: string): void {
    const agent = this.getAgent(agentId);
    if (!agent || !agent.projects) return;

    const normalizedPath = path.resolve(projectPath);
    const index = agent.projects.indexOf(normalizedPath);
    if (index > -1) {
      agent.projects.splice(index, 1);
      agent.updatedAt = new Date().toISOString();
      this.saveAgent(agent);
    }
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
    
    // Add current working directory to agent's projects
    this.addAgentProject(agentId, this.workingDir);
    
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
    
    this.saveSession(session);
    return newMessage;
  }
}