import { SlashCommand } from '../types/commands';

interface SystemCommand {
  id: string;
  name: string;
  description: string;
  content: string;
  scope: 'system';
  isSystem: true;
}

export type CommandType = SlashCommand | SystemCommand;

/**
 * 格式化命令消息，用于发送给AI
 * 按照 <command-message>描述</command-message><command-name>命令内容</command-name> 格式
 */
/**
 * 处理文件路径引用
 * 如果输入包含 @filepath 格式，转换为绝对路径
 */
function processFileRefs(content: string, projectPath?: string): string {
  if (!projectPath) return content;
  
  return content.replace(/@([\w.-]+(?:\/[\w.-]+)*(?:\.\w+)?)/g, (_match, filepath) => {
    // 如果已经是绝对路径，直接返回
    if (filepath.startsWith('/')) {
      return filepath;
    }
    // 否则，将相对路径转换为绝对路径
    return projectPath + '/' + filepath;
  });
}

export function formatCommandMessage(command: CommandType, args?: string, projectPath?: string): string {
  // 处理命令内容中的占位符
  let commandContent = command.content;

  // 替换 $ARGUMENTS 占位符
  if (args) {
    commandContent = commandContent.replace(/\$ARGUMENTS/g, args);
  }

  // 处理文件路径引用
  commandContent = processFileRefs(commandContent, projectPath);

  // 构建描述
  const description = args
    ? `${command.description} (参数: ${args})`
    : command.description;

  return `<command-message>${description}</command-message><command-name>${commandContent}</command-name>`;
}

/**
 * 检查输入文本是否以 / 开头（触发命令选择器）
 */
export function isCommandTrigger(text: string): boolean {
  return text.startsWith('/');
}

/**
 * 从输入文本中提取命令搜索词
 * 例如: "/build" 返回 "build", "/test app" 返回 "test app"
 */
export function extractCommandSearch(text: string): string {
  if (!text.startsWith('/')) return '';
  return text.slice(1); // 移除开头的 /
}

/**
 * 解析命令和参数
 * 例如: "/build production" 返回 { command: "build", args: "production" }
 */
export function parseCommandInput(text: string): { command: string; args?: string } {
  if (!text.startsWith('/')) return { command: '' };
  
  const parts = text.slice(1).split(' ');
  const command = parts[0] || '';
  const args = parts.slice(1).join(' ') || undefined;
  
  return { command, args };
}

/**
 * 检查命令是否需要参数
 */
export function commandNeedsArguments(command: CommandType): boolean {
  return !!(command as any).argumentHint;
}

/**
 * 生成命令的完整输入提示
 */
export function getCommandPlaceholder(command: CommandType): string {
  if ((command as any).argumentHint) {
    return `/${command.name} ${(command as any).argumentHint}`;
  }
  return `/${command.name}`;
}