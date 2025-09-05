export interface SlashCommand {
    id: string;
    name: string;
    description: string;
    content: string;
    scope: 'project' | 'user';
    namespace?: string;
    argumentHint?: string;
    allowedTools?: string[];
    model?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface SlashCommandCreate {
    name: string;
    description: string;
    content: string;
    scope: 'project' | 'user';
    namespace?: string;
    argumentHint?: string;
    allowedTools?: string[];
    model?: string;
}
export interface SlashCommandUpdate {
    description?: string;
    content?: string;
    argumentHint?: string;
    allowedTools?: string[];
    model?: string;
    namespace?: string;
}
export interface SlashCommandFilter {
    scope?: 'project' | 'user' | 'all';
    namespace?: string;
    search?: string;
}
export declare const COMMAND_SCOPES: readonly [{
    readonly value: "project";
    readonly label: "项目命令";
    readonly description: "存储在项目中，与团队共享";
}, {
    readonly value: "user";
    readonly label: "个人命令";
    readonly description: "存储在用户配置中，仅个人使用";
}];
export declare const DEFAULT_MODELS: readonly ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"];
export declare const COMMON_TOOLS: readonly ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "WebFetch", "WebSearch"];
//# sourceMappingURL=commands.d.ts.map