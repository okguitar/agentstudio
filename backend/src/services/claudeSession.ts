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
  private queryObject: any | null = null; // 保存 query 对象（带有 interrupt 方法）
  private isActive = true;
  private lastActivity = Date.now();
  private options: Options;
  private isInitialized = false;
  private resumeSessionId: string | null = null;
  private projectPath: string | null = null;
  private claudeVersionId: string | undefined = undefined;

  // 响应分发器相关
  private responseCallbacks: Map<string, (response: any) => void> = new Map();
  private nextRequestId = 0;
  private isBackgroundRunning = false;

  constructor(agentId: string, options: Options, resumeSessionId?: string, claudeVersionId?: string) {
    console.log(`🔧 [DEBUG] ClaudeSession constructor started for agent: ${agentId}, resumeSessionId: ${resumeSessionId}, claudeVersionId: ${claudeVersionId}`);
    this.agentId = agentId;
    this.options = { ...options };
    this.messageQueue = new MessageQueue();
    this.resumeSessionId = resumeSessionId || null;
    this.claudeVersionId = claudeVersionId;
    // 从 options.cwd 获取项目路径
    this.projectPath = options.cwd || null;
    
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
   * 获取项目路径
   */
  getProjectPath(): string | null {
    return this.projectPath;
  }

  /**
   * 获取 Claude 版本ID
   */
  getClaudeVersionId(): string | undefined {
    return this.claudeVersionId;
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

      // query 返回的对象既是 AsyncGenerator 又有 interrupt() 等方法
      this.queryObject = query({
        prompt: this.messageQueue, // messageQueue 实现了 AsyncIterable
        options: queryOptions
      });

      // queryObject 本身就是 AsyncIterable，可以直接赋值给 queryStream
      this.queryStream = this.queryObject;

      console.log(`🔧 [DEBUG] query() called, queryObject created: ${!!this.queryObject}, has interrupt: ${typeof this.queryObject?.interrupt === 'function'} for agent: ${this.agentId}`);

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
   * 发送消息到 Claude 会话，返回请求ID用于响应分发
   * @param message 要发送的消息
   * @param responseCallback 响应回调函数
   */
  async sendMessage(message: any, responseCallback: (response: any) => void): Promise<string> {
    console.log(`🔧 [DEBUG] sendMessage called for agent: ${this.agentId}, isActive: ${this.isActive}, isBackgroundRunning: ${this.isBackgroundRunning}`);
    
    if (!this.isActive) {
      throw new Error('Session is not active');
    }
    
    this.lastActivity = Date.now();
    
    // 生成唯一的请求ID
    const requestId = `req_${this.nextRequestId++}_${Date.now()}`;
    console.log(`🔧 [DEBUG] Generated requestId: ${requestId} for agent: ${this.agentId}`);
    
    // 注册响应回调
    this.responseCallbacks.set(requestId, responseCallback);
    console.log(`🔧 [DEBUG] Registered callback for requestId: ${requestId}, total callbacks: ${this.responseCallbacks.size}`);
    
    // 启动后台响应处理器（如果还没有启动）
    if (!this.isBackgroundRunning) {
      console.log(`🔧 [DEBUG] Starting background response handler for agent: ${this.agentId}`);
      this.startBackgroundResponseHandler();
    } else {
      console.log(`🔧 [DEBUG] Background response handler already running for agent: ${this.agentId}`);
    }
    
    // 将消息推送到队列中，Claude 会通过 async generator 接收
    console.log(`🔧 [DEBUG] About to push message to queue for agent: ${this.agentId}, queueSize before: ${this.messageQueue.size()}`);
    this.messageQueue.push(message);
    console.log(`📨 Queued message for agent: ${this.agentId}, requestId: ${requestId}, queueSize: ${this.messageQueue.size()}`);
    
    return requestId;
  }

  /**
   * 启动后台响应处理器，按顺序分发响应给各个请求
   */
  private async startBackgroundResponseHandler(): Promise<void> {
    if (this.isBackgroundRunning || !this.queryStream) {
      return;
    }
    
    this.isBackgroundRunning = true;
    console.log(`🚀 Starting background response handler for agent: ${this.agentId}`);
    
    try {
      console.log(`🔧 [DEBUG] About to start for-await loop for agent: ${this.agentId}, queryStream: ${!!this.queryStream}`);
      
      for await (const response of this.queryStream) {
        console.log(`🔧 [DEBUG] Received response in background handler for agent: ${this.agentId}, type: ${response.type}`);
        this.lastActivity = Date.now();
        
        // 捕获 SDK 返回的 sessionId
        const sessionId = response.session_id || response.sessionId;
        if (response.type === 'system' && response.subtype === 'init' && sessionId) {
          this.claudeSessionId = sessionId;
          console.log(`📝 Captured Claude sessionId: ${this.claudeSessionId} for agent: ${this.agentId}`);
        }
        
        // 获取当前最早的请求ID（FIFO队列）
        const requestIds = Array.from(this.responseCallbacks.keys());
        const currentRequestId = requestIds.length > 0 ? requestIds[0] : null;
        
        console.log(`🔧 [DEBUG] Current pending requests: ${requestIds.length}, processing: ${currentRequestId}`);
        
        // 分发响应给对应的请求
        if (currentRequestId && this.responseCallbacks.has(currentRequestId)) {
          const callback = this.responseCallbacks.get(currentRequestId)!;
          callback(response);
          
          // 如果是 result 事件，该请求完成，从队列中移除
          if (response.type === 'result') {
            console.log(`✅ Request ${currentRequestId} completed, removing from queue`);
            this.responseCallbacks.delete(currentRequestId);
          }
        } else {
          console.log(`⚠️  No callback found for current request: ${currentRequestId}`);
        }
      }
      
      console.log(`🔧 [DEBUG] For-await loop ended for agent: ${this.agentId}`);
      this.isBackgroundRunning = false; // 重要：循环结束时重置状态
    } catch (error) {
      console.error(`Error in background response handler for agent ${this.agentId}:`, error);
      this.isActive = false;
      this.isBackgroundRunning = false;
    }
  }
  
  /**
   * 取消指定请求的回调
   */
  cancelRequest(requestId: string): void {
    if (this.responseCallbacks.has(requestId)) {
      this.responseCallbacks.delete(requestId);
      console.log(`🧹 Cleaned up request callback: ${requestId}`);
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
   * 中断当前正在执行的 Claude 请求
   * 调用 query 对象的 interrupt() 方法停止当前任务
   */
  async interrupt(): Promise<void> {
    console.log(`🛑 Interrupting Claude session for agent: ${this.agentId}, sessionId: ${this.claudeSessionId}`);

    if (!this.queryObject || typeof this.queryObject.interrupt !== 'function') {
      throw new Error('Query object does not support interrupt');
    }

    try {
      await this.queryObject.interrupt();
      console.log(`✅ Successfully interrupted Claude session for agent: ${this.agentId}, sessionId: ${this.claudeSessionId}`);
    } catch (error) {
      console.error(`❌ Failed to interrupt Claude session for agent ${this.agentId}:`, error);
      throw error;
    }
  }

  /**
   * 关闭会话
   */
  async close(): Promise<void> {
    console.log(`🔚 Closing Claude session for agent: ${this.agentId}, sessionId: ${this.claudeSessionId}`);

    // 如果已经不活跃，直接返回
    if (!this.isActive) {
      console.log(`⚠️  Session already inactive for agent: ${this.agentId}`);
      return;
    }

    this.isActive = false;

    // 清理所有待处理的回调，避免在关闭过程中继续处理响应
    const pendingCallbacks = this.responseCallbacks.size;
    this.responseCallbacks.clear();
    console.log(`🧹 Cleared ${pendingCallbacks} pending response callbacks`);

    // 结束消息队列，这会让 async generator 完成
    this.messageQueue.end();

    // 给 SDK 一些时间来优雅地处理队列结束
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`✅ Claude session closed for agent: ${this.agentId}`);
  }
}