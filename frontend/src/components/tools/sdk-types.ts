/**
 * 类型桥接层：连接 Claude Agent SDK 原生类型与项目特定需求
 *
 * 这个文件提供了与 @anthropic-ai/claude-agent-sdk 兼容的类型定义，
 * 同时保留了项目特有的扩展功能。
 */

// 导入 SDK 原生类型
import type {
  ToolInputSchemas,
  AgentInput,
  BashInput,
  BashOutputInput,
  ExitPlanModeInput,
  FileEditInput,
  FileReadInput,
  FileWriteInput,
  GlobInput,
  GrepInput,
  KillShellInput,
  ListMcpResourcesInput,
  McpInput,
  NotebookEditInput,
  ReadMcpResourceInput,
  TimeMachineInput,
  TodoWriteInput,
  WebFetchInput,
  WebSearchInput,
  AskUserQuestionInput
} from '@anthropic-ai/claude-agent-sdk/sdk-tools';

// 重新导出所有 SDK 类型，方便统一导入
export type {
  ToolInputSchemas,
  AgentInput,
  BashInput,
  BashOutputInput,
  ExitPlanModeInput,
  FileEditInput,
  FileReadInput,
  FileWriteInput,
  GlobInput,
  GrepInput,
  KillShellInput,
  ListMcpResourcesInput,
  McpInput,
  NotebookEditInput,
  ReadMcpResourceInput,
  TimeMachineInput,
  TodoWriteInput,
  WebFetchInput,
  WebSearchInput,
  AskUserQuestionInput
};

// 项目特定的基础接口
export interface BaseToolResult {
  content?: string;
  is_error?: boolean;
  tool_use_id: string;
}

// 项目特定的扩展类型
export interface BaseToolExecution {
  id: string;
  toolName: string;
  toolInput: ToolInputSchemas | MultiEditInput | LSToolInput | NotebookReadToolInput;
  toolResult?: string;
  toolUseResult?: EditToolResult | any;
  isExecuting: boolean;
  isError?: boolean;
  isInterrupted?: boolean;
  timestamp: Date;
}

// 项目特有的工具类型（SDK 中没有的）
export interface MultiEditInput {
  file_path: string;
  edits: Array<{
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  }>;
}

export interface LSToolInput {
  path: string;
  ignore?: string[];
}

export interface NotebookReadToolInput {
  notebook_path: string;
  cell_id?: string;
}

// 工具输入联合类型，包含所有可能的工具输入类型
export type AllToolInputs = ToolInputSchemas | MultiEditInput | LSToolInput | NotebookReadToolInput;

// 扩展 SDK 类型以添加项目特定功能
export interface ExtendedBashInput extends BashInput {
  // 保留项目特定的扩展字段
  enhancedDescription?: string;
  projectMetadata?: {
    sessionId?: string;
    projectId?: string;
  };
}

export interface ExtendedBashOutputInput extends BashOutputInput {
  // 添加项目特有的输出处理字段
  realTimeUpdates?: boolean;
}

export interface ExtendedGrepInput extends GrepInput {
  // 项目特定的搜索增强功能
  contextLines?: number;
  highlightMatches?: boolean;
}

// 工具执行结果类型（项目特有）
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

// Bash 工具特有的结果类型
export interface BashOutputToolResult {
  shellId: string;
  command: string;
  status: 'running' | 'completed' | 'killed' | 'failed';
  exitCode: number | null;
  stdout: string;
  stderr: string;
  stdoutLines: number;
  stderrLines: number;
  timestamp: string;
  filterPattern?: string;
}

// 类型守卫函数
export function isBashInput(input: unknown): input is BashInput {
  return typeof input === 'object' && input !== null && 'command' in input;
}

// 安全类型断言函数，用于工具组件
export function assertToolType<T>(input: unknown, validator: (i: unknown) => i is T): T {
  if (validator(input)) {
    return input;
  }
  // 如果验证失败，返回 unknown 类型进行强制转换
  return input as T;
}

export function isFileEditInput(input: unknown): input is FileEditInput {
  return typeof input === 'object' && input !== null &&
         'file_path' in input && 'old_string' in input && 'new_string' in input;
}

export function isFileWriteInput(input: unknown): input is FileWriteInput {
  return typeof input === 'object' && input !== null &&
         'file_path' in input && 'content' in input;
}

export function isGrepInput(input: unknown): input is GrepInput {
  return typeof input === 'object' && input !== null && 'pattern' in input;
}

export function isGlobInput(input: unknown): input is GlobInput {
  return typeof input === 'object' && input !== null && 'pattern' in input;
}

export function isWebFetchInput(input: unknown): input is WebFetchInput {
  return typeof input === 'object' && input !== null &&
         'url' in input && 'prompt' in input;
}

export function isWebSearchInput(input: unknown): input is WebSearchInput {
  return typeof input === 'object' && input !== null && 'query' in input;
}

export function isTodoWriteInput(input: unknown): input is TodoWriteInput {
  return typeof input === 'object' && input !== null && 'todos' in input;
}

