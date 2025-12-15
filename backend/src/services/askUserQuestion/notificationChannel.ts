/**
 * Notification Channel Abstraction
 * 
 * 定义用户通知渠道的接口，支持多种通知方式：
 * - SSE (Web 浏览器)
 * - Slack
 * - 企业微信
 * - 邮件
 * - etc.
 */

import { EventEmitter } from 'events';

/**
 * 用户输入请求
 */
export interface UserInputRequest {
  toolUseId: string;
  sessionId: string;
  agentId: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{
      label: string;
      description: string;
    }>;
    multiSelect: boolean;
  }>;
  createdAt: number;
}

/**
 * 通知渠道类型
 */
export type ChannelType = 'sse' | 'slack' | 'wechat' | 'email';

/**
 * 通知渠道接口
 */
export interface NotificationChannel {
  /** 渠道类型 */
  type: ChannelType;
  
  /** 渠道标识符（如 SSE connectionId、Slack channel ID 等） */
  channelId: string;
  
  /** 关联的 session ID */
  sessionId: string;
  
  /** 关联的 agent ID */
  agentId: string;
  
  /** 创建时间 */
  createdAt: number;
  
  /** 检查渠道是否仍然活跃 */
  isActive(): boolean;
  
  /** 发送等待用户输入的通知 */
  sendAwaitingInput(request: UserInputRequest): Promise<boolean>;
  
  /** 关闭渠道 */
  close(): void;
}

/**
 * 通知渠道管理器
 * 
 * 管理所有活跃的通知渠道，根据 sessionId 路由通知
 */
class NotificationChannelManager extends EventEmitter {
  // sessionId -> NotificationChannel[]
  // 一个 session 可以有多个活跃渠道（如浏览器 + Slack 同时在线）
  private channels: Map<string, NotificationChannel[]> = new Map();
  
  /**
   * 注册一个通知渠道
   */
  registerChannel(channel: NotificationChannel): void {
    const { sessionId } = channel;
    
    if (!this.channels.has(sessionId)) {
      this.channels.set(sessionId, []);
    }
    
    const sessionChannels = this.channels.get(sessionId)!;
    
    // 避免重复注册
    const existing = sessionChannels.find(c => c.channelId === channel.channelId);
    if (!existing) {
      sessionChannels.push(channel);
      console.log(`📡 [NotificationManager] Registered ${channel.type} channel for session: ${sessionId}`);
    }
  }
  
  /**
   * 注销一个通知渠道
   */
  unregisterChannel(channelId: string): void {
    for (const [sessionId, channels] of this.channels.entries()) {
      const index = channels.findIndex(c => c.channelId === channelId);
      if (index !== -1) {
        channels.splice(index, 1);
        console.log(`📡 [NotificationManager] Unregistered channel: ${channelId} from session: ${sessionId}`);
        
        // 如果 session 没有活跃渠道了，清理
        if (channels.length === 0) {
          this.channels.delete(sessionId);
        }
        return;
      }
    }
  }
  
  /**
   * 更新渠道的 sessionId（当 Claude SDK 返回真实 sessionId 时）
   */
  updateChannelSession(channelId: string, newSessionId: string): void {
    for (const [sessionId, channels] of this.channels.entries()) {
      const channel = channels.find(c => c.channelId === channelId);
      if (channel) {
        // 从旧 session 移除
        const index = channels.indexOf(channel);
        channels.splice(index, 1);
        if (channels.length === 0) {
          this.channels.delete(sessionId);
        }
        
        // 更新 channel 的 sessionId
        (channel as any).sessionId = newSessionId;
        
        // 添加到新 session
        if (!this.channels.has(newSessionId)) {
          this.channels.set(newSessionId, []);
        }
        this.channels.get(newSessionId)!.push(channel);
        
        console.log(`📡 [NotificationManager] Moved channel ${channelId} from session ${sessionId} to ${newSessionId}`);
        return;
      }
    }
  }
  
  /**
   * 发送等待用户输入的通知
   * 会尝试通过所有活跃渠道发送
   */
  async sendAwaitingInput(request: UserInputRequest): Promise<boolean> {
    const { sessionId } = request;
    const channels = this.channels.get(sessionId);
    
    if (!channels || channels.length === 0) {
      console.warn(`⚠️ [NotificationManager] No active channels for session: ${sessionId}`);
      return false;
    }
    
    // 清理不活跃的渠道
    const activeChannels = channels.filter(c => c.isActive());
    if (activeChannels.length !== channels.length) {
      this.channels.set(sessionId, activeChannels);
    }
    
    if (activeChannels.length === 0) {
      console.warn(`⚠️ [NotificationManager] All channels inactive for session: ${sessionId}`);
      return false;
    }
    
    // 尝试通过所有活跃渠道发送
    let anySuccess = false;
    for (const channel of activeChannels) {
      try {
        const success = await channel.sendAwaitingInput(request);
        if (success) {
          anySuccess = true;
          console.log(`✅ [NotificationManager] Sent notification via ${channel.type} for session: ${sessionId}`);
        }
      } catch (error) {
        console.error(`❌ [NotificationManager] Failed to send via ${channel.type}:`, error);
      }
    }
    
    return anySuccess;
  }
  
  /**
   * 获取 session 的所有活跃渠道
   */
  getChannelsForSession(sessionId: string): NotificationChannel[] {
    return this.channels.get(sessionId) || [];
  }
  
  /**
   * 检查 session 是否有活跃渠道
   */
  hasActiveChannel(sessionId: string): boolean {
    const channels = this.channels.get(sessionId);
    return !!channels && channels.some(c => c.isActive());
  }
  
  /**
   * 获取统计信息
   */
  getStats(): { totalSessions: number; totalChannels: number } {
    let totalChannels = 0;
    for (const channels of this.channels.values()) {
      totalChannels += channels.length;
    }
    return {
      totalSessions: this.channels.size,
      totalChannels
    };
  }
}

// 单例实例
export const notificationChannelManager = new NotificationChannelManager();

