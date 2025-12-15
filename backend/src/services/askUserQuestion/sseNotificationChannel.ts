/**
 * SSE Notification Channel
 * 
 * 实现通过 Server-Sent Events 向 Web 浏览器发送通知
 */

import type { Response } from 'express';
import type { NotificationChannel, UserInputRequest, ChannelType } from './notificationChannel.js';

/**
 * SSE 通知渠道实现
 */
export class SSENotificationChannel implements NotificationChannel {
  type: ChannelType = 'sse';
  channelId: string;
  sessionId: string;
  agentId: string;
  createdAt: number;
  
  private res: Response;
  private closed: boolean = false;
  private onCloseCallback?: () => void;
  
  /**
   * @param channelId - 渠道唯一标识
   * @param sessionId - 关联的会话 ID
   * @param agentId - 关联的 Agent ID
   * @param res - Express Response 对象
   * @param onClose - 可选的关闭回调，用于在连接关闭时注销渠道
   */
  constructor(
    channelId: string, 
    sessionId: string, 
    agentId: string, 
    res: Response,
    onClose?: () => void
  ) {
    this.channelId = channelId;
    this.sessionId = sessionId;
    this.agentId = agentId;
    this.res = res;
    this.createdAt = Date.now();
    this.onCloseCallback = onClose;
    
    // 监听连接关闭
    res.on('close', () => {
      this.closed = true;
      console.log(`📡 [SSEChannel] Connection closed: ${channelId}`);
      
      // 调用关闭回调，用于注销渠道
      if (this.onCloseCallback) {
        try {
          this.onCloseCallback();
        } catch (error) {
          console.error(`❌ [SSEChannel] Error in onClose callback:`, error);
        }
      }
    });
  }
  
  isActive(): boolean {
    return !this.closed && !this.res.destroyed;
  }
  
  async sendAwaitingInput(request: UserInputRequest): Promise<boolean> {
    if (!this.isActive()) {
      return false;
    }
    
    try {
      const event = {
        type: 'awaiting_user_input',
        toolUseId: request.toolUseId,
        toolName: 'mcp__ask-user-question__ask_user_question',
        toolInput: { questions: request.questions },
        agentId: request.agentId,
        sessionId: request.sessionId,
        timestamp: Date.now(),
      };
      
      this.res.write(`data: ${JSON.stringify(event)}\n\n`);
      console.log(`📤 [SSEChannel] Sent awaiting_user_input to channel: ${this.channelId}`);
      return true;
    } catch (error) {
      console.error(`❌ [SSEChannel] Failed to send event:`, error);
      return false;
    }
  }
  
  close(): void {
    this.closed = true;
  }
}

/**
 * 生成唯一的 SSE channel ID
 */
export function generateSSEChannelId(): string {
  return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}


