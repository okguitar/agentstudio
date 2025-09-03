// 工具名称映射配置
export const TOOL_DISPLAY_MAP = {
  // 文件操作
  'Bash': '终端命令',
  'Edit': '文件编辑', 
  'MultiEdit': '多文件编辑',
  'Read': '读取文件',
  'Write': '写入文件',
  'LS': '目录列表',
  
  // 搜索工具
  'Glob': '文件搜索',
  'Grep': '文本搜索',
  
  // 笔记本工具
  'NotebookRead': '笔记本读取',
  'NotebookEdit': '笔记本编辑',
  
  // 网络工具
  'WebFetch': '网页获取',
  'WebSearch': '网络搜索',
  
  // 任务管理
  'TodoWrite': '任务管理',
  'Task': '任务执行',
  
  // 传统工具名（兼容性）
  'read_file': '读取文件',
  'write': '写入文件', 
  'search_replace': '搜索替换',
  'run_terminal_cmd': '终端命令',
  'grep': '文本搜索',
  'glob_file_search': '文件搜索',
  'codebase_search': '代码搜索',
  'web_search': '网络搜索',
  'create_diagram': '创建图表'
} as const;

// 工具描述映射
export const TOOL_DESCRIPTION_MAP = {
  'Bash': '执行命令行操作',
  'Edit': '编辑文件内容',
  'MultiEdit': '批量编辑多个文件',
  'Read': '读取文件内容',
  'Write': '创建或覆盖文件',
  'LS': '列出目录内容',
  'Glob': '使用通配符搜索文件',
  'Grep': '在文件中搜索文本',
  'NotebookRead': '读取Jupyter笔记本',
  'NotebookEdit': '编辑Jupyter笔记本',
  'WebFetch': '获取网页内容',
  'WebSearch': '搜索网络信息',
  'TodoWrite': '创建和管理待办事项',
  'Task': '执行复杂任务',
  
  // 传统工具名（兼容性）
  'read_file': '读取文件内容',
  'write': '创建或覆盖文件',
  'search_replace': '在文件中搜索和替换文本',
  'run_terminal_cmd': '执行命令行操作',
  'grep': '在文件中搜索文本',
  'glob_file_search': '使用通配符搜索文件',
  'codebase_search': '在代码库中搜索',
  'web_search': '搜索网络信息',
  'create_diagram': '创建和生成图表'
} as const;

/**
 * 获取工具的显示名称
 * @param toolName 工具的原始名称
 * @returns 工具的显示名称，如果没有映射则返回原始名称
 */
export function getToolDisplayName(toolName: string): string {
  return TOOL_DISPLAY_MAP[toolName as keyof typeof TOOL_DISPLAY_MAP] || toolName;
}

/**
 * 获取工具的描述
 * @param toolName 工具的原始名称
 * @returns 工具的描述，如果没有映射则返回空字符串
 */
export function getToolDescription(toolName: string): string {
  return TOOL_DESCRIPTION_MAP[toolName as keyof typeof TOOL_DESCRIPTION_MAP] || '';
}

/**
 * 获取所有可用工具的信息
 * @returns 包含工具名称、显示名和描述的对象数组
 */
export function getAllToolsInfo() {
  const uniqueTools = new Set([
    ...Object.keys(TOOL_DISPLAY_MAP)
  ]);
  
  return Array.from(uniqueTools).map(name => ({
    name,
    label: getToolDisplayName(name),
    description: getToolDescription(name)
  }));
}