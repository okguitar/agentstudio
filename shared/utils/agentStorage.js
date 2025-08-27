import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BUILTIN_AGENTS } from '../types/agents.js';
export class AgentStorage {
    agentsDir;
    sessionsDir;
    constructor() {
        const baseDir = path.join(os.homedir(), '.claude-agent');
        this.agentsDir = path.join(baseDir, 'agents');
        this.sessionsDir = path.join(baseDir, 'sessions');
        // Ensure directories exist
        this.ensureDirectoriesExist();
        // Initialize built-in agents if not exists
        this.initializeBuiltinAgents();
    }
    ensureDirectoriesExist() {
        [this.agentsDir, this.sessionsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    initializeBuiltinAgents() {
        BUILTIN_AGENTS.forEach(agentTemplate => {
            const agentPath = path.join(this.agentsDir, `${agentTemplate.id}.json`);
            if (!fs.existsSync(agentPath)) {
                const now = new Date().toISOString();
                const fullAgent = {
                    version: '1.0.0',
                    maxTurns: 25,
                    permissionMode: 'acceptEdits',
                    author: 'Claude Agent System',
                    createdAt: now,
                    updatedAt: now,
                    ...agentTemplate
                };
                this.saveAgent(fullAgent);
            }
        });
    }
    // Agent management
    getAllAgents() {
        const agentFiles = fs.readdirSync(this.agentsDir)
            .filter(file => file.endsWith('.json'));
        const agents = [];
        for (const file of agentFiles) {
            try {
                const filePath = path.join(this.agentsDir, file);
                const agentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                agents.push(agentData);
            }
            catch (error) {
                console.error(`Failed to read agent file ${file}:`, error);
            }
        }
        return agents.sort((a, b) => a.name.localeCompare(b.name));
    }
    getAgent(agentId) {
        try {
            const filePath = path.join(this.agentsDir, `${agentId}.json`);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
        catch (error) {
            console.error(`Failed to read agent ${agentId}:`, error);
            return null;
        }
    }
    saveAgent(agent) {
        try {
            agent.updatedAt = new Date().toISOString();
            const filePath = path.join(this.agentsDir, `${agent.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(agent, null, 2), 'utf-8');
        }
        catch (error) {
            console.error(`Failed to save agent ${agent.id}:`, error);
            throw error;
        }
    }
    deleteAgent(agentId) {
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
        }
        catch (error) {
            console.error(`Failed to delete agent ${agentId}:`, error);
            return false;
        }
    }
    createAgent(agentData) {
        const now = new Date().toISOString();
        const agent = {
            ...agentData,
            createdAt: now,
            updatedAt: now
        };
        this.saveAgent(agent);
        return agent;
    }
    // Session management
    getAgentSessionsDir(agentId) {
        const dir = path.join(this.sessionsDir, agentId);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }
    getAgentSessions(agentId, searchTerm) {
        const sessionsDir = this.getAgentSessionsDir(agentId);
        const sessionFiles = fs.readdirSync(sessionsDir)
            .filter(file => file.endsWith('.json'));
        const sessions = [];
        for (const file of sessionFiles) {
            try {
                const filePath = path.join(sessionsDir, file);
                const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                sessions.push(sessionData);
            }
            catch (error) {
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
    getSession(agentId, sessionId) {
        try {
            const sessionsDir = this.getAgentSessionsDir(agentId);
            const filePath = path.join(sessionsDir, `${sessionId}.json`);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
        catch (error) {
            console.error(`Failed to read session ${sessionId} for agent ${agentId}:`, error);
            return null;
        }
    }
    createSession(agentId, title) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const agent = this.getAgent(agentId);
        const session = {
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
    saveSession(session) {
        try {
            const sessionsDir = this.getAgentSessionsDir(session.agentId);
            const filePath = path.join(sessionsDir, `${session.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
        }
        catch (error) {
            console.error(`Failed to save session ${session.id}:`, error);
            throw error;
        }
    }
    deleteSession(agentId, sessionId) {
        try {
            const sessionsDir = this.getAgentSessionsDir(agentId);
            const filePath = path.join(sessionsDir, `${sessionId}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error(`Failed to delete session ${sessionId}:`, error);
            return false;
        }
    }
    deleteAgentSessions(agentId) {
        try {
            const sessionsDir = this.getAgentSessionsDir(agentId);
            const sessionFiles = fs.readdirSync(sessionsDir);
            for (const file of sessionFiles) {
                if (file.endsWith('.json')) {
                    fs.unlinkSync(path.join(sessionsDir, file));
                }
            }
        }
        catch (error) {
            console.error(`Failed to delete sessions for agent ${agentId}:`, error);
        }
    }
    addMessageToSession(agentId, sessionId, message) {
        const session = this.getSession(agentId, sessionId);
        if (!session) {
            return null;
        }
        const newMessage = {
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
//# sourceMappingURL=agentStorage.js.map