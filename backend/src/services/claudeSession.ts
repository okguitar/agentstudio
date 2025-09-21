import { query, Options } from '@anthropic-ai/claude-code';
import { MessageQueue } from './messageQueue.js';

/**
 * Claude 会话包装器 - 使用 Streaming Input Mode
 * 一次构造 query，通过 async generator 持续提供用户输入
 */
export class ClaudeSession {
  private agentId: string;
  private claudeSessionId: string | null = null;
  private messageQueue: MessageQueue;
  private queryStream: AsyncIterable<any> | null = null;
  private isActive = true;
  private lastActivity = Date.now();
  private options: Options;
  private isInitialized = false;
  private resumeSessionId: string | null = null;

  constructor(agentId: string, options: Options, resumeSessionId?: string) {
    console.log(`🔧 [DEBUG] ClaudeSession constructor started for agent: ${agentId}, resumeSessionId: ${resumeSessionId}`);
    this.agentId = agentId;
    this.options = { ...options };
    this.messageQueue = new MessageQueue();
    this.resumeSessionId = resumeSessionId || null;
    
    // 如果提供了 resumeSessionId，设置为当前 claudeSessionId
    if (this.resumeSessionId) {
      this.claudeSessionId = this.resumeSessionId;
      console.log(`🔧 [DEBUG] Set claudeSessionId to resumeSessionId: ${this.claudeSessionId}`);
    }
    
    console.log(`🔧 [DEBUG] About to call initializeClaudeStream for agent: ${agentId}`);
    // 立即初始化 Claude 流（Streaming Input Mode）
    this.initializeClaudeStream();
    console.log(`🔧 [DEBUG] ClaudeSession constructor completed for agent: ${agentId}`);
  }

  /**
   * 获取 Claude SDK 返回的真实 sessionId
   */
  getClaudeSessionId(): string | null {
    return this.claudeSessionId;
  }

  /**
   * 设置 Claude sessionId
   */
  setClaudeSessionId(sessionId: string): void {
    this.claudeSessionId = sessionId;
  }

  /**
   * 获取 agentId
   */
  getAgentId(): string {
    return this.agentId;
  }

  /**
   * 检查会话是否活跃
   */
  isSessionActive(): boolean {
    return this.isActive;
  }

  /**
   * 初始化 Claude 流 - 只调用一次，启动持续会话
   */
  private initializeClaudeStream(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      if (this.resumeSessionId) {
        console.log(`🔄 Resuming persistent Claude session ${this.resumeSessionId} for agent: ${this.agentId}`);
      } else {
        console.log(`🆕 Starting new persistent Claude session for agent: ${this.agentId}`);
      }

      // 如果有 resumeSessionId，添加到 options 中
      const queryOptions = { ...this.options };
      if (this.resumeSessionId) {
        queryOptions.resume = this.resumeSessionId;
        console.log(`🔄 Setting resume parameter: ${this.resumeSessionId} for agent: ${this.agentId}`);
        console.log(`📋 Full queryOptions for resume:`, JSON.stringify({
          ...queryOptions,
          customSystemPrompt: queryOptions.customSystemPrompt ? `${queryOptions.customSystemPrompt.substring(0, 100)}...` : 'none'
        }, null, 2));
      } else {
        console.log(`🆕 No resume parameter, starting fresh session for agent: ${this.agentId}`);
      }

      // 使用 Streaming Input Mode - 只构造一次 query
      // 这个 query 对象会持续运行，通过 messageQueue 接收新的用户输入
      console.log(`🔧 [DEBUG] About to call query() for agent: ${this.agentId}`);
      console.log(`🔧 [DEBUG] MessageQueue ready: ${!!this.messageQueue}, queryOptions ready: ${!!queryOptions}`);
      
      this.queryStream = query({
        prompt: this.messageQueue, // messageQueue 实现了 AsyncIterable
        options: queryOptions
      });
      
      console.log(`🔧 [DEBUG] query() called, queryStream created: ${!!this.queryStream} for agent: ${this.agentId}`);

      this.isInitialized = true;
      const action = this.resumeSessionId ? 'Resumed' : 'Initialized';
      console.log(`✨ ${action} persistent Claude streaming session for agent: ${this.agentId}`);
    } catch (error) {
      console.error(`Failed to initialize Claude session for agent ${this.agentId}:`, error);
      this.isActive = false;
      throw error;
    }
  }

  /**
   * 发送消息到 Claude 会话
   * @param message 要发送的消息
   */
  async sendMessage(message: any): Promise<void> {
    if (!this.isActive) {
      throw new Error('Session is not active');
    }
    
    this.lastActivity = Date.now();
    
    // 将消息推送到队列中，Claude 会通过 async generator 接收
    this.messageQueue.push(message);
    console.log(`📨 Queued message for agent: ${this.agentId}, queueSize: ${this.messageQueue.size()}`);
  }

  /**
   * 获取 Claude 响应流
   */
  async *getResponseStream(): AsyncIterable<any> {
    if (!this.queryStream) {
      throw new Error('Claude stream not initialized');
    }

    try {
      for await (const response of this.queryStream) {
        this.lastActivity = Date.now();
        
        // 捕获 SDK 返回的 sessionId
        const sessionId = response.session_id || response.sessionId;
        if (response.type === 'system' && response.subtype === 'init' && sessionId) {
          this.claudeSessionId = sessionId;
          console.log(`📝 Captured Claude sessionId: ${this.claudeSessionId} for agent: ${this.agentId}`);
        }
        
        yield response;
      }
    } catch (error) {
      console.error(`Error in Claude session for agent ${this.agentId}:`, error);
      this.isActive = false;
      throw error;
    }
  }

  /**
   * 检查会话是否空闲
   */
  isIdle(idleTimeoutMs: number = 30 * 60 * 1000): boolean {
    return Date.now() - this.lastActivity > idleTimeoutMs;
  }

  /**
   * 获取最后活动时间
   */
  getLastActivity(): number {
    return this.lastActivity;
  }

  /**
   * 关闭会话
   */
  async close(): Promise<void> {
    console.log(`🔚 Closing Claude session for agent: ${this.agentId}, sessionId: ${this.claudeSessionId}`);
    this.isActive = false;
    
    // 结束消息队列，这会让 async generator 完成
    this.messageQueue.end();
  }
}