export function isAgentInput(input: unknown): input is AgentInput {
  return typeof input === 'object' && input !== null &&
         'description' in input && 'prompt' in input && 'subagent_type' in input;
}

// 项目特有的工具类型守卫
export function isMultiEditInput(input: unknown): input is MultiEditInput {
  return typeof input === 'object' && input !== null &&
         'file_path' in input && 'edits' in input && Array.isArray(input.edits);
}

export function isLSToolInput(input: unknown): input is LSToolInput {
  return typeof input === 'object' && input !== null && 'path' in input;
}

export function isNotebookReadToolInput(input: unknown): input is NotebookReadToolInput {
  return typeof input === 'object' && input !== null && 'notebook_path' in input;
}

// 新增 SDK 工具类型的类型守卫
export function isListMcpResourcesInput(input: unknown): input is ListMcpResourcesInput {
  return typeof input === 'object' && input !== null;
}

export function isTimeMachineInput(input: unknown): input is TimeMachineInput {
  return typeof input === 'object' && input !== null &&
         'message_prefix' in input && 'course_correction' in input;
}

export function isAskUserQuestionInput(input: unknown): input is AskUserQuestionInput {
  return typeof input === 'object' && input !== null && 'questions' in input && Array.isArray(input.questions);
}

// 工具名称到类型的映射
export interface ToolTypeMap {
  Task: AgentInput;
  Bash: BashInput;
  BashOutput: BashOutputInput;
  KillBash: KillShellInput;
  Glob: GlobInput;
  Grep: GrepInput;
  LS: GlobInput; // LS 是 Glob 的简化版本
  exit_plan_mode: ExitPlanModeInput;
  Read: FileReadInput;
  Edit: FileEditInput;
  MultiEdit: FileEditInput; // MultiEdit 是 FileEdit 的扩展版本
  Write: FileWriteInput;
  NotebookRead: NotebookReadToolInput; // 项目特有的 notebook 读取工具
  NotebookEdit: NotebookEditInput;
  ListMcpResources: ListMcpResourcesInput; // 新增：列出 MCP 资源
  ReadMcpResource: ReadMcpResourceInput; // 新增：读取 MCP 资源
  TimeMachine: TimeMachineInput; // 新增：时间机器工具
  AskUserQuestion: AskUserQuestionInput; // 新增：用户问题询问工具
  WebFetch: WebFetchInput;
  TodoWrite: TodoWriteInput;
  WebSearch: WebSearchInput;
}

// 动态工具类型解析函数
export function resolveToolType(toolName: string): keyof ToolTypeMap | null {
  const toolMap: Record<string, keyof ToolTypeMap> = {
    'Task': 'Task',
    'Bash': 'Bash',
    'BashOutput': 'BashOutput',
    'KillBash': 'KillBash',
    'Glob': 'Glob',
    'Grep': 'Grep',
    'LS': 'LS',
    'exit_plan_mode': 'exit_plan_mode',
    'Read': 'Read',
    'Edit': 'Edit',
    'MultiEdit': 'MultiEdit',
    'Write': 'Write',
    'NotebookRead': 'NotebookRead',
    'NotebookEdit': 'NotebookEdit',
    'ListMcpResources': 'ListMcpResources',
    'ReadMcpResource': 'ReadMcpResource',
    'TimeMachine': 'TimeMachine',
    'AskUserQuestion': 'AskUserQuestion',
    'WebFetch': 'WebFetch',
    'TodoWrite': 'TodoWrite',
    'WebSearch': 'WebSearch'
  };

  return toolMap[toolName] || null;
}

// 工具输入类型验证函数
export function validateToolInput(toolName: string, input: unknown): boolean {
  const toolType = resolveToolType(toolName);
  if (!toolType) return false;

  switch (toolType) {
    case 'Task':
      return isAgentInput(input);
    case 'Bash':
      return isBashInput(input);
    case 'BashOutput':
      return typeof input === 'object' && input !== null && 'bash_id' in input;
    case 'KillBash':
      return typeof input === 'object' && input !== null && 'shell_id' in input;
    case 'Glob':
      return isGlobInput(input);
    case 'Grep':
      return isGrepInput(input);
    case 'LS':
      return isGlobInput(input);
    case 'exit_plan_mode':
      return typeof input === 'object' && input !== null && 'plan' in input;
    case 'Read':
      return typeof input === 'object' && input !== null && 'file_path' in input;
    case 'Edit':
    case 'MultiEdit':
      return isFileEditInput(input);
    case 'Write':
      return isFileWriteInput(input);
    case 'NotebookRead':
      return typeof input === 'object' && input !== null && 'server' in input && 'uri' in input;
    case 'NotebookEdit':
      return typeof input === 'object' && input !== null && 'notebook_path' in input && 'new_source' in input;
    case 'WebFetch':
      return isWebFetchInput(input);
    case 'TodoWrite':
      return isTodoWriteInput(input);
    case 'WebSearch':
      return isWebSearchInput(input);
    default:
      return false;
  }
}