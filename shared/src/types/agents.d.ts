export interface AgentTool {
    name: string;
    enabled: boolean;
    permissions?: {
        requireConfirmation?: boolean;
        allowedPaths?: string[];
        blockedPaths?: string[];
    };
}
export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    version: string;
    systemPrompt: string;
    maxTurns: number;
    permissionMode: 'ask' | 'acceptEdits' | 'acceptAll';
    allowedTools: AgentTool[];
    ui: {
        icon: string;
        primaryColor: string;
        headerTitle: string;
        headerDescription: string;
        componentType: 'slides' | 'chat' | 'documents' | 'code' | 'custom';
        customComponent?: string;
    };
    workingDirectory?: string;
    dataDirectory?: string;
    fileTypes?: string[];
    author: string;
    homepage?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
}
export interface AgentSession {
    id: string;
    agentId: string;
    title: string;
    createdAt: number;
    lastUpdated: number;
    messages: AgentMessage[];
    claudeSessionId?: string | null;
    customData?: Record<string, unknown>;
}
export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    messageParts?: MessagePart[];
    agentId: string;
}
export interface MessagePart {
    id: string;
    type: 'text' | 'tool';
    content?: string;
    toolData?: {
        id: string;
        toolName: string;
        toolInput: Record<string, unknown>;
        toolResult?: string;
        isExecuting: boolean;
        isError?: boolean;
    };
    order: number;
}
export declare const BUILTIN_AGENTS: Partial<AgentConfig>[];
//# sourceMappingURL=agents.d.ts.map