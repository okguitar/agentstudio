// Claude Code 工具调用的类型定义

export interface BaseToolInput {
  [key: string]: unknown;
}

export interface BaseToolResult {
  content?: string;
  is_error?: boolean;
  tool_use_id: string;
}

// 具体工具的输入类型
export interface TaskToolInput extends BaseToolInput {
  description: string;
  prompt: string;
}

export interface BashToolInput extends BaseToolInput {
  command: string;
  description?: string;
  timeout?: number;
}

export interface GlobToolInput extends BaseToolInput {
  pattern: string;
  path?: string;
}

export interface GrepToolInput extends BaseToolInput {
  pattern: string;
  path?: string;
  glob?: string;
  type?: string;
  output_mode?: 'content' | 'files_with_matches' | 'count';
  '-i'?: boolean;
  '-n'?: boolean;
  '-A'?: number;
  '-B'?: number;
  '-C'?: number;
  head_limit?: number;
  multiline?: boolean;
}

export interface LSToolInput extends BaseToolInput {
  path: string;
  ignore?: string[];
}

export interface ExitPlanModeToolInput extends BaseToolInput {
  plan: string;
}

export interface ReadToolInput extends BaseToolInput {
  file_path: string;
  limit?: number;
  offset?: number;
}

export interface EditToolInput extends BaseToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface StructuredPatch {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface EditToolResult {
  filePath: string;
  oldString: string;
  newString: string;
  originalFile: string;
  structuredPatch: StructuredPatch[];
  userModified: boolean;
  replaceAll: boolean;
}

export interface MultiEditToolInput extends BaseToolInput {
  file_path: string;
  edits: Array<{
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  }>;
}

export interface WriteToolInput extends BaseToolInput {
  file_path: string;
  content: string;
}

export interface NotebookReadToolInput extends BaseToolInput {
  notebook_path: string;
  cell_id?: string;
}

export interface NotebookEditToolInput extends BaseToolInput {
  notebook_path: string;
  new_source: string;
  cell_id?: string;
  cell_type?: 'code' | 'markdown';
  edit_mode?: 'replace' | 'insert' | 'delete';
}

export interface WebFetchToolInput extends BaseToolInput {
  url: string;
  prompt: string;
}

export interface TodoWriteToolInput extends BaseToolInput {
  todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'high' | 'medium' | 'low';
    id: string;
  }>;
}

export interface WebSearchToolInput extends BaseToolInput {
  query: string;
  allowed_domains?: string[];
  blocked_domains?: string[];
}

// 工具执行状态
export interface ToolExecution {
  id: string;
  toolName: string;
  toolInput: BaseToolInput;
  toolResult?: string;
  toolUseResult?: EditToolResult | any; // 包含 structuredPatch 等详细信息
  isExecuting: boolean;
  isError?: boolean;
  timestamp: Date;
}