import { AgentConfig, AgentSession } from '../types/agents.js';
export declare class AgentStorage {
    private agentsDir;
    private sessionsDir;
    constructor();
    private ensureDirectoriesExist;
    private initializeBuiltinAgents;
    getAllAgents(): AgentConfig[];
    getAgent(agentId: string): AgentConfig | null;
    saveAgent(agent: AgentConfig): void;
    deleteAgent(agentId: string): boolean;
    createAgent(agentData: Omit<AgentConfig, 'createdAt' | 'updatedAt'>): AgentConfig;
    getAgentSessionsDir(agentId: string): string;
    getAgentSessions(agentId: string, searchTerm?: string): AgentSession[];
    getSession(agentId: string, sessionId: string): AgentSession | null;
    createSession(agentId: string, title?: string): AgentSession;
    saveSession(session: AgentSession): void;
    deleteSession(agentId: string, sessionId: string): boolean;
    deleteAgentSessions(agentId: string): void;
    addMessageToSession(agentId: string, sessionId: string, message: Omit<AgentMessage, 'id' | 'timestamp' | 'agentId'>): AgentMessage | null;
}
//# sourceMappingURL=agentStorage.d.ts.map