export interface ClaudeVersion {
  id: string;
  name: string;
  alias: string;
  description?: string;
  executablePath: string;
  isDefault: boolean;
  isSystem: boolean;
  environmentVariables?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ClaudeVersionCreate {
  name: string;
  alias: string;
  description?: string;
  executablePath: string;
  environmentVariables?: Record<string, string>;
}

export interface ClaudeVersionUpdate {
  name?: string;
  alias?: string;
  description?: string;
  executablePath?: string;
  environmentVariables?: Record<string, string>;
}

export interface ClaudeVersionResponse {
  versions: ClaudeVersion[];
  defaultVersionId: string | null;
}
