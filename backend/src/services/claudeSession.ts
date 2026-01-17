import { query, Options } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage, SDKSystemMessage } from '@anthropic-ai/claude-agent-sdk';
import { MessageQueue } from './messageQueue';

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
  private modelId: string | undefined = undefined;
  private sessionTitle: string | null = null;

  // 响应分发器相关 - 简化版本（会话级别的并发控制在 SlackAIService 中处理）
  private responseCallbacks: Map<string, (response: SDKMessage) => void> = new Map();
  private nextRequestId = 0;
  private isBackgroundRunning = false;
  
  // 并发控制：标记会话是否正在处理请求
  private isProcessing = false;

  constructor(agentId: string, options: Options, resumeSessionId?: string, claudeVersionId?: string, modelId?: string) {
    console.log(`🔧 [DEBUG] ClaudeSession constructor started for agent: ${agentId}, resumeSessionId: ${resumeSessionId}, claudeVersionId: ${claudeVersionId}, modelId: ${modelId}`);
    this.agentId = agentId;
    this.options = { ...options };
    this.messageQueue = new MessageQueue();
    this.resumeSessionId = resumeSessionId || null;
    this.claudeVersionId = claudeVersionId;
    this.modelId = modelId;
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
   * 获取会话标题
   */
  getSessionTitle(): string | null {
    return this.sessionTitle;
  }

  /**
   * 设置会话标题（从第一条消息生成）
   */
  setSessionTitle(title: string): void {
    if (!this.sessionTitle) {
      // 只设置一次，取前50个字符
      this.sessionTitle = title.slice(0, 50) + (title.length > 50 ? '...' : '');
    }
  }

  /**
   * 获取 Claude 版本ID
   */
  getClaudeVersionId(): string | undefined {
    return this.claudeVersionId;
  }

  /**
   * 获取模型ID
   */
  getModelId(): string | undefined {
    return this.modelId;
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
      } else {
        console.log(`🆕 No resume parameter, starting fresh session for agent: ${this.agentId}`);
      }

      // 使用 Streaming Input Mode - 只构造一次 query
      // 这个 query 对象会持续运行，通过 messageQueue 接收新的用户输入
      console.log(`🔧 [DEBUG] About to call query() for agent: ${this.agentId}`);

      // query 返回的对象既是 AsyncGenerator 又有 interrupt() 等方法
      this.queryObject = query({
        prompt: this.messageQueue, // messageQueue 实现了 AsyncIterable
        options: queryOptions
      });

      // queryObject 本身就是 AsyncIterable，可以直接赋值给 queryStream
      this.queryStream = this.queryObject;

      this.isInitialized = true;
      const action = this.resumeSessionId ? 'Resumed' : 'Initialized';
      console.log(`✨ ${action} persistent Claude streaming session for agent: ${this.agentId}`);
    } catch (error) {
      console.error(`Failed to initialize Claude session for agent ${this.agentId}:`, error);
      
      // 打印更详细的错误信息
      if (error instanceof Error) {
        console.error(`❌ [初始化错误详情]`);
        console.error(`   - name: ${error.name}`);
        console.error(`   - message: ${error.message}`);
        console.error(`   - stack: ${error.stack}`);
        
        const errorAny = error as any;
        if (errorAny.stderr) console.error(`   - stderr: ${errorAny.stderr}`);
        if (errorAny.stdout) console.error(`   - stdout: ${errorAny.stdout}`);
        if (errorAny.exitCode !== undefined) console.error(`   - exitCode: ${errorAny.exitCode}`);
        if (errorAny.code !== undefined) console.error(`   - code: ${errorAny.code}`);
        
        const allKeys = Object.keys(errorAny);
        if (allKeys.length > 0) {
          console.error(`   - 所有属性: ${allKeys.join(', ')}`);
        }
      }
      
      this.isActive = false;
      throw error;
    }
  }

  /**
   * 发送消息到 Claude 会话，返回请求ID用于响应分发
   * @param message 要发送的消息
   * @param responseCallback 响应回调函数
   */
  async sendMessage(message: any, responseCallback: (response: SDKMessage) => void): Promise<string> {
    console.log(`🔧 [DEBUG] sendMessage called for agent: ${this.agentId}, isActive: ${this.isActive}, isProcessing: ${this.isProcessing}, isBackgroundRunning: ${this.isBackgroundRunning}`);

    if (!this.isActive) {
      throw new Error('Session is not active');
    }

    // 并发控制：检查是否已有请求正在处理
    if (this.isProcessing) {
      throw new Error('Session is busy processing another request. Please wait for the current request to complete or create a new session.');
    }

    // 标记为正在处理
    this.isProcessing = true;

    this.lastActivity = Date.now();

    // 生成唯一的请求ID
    const requestId = `req_${this.nextRequestId++}_${Date.now()}`;
    this.responseCallbacks.set(requestId, responseCallback);

    // 确保后台响应处理器已启动（简单版本，因为并发控制在上一层）
    if (!this.isBackgroundRunning) {
      this.startBackgroundResponseHandler();
    }

    // 将消息推送到队列中
    this.messageQueue.push(message);

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
      for await (const response of this.queryStream) {
        // 类型安全的消息处理
        const sdkMessage = response as SDKMessage;
        console.log(`🔧 [DEBUG] Received response in background handler for agent: ${this.agentId}, type: ${sdkMessage.type}`);
        this.lastActivity = Date.now();

        // 捕获 SDK 返回的 sessionId
        const sessionId = sdkMessage.session_id;
        if (sdkMessage.type === 'system' && (sdkMessage as SDKSystemMessage).subtype === 'init' && sessionId) {
          this.claudeSessionId = sessionId;
          console.log(`📝 Captured Claude sessionId: ${this.claudeSessionId} for agent: ${this.agentId}`);
        }

        // 简单的响应分发：只使用第一个回调（因为我们现在保证了没有并发）
        const requestIds = Array.from(this.responseCallbacks.keys());
        const currentRequestId = requestIds.length > 0 ? requestIds[0] : null;

        console.log(`🔧 [DEBUG] Current pending requests: ${requestIds.length}, processing: ${currentRequestId}`);

        // 分发响应给对应的请求
        if (currentRequestId && this.responseCallbacks.has(currentRequestId)) {
          const callback = this.responseCallbacks.get(currentRequestId)!;
          callback(sdkMessage);

          // 如果是 result 事件，该请求完成，从队列中移除
          if (sdkMessage.type === 'result') {
            console.log(`✅ Request ${currentRequestId} completed, removing from queue`);
            this.responseCallbacks.delete(currentRequestId);
            // 清除处理中标记，允许新的请求
            this.isProcessing = false;
            console.log(`🔓 Session unlocked for agent: ${this.agentId}, sessionId: ${this.claudeSessionId}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error in background response handler for agent ${this.agentId}:`, error);
      
      // 打印更详细的错误信息
      if (error instanceof Error) {
        console.error(`❌ [详细错误信息]`);
        console.error(`   - name: ${error.name}`);
        console.error(`   - message: ${error.message}`);
        console.error(`   - stack: ${error.stack}`);
        
        // 检查是否有额外的属性（如 stderr, stdout, exitCode 等）
        const errorAny = error as any;
        if (errorAny.stderr) {
          console.error(`   - stderr: ${errorAny.stderr}`);
        }
        if (errorAny.stdout) {
          console.error(`   - stdout: ${errorAny.stdout}`);
        }
        if (errorAny.exitCode !== undefined) {
          console.error(`   - exitCode: ${errorAny.exitCode}`);
        }
        if (errorAny.code !== undefined) {
          console.error(`   - code: ${errorAny.code}`);
        }
        if (errorAny.signal !== undefined) {
          console.error(`   - signal: ${errorAny.signal}`);
        }
        if (errorAny.cause !== undefined) {
          console.error(`   - cause: ${JSON.stringify(errorAny.cause, null, 2)}`);
        }
        
        // 打印所有可枚举属性
        const allKeys = Object.keys(errorAny);
        if (allKeys.length > 0) {
          console.error(`   - 所有属性: ${allKeys.join(', ')}`);
          for (const key of allKeys) {
            if (!['name', 'message', 'stack', 'stderr', 'stdout', 'exitCode', 'code', 'signal', 'cause'].includes(key)) {
              try {
                console.error(`   - ${key}: ${JSON.stringify(errorAny[key])}`);
              } catch {
                console.error(`   - ${key}: [无法序列化]`);
              }
            }
          }
        }
      } else {
        console.error(`❌ 非 Error 对象:`, JSON.stringify(error, null, 2));
      }
      
      this.isActive = false;
      // 清除处理中标记
      this.isProcessing = false;
    } finally {
      this.isBackgroundRunning = false;
      // 确保处理中标记被清除（以防上面的 catch 没有执行到）
      this.isProcessing = false;
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
   * 检查会话是否仍然活跃
   */
  public isSessionActive(): boolean {
    return this.isActive;
  }

  /**
   * 检查会话是否正在处理请求
   * 用于并发控制，防止同一会话同时处理多个请求
   */
  public isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * 获取最后活动时间
   */
  public getLastActivity(): number {
    return this.lastActivity;
  }

  /**
   * Get current Claude session ID
   * 
   * Used by SDK MCP tools to automatically inject sessionId when calling
   * external A2A agents, maintaining conversation context across agent boundaries.
   * 
   * @returns Current session ID or null if not yet initialized
   */
  public getSessionId(): string | null {
    return this.claudeSessionId;
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