export const COMMAND_SCOPES = [
    { value: 'project', label: '项目命令', description: '存储在项目中，与团队共享' },
    { value: 'user', label: '个人命令', description: '存储在用户配置中，仅个人使用' }
];
export const DEFAULT_MODELS = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229'
];
export const COMMON_TOOLS = [
    'Read',
    'Write',
    'Edit',
    'Bash',
    'Grep',
    'Glob',
    'WebFetch',
    'WebSearch'
];
//# sourceMappingURL=commands.js.map