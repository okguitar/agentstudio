export interface Subagent {
    id: string;
    name: string;
    description: string;
    content: string;
    scope: 'user';
    tools?: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface SubagentCreate {
    name: string;
    description: string;
    content: string;
    scope: 'user';
    tools?: string[];
}
export interface SubagentUpdate {
    description?: string;
    content?: string;
    tools?: string[];
}
export interface SubagentFilter {
    search?: string;
}
//# sourceMappingURL=subagents.d.ts.map