import { SlashCommand } from '../types/commands';

export interface SystemCommand {
  id: string;
  name: string;
  description: string;
  content: string;
  scope: 'system';
  isSystem: true;
}

export type CommandType = SlashCommand | SystemCommand;

// 命令执行结果类型
export interface CommandExecutionResult {
  shouldSendToBackend: boolean;
  message?: string; // 如果不发送到后端，这里是显示给用户的消息
  action?: 'navigate' | 'confirm' | 'newSession' | 'none';
  actionData?: any;
}

// 前端命令处理器
export class CommandHandler {
  private agentStore: any;
  // private router?: any;
  private onNewSession?: () => void;
  private onNavigate?: (path: string) => void;
  private onConfirm?: (message: string, onConfirm: () => void) => void;

  constructor(dependencies: {
    agentStore: any;
    // router?: any;
    onNewSession?: () => void;
    onNavigate?: (path: string) => void;
    onConfirm?: (message: string, onConfirm: () => void) => void;
  }) {
    this.agentStore = dependencies.agentStore;
    // this.router = dependencies.router;
    this.onNewSession = dependencies.onNewSession;
    this.onNavigate = dependencies.onNavigate;
    this.onConfirm = dependencies.onConfirm;
  }

  // 执行命令
  async executeCommand(command: CommandType, _args?: string): Promise<CommandExecutionResult> {
    const commandName = command.name.toLowerCase();
    
    switch (commandName) {
      case 'clear':
        return this.handleClearCommand();
      
      case 'init':
        return this.handleInitCommand();
      
      case 'compact':
        return this.handleCompactCommand();
      
      case 'agents':
        return this.handleAgentsCommand();
      
      case 'settings':
        return this.handleSettingsCommand();
      
      case 'help':
        return this.handleHelpCommand();
      
      default:
        // 自定义命令默认发送到后端
        return this.handleCustomCommand(command, _args);
    }
  }

  private handleClearCommand(): CommandExecutionResult {
    // 清空对话 - 前端处理：创建新会话
    if (this.onNewSession) {
      this.onNewSession();
      return {
        shouldSendToBackend: false,
        message: '已清空对话，开始新会话',
        action: 'newSession'
      };
    }
    
    // 如果没有新会话回调，清空当前消息
    this.agentStore.clearMessages();
    return {
      shouldSendToBackend: false,
      message: '已清空对话历史',
      action: 'none'
    };
  }

  private handleInitCommand(): CommandExecutionResult {
    // 初始化 - 可以前端处理也可以后端处理，这里选择后端处理以获得AI的响应
    return {
      shouldSendToBackend: true
    };
  }

  private handleCompactCommand(): CommandExecutionResult {
    // 压缩对话 - 需要AI处理，发送到后端
    return {
      shouldSendToBackend: true
    };
  }

  private handleAgentsCommand(): CommandExecutionResult {
    // 代理管理 - 前端处理：导航到代理管理页面
    const confirmMessage = '是否要跳转到代理管理页面？';
    
    if (this.onConfirm) {
      this.onConfirm(confirmMessage, () => {
        if (this.onNavigate) {
          this.onNavigate('/agents');
        }
      });
    }
    
    return {
      shouldSendToBackend: false,
      message: confirmMessage,
      action: 'confirm',
      actionData: { path: '/agents' }
    };
  }

  private handleSettingsCommand(): CommandExecutionResult {
    // 设置 - 前端处理：导航到设置页面
    const confirmMessage = '是否要跳转到设置页面？';
    
    if (this.onConfirm) {
      this.onConfirm(confirmMessage, () => {
        if (this.onNavigate) {
          this.onNavigate('/settings');
        }
      });
    }
    
    return {
      shouldSendToBackend: false,
      message: confirmMessage,
      action: 'confirm',
      actionData: { path: '/settings' }
    };
  }

  private handleHelpCommand(): CommandExecutionResult {
    // 帮助 - 前端处理：显示帮助信息
    const helpMessage = `
可用命令：
• /clear - 清空对话历史
• /init - 初始化项目或重置对话上下文  
• /compact - 压缩对话历史
• /agents - 管理AI代理
• /settings - 打开设置页面
• /help - 显示帮助信息
    `.trim();
    
    return {
      shouldSendToBackend: false,
      message: helpMessage,
      action: 'none'
    };
  }

  private handleCustomCommand(command: CommandType, _args?: string): CommandExecutionResult {
    // 自定义命令根据类型决定处理方式
    
    // 检查是否是导航类命令（根据命令名或namespace判断）
    if (command.name.includes('nav') || command.name.includes('goto') || 
        ('namespace' in command && command.namespace === 'nav')) {
      return {
        shouldSendToBackend: false,
        message: `导航命令 ${command.name} 需要前端处理`,
        action: 'confirm'
      };
    }
    
    // 检查是否是UI操作命令
    if (command.name.includes('ui') || command.name.includes('show') ||
        ('namespace' in command && command.namespace === 'ui')) {
      return {
        shouldSendToBackend: false,
        message: `UI命令 ${command.name} 在前端执行`,
        action: 'none'
      };
    }
    
    // 默认发送到后端处理
    return {
      shouldSendToBackend: true
    };
  }
}

// 创建命令处理器实例的工厂函数
export function createCommandHandler(dependencies: {
  agentStore: any;
  router?: any;
  onNewSession?: () => void;
  onNavigate?: (path: string) => void;
  onConfirm?: (message: string, onConfirm: () => void) => void;
}): CommandHandler {
  return new CommandHandler(dependencies);
}