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
  source: 'local' | 'plugin'; // 来源：本地创建或插件安装
  installPath?: string; // 插件命令的真实安装路径
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

export const COMMAND_SCOPES = [
  { value: 'project', label: '项目命令', description: '存储在项目中，与团队共享' },
  { value: 'user', label: '个人命令', description: '存储在用户配置中，仅个人使用' }
] as const;

export const DEFAULT_MODELS = [
  'sonnet',
  'haiku',
  'opus'
] as const;

export const COMMON_TOOLS = [
  'Read',
  'Write', 
  'Edit',
  'Bash',
  'Grep',
  'Glob',
  'WebFetch',
  'WebSearch'
] as const;