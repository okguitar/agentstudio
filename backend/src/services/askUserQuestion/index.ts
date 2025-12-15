/**
 * AskUserQuestion Module
 * 
 * 提供 MCP 实现的用户问题功能，支持多种通知渠道
 */

// MCP 工具
export { 
    createAskUserQuestionMcpServer, 
    getAskUserQuestionToolName,
    isAskUserQuestionTool,
    type AskUserQuestionInput 
} from './askUserQuestionMcp.js';

// 集成函数
export { integrateAskUserQuestionMcpServer } from './askUserQuestionIntegration.js';

// 用户输入注册表
export { 
    userInputRegistry,
    type UserInputRequest,
    type PendingUserInput 
} from './userInputRegistry.js';

// 通知渠道管理
export { 
    notificationChannelManager,
    type NotificationChannel,
    type ChannelType
} from './notificationChannel.js';

// SSE 通知渠道
export { 
    SSENotificationChannel,
    generateSSEChannelId 
} from './sseNotificationChannel.js';

// Slack 通知渠道
export { 
    SlackNotificationChannel,
    generateSlackChannelId 
} from './slackNotificationChannel.js';

// 模块初始化
export { 
    initAskUserQuestionModule,
    isAskUserQuestionModuleInitialized 
} from './init.js';
