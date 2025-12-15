// 工具名称映射配置
export const TOOL_DISPLAY_MAP = {
  // 文件操作
  'Bash': '终端命令',
  'BashOutput': '终端命令输出',
  'KillBash': '杀死终端命令',
  'Edit': '文件编辑', 
  'Read': '读取文件',
  'Write': '写入文件',
  
  // 搜索工具
  'Glob': '文件搜索',
  'Grep': '文本搜索',
  
  // 笔记本工具
  'NotebookEdit': '笔记本编辑',
  
  // 网络工具
  'WebFetch': '网页获取',
  'WebSearch': '网络搜索',
  
  // 任务管理
  'TodoWrite': '任务管理',
  'Task': '任务执行',
  'ExitPlanMode': '退出计划模式',
  
  // Skills
  'Skill': '技能调用',
  // 注意：AskUserQuestion 通过内置 MCP server 自动提供，无需在工具选择器中显示
} as const;

// 工具描述映射
export const TOOL_DESCRIPTION_MAP = {
  'Bash': '执行命令行操作',
  'BashOutput': '获取终端命令输出',
  'KillBash': '杀死终端命令',
  'Edit': '编辑文件内容',
  'Read': '读取文件内容',
  'Write': '创建或覆盖文件',
  'Glob': '使用通配符搜索文件',
  'Grep': '在文件中搜索文本',
  'NotebookEdit': '编辑Jupyter笔记本',
  'WebFetch': '获取网页内容',
  'WebSearch': '搜索网络信息',
  'TodoWrite': '创建和管理待办事项',
  'Task': '执行复杂任务',
  'ExitPlanMode': '退出计划模式',
  'Skill': '调用预定义的技能',
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