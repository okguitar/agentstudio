// 模型配置类型
export interface ModelConfig {
  id: string; // 模型ID，如 'sonnet', 'opus', 'haiku'
  name: string; // 显示名称
  isVision: boolean; // 是否支持视觉功能
  description?: string; // 模型描述
}

export interface ClaudeVersion {
  id: string;
  name: string;
  alias: string;
  description?: string;
  executablePath?: string;
  isDefault: boolean;
  isSystem: boolean;
  environmentVariables?: Record<string, string>;
  models: ModelConfig[]; // 该版本支持的模型列表
  createdAt: string;
  updatedAt: string;
}

export interface ClaudeVersionCreate {
  name: string;
  alias: string;
  description?: string;
  executablePath?: string;
  environmentVariables?: Record<string, string>;
  models?: ModelConfig[]; // 可选的模型列表，如果不提供则使用默认模型
}

export interface ClaudeVersionUpdate {
  name?: string;
  alias?: string;
  description?: string;
  executablePath?: string;
  environmentVariables?: Record<string, string>;
  models?: ModelConfig[]; // 可选的模型列表更新
  authTokenChanged?: boolean; // 标记ANTHROPIC_AUTH_TOKEN是否被修改
}

export interface ClaudeVersionResponse {
  versions: ClaudeVersion[];
  defaultVersionId: string | null;
}
