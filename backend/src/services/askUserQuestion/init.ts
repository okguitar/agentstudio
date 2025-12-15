/**
 * AskUserQuestion Module Initialization
 * 
 * 设置 UserInputRegistry 和 NotificationChannelManager 之间的事件连接
 * 这是事件驱动架构的关键：MCP 工具不直接发送通知，而是通过事件系统
 */

import { userInputRegistry } from './userInputRegistry.js';
import { notificationChannelManager, type UserInputRequest } from './notificationChannel.js';

let initialized = false;

/**
 * 初始化 AskUserQuestion 模块
 * 建立 UserInputRegistry 和 NotificationChannelManager 之间的事件连接
 * 启动定期清理任务
 */
export function initAskUserQuestionModule(): void {
  if (initialized) {
    console.log('⚠️ [AskUserQuestion] Module already initialized');
    return;
  }
  
  // 监听 awaiting_input 事件，通过 NotificationChannelManager 发送通知
  userInputRegistry.on('awaiting_input', async (request: UserInputRequest) => {
    console.log(`📡 [AskUserQuestion] Received awaiting_input event for tool: ${request.toolUseId}`);
    
    const sent = await notificationChannelManager.sendAwaitingInput(request);
    
    if (!sent) {
      console.warn(`⚠️ [AskUserQuestion] Failed to send notification for tool: ${request.toolUseId}`);
      // 注意：这里不取消 Promise，因为：
      // 1. 用户可能稍后重新连接
      // 2. 可能有其他渠道（如 Slack）可以通知用户
    }
  });
  
  // 启动定期清理任务，清理超过 24 小时的过期请求
  // 清理间隔：1 小时，最大存活时间：24 小时
  userInputRegistry.startCleanupJob();
  
  initialized = true;
  console.log('✅ [AskUserQuestion] Module initialized - event connection established, cleanup job started');
}

/**
 * 检查模块是否已初始化
 */
export function isAskUserQuestionModuleInitialized(): boolean {
  return initialized;
}


