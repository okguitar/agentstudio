import { Options } from '@anthropic-ai/claude-agent-sdk';
import { ClaudeSession } from './claudeSession';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Claude 会话管理器
 * 负责管理所有 Claude 会话的生命周期
 */
export class SessionManager {
  // 主索引：sessionId -> ClaudeSession
  private sessions: Map<string, ClaudeSession> = new Map();
  // 辅助索引：agentId -> Set<sessionId>，用于查找某个 agent 的所有会话
  private agentSessions: Map<string, Set<string>> = new Map();
  // 临时会话索引：tempKey -> ClaudeSession，等待 sessionId 确认
  private tempSessions: Map<string, ClaudeSession> = new Map();
  // 心跳记录：sessionId -> lastHeartbeatTime
  private sessionHeartbeats: Map<string, number> = new Map();
  
  private cleanupInterval: NodeJS.Timeout;
  private readonly cleanupIntervalMs = 1 * 60 * 1000; // 1 分钟检查一次
  private readonly defaultIdleTimeoutMs = 30 * 60 * 1000; // 30 分钟不活跃超时
  private readonly heartbeatTimeoutMs = 30 * 60 * 1000; // 30 分钟心跳超时

  constructor() {
    // 定期清理空闲会话
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSessions();
    }, this.cleanupIntervalMs);

    console.log('📋 SessionManager initialized for persistent Claude sessions');
  }

  /**
   * 根据 sessionId 获取会话
   * @param sessionId Claude SDK 返回的 sessionId
   */
  getSession(sessionId: string): ClaudeSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 获取指定agent的最新活跃会话
   * @param agentId Agent ID
   */
  getLatestSessionForAgent(agentId: string): ClaudeSession | null {
    const agentSessionIds = this.agentSessions.get(agentId);
    if (!agentSessionIds || agentSessionIds.size === 0) {
      return null;
    }

    // 找到最新的活跃会话
    let latestSession: ClaudeSession | null = null;
    let latestActivity = 0;

    for (const sessionId of agentSessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.isSessionActive()) {
        const lastActivity = session.getLastActivity();
        if (lastActivity > latestActivity) {
          latestActivity = lastActivity;
          latestSession = session;
        }
      }
    }

    return latestSession;
  }

  /**
   * 检查Claude用户目录中是否存在会话历史
   * @param sessionId 要查找的会话ID
   * @param projectPath 项目路径
   */
  checkSessionExists(sessionId: string, projectPath?: string): boolean {
    if (!projectPath) {
      return false;
    }

    try {
      // 使用与sessions.ts相同的路径转换逻辑
      const claudeProjectPath = this.convertProjectPathToClaudeFormat(projectPath);
      const homeDir = os.homedir();
      const historyDir = path.join(homeDir, '.claude', 'projects', claudeProjectPath);
      
      // 检查会话文件是否存在（Claude存储为.jsonl格式）
      const sessionFile = path.join(historyDir, `${sessionId}.jsonl`);
      
      console.log(`🔍 Checking for session file: ${sessionFile}`);
      const exists = fs.existsSync(sessionFile);
      
      if (exists) {
        console.log(`✅ Found session file: ${sessionFile}`);
      } else {
        console.log(`❌ Session ${sessionId} not found at: ${sessionFile}`);
      }
      
      return exists;
    } catch (error) {
      console.error('Error checking session existence:', error);
      return false;
    }
  }

  /**
   * 将项目路径转换为Claude格式
   * 复用sessions.ts中的逻辑
   */
  private convertProjectPathToClaudeFormat(projectPath: string): string {
    // First, resolve symlinks to get the real path
    // This is important because Claude CLI stores sessions using the real path
    let resolvedPath = projectPath;
    try {
      resolvedPath = fs.realpathSync(projectPath);
      if (resolvedPath !== projectPath) {
        console.log(`🔗 [SessionManager] Resolved symlink: ${projectPath} -> ${resolvedPath}`);
      }
    } catch (error) {
      // If the path doesn't exist or can't be resolved, use the original path
      console.log(`⚠️ [SessionManager] Could not resolve path: ${projectPath}, using original`);
    }
    
    // Convert path like /Users/kongjie/Desktop/.workspace2.nosync
    // to: -Users-kongjie-Desktop--workspace2-nosync
    // Claude CLI replaces both '/' and '.' with '-'
    return resolvedPath.replace(/[\/\.]/g, '-');
  }

  /**
   * 创建新会话（还没有 sessionId）
   * @param agentId Agent ID
   * @param options Claude 查询选项
   * @param resumeSessionId 可选的恢复会话ID
   * @param claudeVersionId 可选的 Claude 版本ID
   * @param modelId 可选的模型ID
   */
  createNewSession(agentId: string, options: Options, resumeSessionId?: string, claudeVersionId?: string, modelId?: string): ClaudeSession {
    const session = new ClaudeSession(agentId, options, resumeSessionId, claudeVersionId, modelId);
    if (resumeSessionId) {
      this.sessions.set(resumeSessionId, session);
      const sessionForAgent = this.agentSessions.get(agentId);
      if (sessionForAgent) {
        sessionForAgent.add(resumeSessionId);
      } else {
        this.agentSessions.set(agentId, new Set([resumeSessionId]));
      }

      console.log(`✅ Resumed persistent Claude session for agent: ${agentId} (sessionId: ${resumeSessionId}, claudeVersionId: ${claudeVersionId}, modelId: ${modelId})`);
      return session;
    }
    // 生成临时键并存储
    const tempKey = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.tempSessions.set(tempKey, session);
    console.log(`🆕 Created new persistent Claude session for agent: ${agentId} (temp key: ${tempKey}, claudeVersionId: ${claudeVersionId}, modelId: ${modelId})`);
    return session;
  }

  /**
   * 确认会话的真实 sessionId，更新索引
   * @param session 会话实例
   * @param sessionId Claude SDK 返回的真实 sessionId
   */
  confirmSessionId(session: ClaudeSession, sessionId: string): void {
    // 从临时会话中移除
    let tempKey: string | null = null;
    for (const [key, sess] of this.tempSessions.entries()) {
      if (sess === session) {
        tempKey = key;
        break;
      }
    }

    if (tempKey) {
      this.tempSessions.delete(tempKey);
      
      // 添加到正式索引
      this.sessions.set(sessionId, session);
      
      // 初始化心跳记录
      this.sessionHeartbeats.set(sessionId, Date.now());
      
      // 更新 agent 会话索引
      const agentId = session.getAgentId();
      if (!this.agentSessions.has(agentId)) {
        this.agentSessions.set(agentId, new Set());
      }
      this.agentSessions.get(agentId)!.add(sessionId);
      
      console.log(`✅ Confirmed session ${sessionId} for agent: ${agentId} (removed temp key: ${tempKey})`);
    } else {
      console.warn(`⚠️  Session not found in temp sessions when confirming sessionId: ${sessionId}`);
    }
  }

  /**
   * 替换会话ID（用于resume时Claude SDK返回新的sessionId的情况）
   * @param session 会话实例
   * @param oldSessionId 原始的sessionId
   * @param newSessionId Claude SDK返回的新sessionId
   */
  replaceSessionId(session: ClaudeSession, oldSessionId: string, newSessionId: string): void {
    const agentId = session.getAgentId();
    
    // 从原始sessionId中移除会话
    if (this.sessions.has(oldSessionId)) {
      this.sessions.delete(oldSessionId);
      console.log(`🔄 Removed old session ${oldSessionId} from SessionManager`);
    }
    
    // 从心跳记录中移除原始sessionId并添加新的
    const oldHeartbeat = this.sessionHeartbeats.get(oldSessionId);
    if (oldHeartbeat) {
      this.sessionHeartbeats.delete(oldSessionId);
      this.sessionHeartbeats.set(newSessionId, oldHeartbeat);
    } else {
      // 如果没有旧的心跳记录，则初始化新的
      this.sessionHeartbeats.set(newSessionId, Date.now());
    }
    
    // 从agent会话索引中移除原始sessionId
    if (this.agentSessions.has(agentId)) {
      this.agentSessions.get(agentId)!.delete(oldSessionId);
      console.log(`🔄 Removed old session ${oldSessionId} from agent ${agentId} index`);
    }
    
    // 添加新的sessionId
    this.sessions.set(newSessionId, session);
    
    // 更新agent会话索引
    if (!this.agentSessions.has(agentId)) {
      this.agentSessions.set(agentId, new Set());
    }
    this.agentSessions.get(agentId)!.add(newSessionId);
    
    console.log(`✅ Replaced session ID ${oldSessionId} -> ${newSessionId} for agent: ${agentId}`);
  }

  /**
   * 更新会话心跳时间
   * @param sessionId 会话ID
   * @returns 是否成功更新
   */
  updateHeartbeat(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      this.sessionHeartbeats.set(sessionId, Date.now());
      console.log(`💓 Updated heartbeat for session: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * 获取会话的最后心跳时间
   * @param sessionId 会话ID
   * @returns 最后心跳时间，如果不存在返回null
   */
  getLastHeartbeat(sessionId: string): number | null {
    return this.sessionHeartbeats.get(sessionId) || null;
  }

  /**
   * 检查会话是否心跳超时
   * @param sessionId 会话ID
   * @returns 是否超时
   */
  isHeartbeatTimedOut(sessionId: string): boolean {
    const lastHeartbeat = this.sessionHeartbeats.get(sessionId);
    if (!lastHeartbeat) {
      return true; // 没有心跳记录认为是超时
    }
    return Date.now() - lastHeartbeat > this.heartbeatTimeoutMs;
  }

  /**
   * 检查会话是否在 SessionManager 中存在
   * @param sessionId 会话ID
   * @returns 是否存在
   */
  hasActiveSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * 检查会话是否正在处理请求（用于并发控制）
   * @param sessionId 会话ID
   * @returns 是否正在处理，如果会话不存在返回 false
   */
  isSessionBusy(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    return session.isCurrentlyProcessing();
  }

  /**
   * 移除指定会话
   * @param sessionId Claude SDK 返回的 sessionId
   */
  async removeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const agentId = session.getAgentId();
    
    // 关闭会话
    await session.close();
    
    // 从主索引移除
    this.sessions.delete(sessionId);
    
    // 从心跳记录移除
    this.sessionHeartbeats.delete(sessionId);
    
    // 从 agent 会话索引移除
    if (this.agentSessions.has(agentId)) {
      this.agentSessions.get(agentId)!.delete(sessionId);
      if (this.agentSessions.get(agentId)!.size === 0) {
        this.agentSessions.delete(agentId);
      }
    }
    
    console.log(`🗑️  Removed Claude session: ${sessionId} for agent: ${agentId}`);
    return true;
  }

  /**
   * 手动清理指定会话（提供给前端使用）
   * @param sessionId 会话ID（可能是正式sessionId或临时tempKey）
   * @returns 是否成功清理
   */
  async manualCleanupSession(sessionId: string): Promise<boolean> {
    console.log(`🧹 Manual cleanup requested for session: ${sessionId}`);
    
    // 首先尝试从正式会话中清理
    if (this.sessions.has(sessionId)) {
      return await this.removeSession(sessionId);
    }
    
    // 如果不在正式会话中，尝试从临时会话中清理（pending状态的会话）
    if (this.tempSessions.has(sessionId)) {
      const session = this.tempSessions.get(sessionId);
      if (session) {
        try {
          await session.close();
        } catch (error) {
          console.warn(`⚠️  Failed to close temp session ${sessionId}:`, error);
          // 即使关闭失败，也要从索引中移除
        }
        this.tempSessions.delete(sessionId);
        console.log(`🗑️  Removed pending temp session: ${sessionId}`);
        return true;
      }
    }
    
    console.warn(`⚠️  Session not found for cleanup: ${sessionId}`);
    return false;
  }

  /**
   * 中断指定会话的当前请求
   * @param sessionId 会话ID
   * @returns 是否成功中断
   */
  async interruptSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🛑 Interrupt requested for session: ${sessionId}`);

    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️  Session not found: ${sessionId}`);
      return { success: false, error: 'Session not found' };
    }

    try {
      await session.interrupt();
      console.log(`✅ Successfully interrupted session: ${sessionId}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to interrupt session ${sessionId}:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 清理空闲会话和心跳超时会话
   */
  private async cleanupIdleSessions(): Promise<void> {
    // 只有在心跳超时不是无限期时才清理心跳超时的会话
    if (this.heartbeatTimeoutMs !== Infinity) {
      const heartbeatTimedOutSessions: string[] = [];
      for (const [sessionId, session] of this.sessions.entries()) {
        if (this.isHeartbeatTimedOut(sessionId)) {
          heartbeatTimedOutSessions.push(sessionId);
        }
      }

      if (heartbeatTimedOutSessions.length > 0) {
        console.log(`💔 Cleaning up ${heartbeatTimedOutSessions.length} heartbeat timed-out sessions (timeout: ${this.heartbeatTimeoutMs / 1000}s)`);
        
        for (const sessionId of heartbeatTimedOutSessions) {
          await this.removeSession(sessionId);
          console.log(`🗑️  Removed heartbeat timed-out session: ${sessionId}`);
        }
        
        console.log(`✅ Cleaned up ${heartbeatTimedOutSessions.length} heartbeat timed-out sessions`);
      }
    }

    // 清理长时间未确认的临时会话
    const idleTempKeys: string[] = [];
    const tempSessionTimeoutMs = 30 * 60 * 1000; // 临时会话30分钟超时
    
    for (const [tempKey, session] of this.tempSessions.entries()) {
      if (session.isIdle(tempSessionTimeoutMs)) {
        idleTempKeys.push(tempKey);
      }
    }

    if (idleTempKeys.length > 0) {
      console.log(`🧹 Cleaning up ${idleTempKeys.length} unconfirmed temp sessions (timeout: 30min)`);
      
      // 清理临时会话
      for (const tempKey of idleTempKeys) {
        const session = this.tempSessions.get(tempKey);
        if (session) {
          await session.close();
          this.tempSessions.delete(tempKey);
          console.log(`🗑️  Removed idle temp session: ${tempKey}`);
        }
      }
      
      console.log(`✅ Cleaned up ${idleTempKeys.length} idle temp sessions`);
    }

    // 如果设置为无限超时，则不进行基于活动时间的自动清理
    if (this.defaultIdleTimeoutMs === Infinity) {
      return;
    }

    const idleSessionIds: string[] = [];
    
    // 检查正式会话
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.isIdle(this.defaultIdleTimeoutMs)) {
        idleSessionIds.push(sessionId);
      }
    }

    // 检查基于活动时间的临时会话清理
    const idleActivityTempKeys: string[] = [];
    for (const [tempKey, session] of this.tempSessions.entries()) {
      if (session.isIdle(this.defaultIdleTimeoutMs)) {
        idleActivityTempKeys.push(tempKey);
      }
    }

    if (idleSessionIds.length === 0 && idleActivityTempKeys.length === 0) {
      return;
    }

    console.log(`🧹 Starting cleanup of ${idleSessionIds.length + idleActivityTempKeys.length} idle sessions`);

    // 清理正式会话
    for (const sessionId of idleSessionIds) {
      await this.removeSession(sessionId);
    }

    // 清理基于活动时间的临时会话
    for (const tempKey of idleActivityTempKeys) {
      const session = this.tempSessions.get(tempKey);
      if (session) {
        await session.close();
        this.tempSessions.delete(tempKey);
        console.log(`🗑️  Removed idle temp session: ${tempKey}`);
      }
    }

    console.log(`✅ Cleaned up ${idleSessionIds.length + idleActivityTempKeys.length} idle sessions`);
  }

  /**
   * 获取活跃会话数量
   */
  getActiveSessionCount(): number {
    return this.sessions.size + this.tempSessions.size;
  }

  /**
   * 获取所有会话信息（用于调试和监控）
   */
  getSessionsInfo(): Array<{
    sessionId: string;
    agentId: string;
    isActive: boolean;
    lastActivity: number;
    idleTimeMs: number;
    lastHeartbeat: number | null;
    heartbeatTimedOut: boolean;
    status: 'confirmed' | 'pending';
    projectPath: string | null;
    claudeVersionId?: string;
    modelId?: string;
    sessionTitle?: string;
  }> {
    const now = Date.now();
    const result: Array<{
      sessionId: string;
      agentId: string;
      isActive: boolean;
      lastActivity: number;
      idleTimeMs: number;
      lastHeartbeat: number | null;
      heartbeatTimedOut: boolean;
      status: 'confirmed' | 'pending';
      projectPath: string | null;
      claudeVersionId?: string;
      modelId?: string;
      sessionTitle?: string;
    }> = [];

    // 添加正式会话
    for (const [sessionId, session] of this.sessions.entries()) {
      const lastHeartbeat = this.getLastHeartbeat(sessionId);
      result.push({
        sessionId,
        agentId: session.getAgentId(),
        isActive: session.isSessionActive(),
        lastActivity: session.getLastActivity(),
        idleTimeMs: now - session.getLastActivity(),
        lastHeartbeat,
        heartbeatTimedOut: this.isHeartbeatTimedOut(sessionId),
        status: 'confirmed',
        projectPath: session.getProjectPath(),
        claudeVersionId: session.getClaudeVersionId(),
        modelId: session.getModelId(),
        sessionTitle: session.getSessionTitle() || undefined
      });
    }

    // 添加临时会话
    for (const [tempKey, session] of this.tempSessions.entries()) {
      result.push({
        sessionId: tempKey,
        agentId: session.getAgentId(),
        isActive: session.isSessionActive(),
        lastActivity: session.getLastActivity(),
        idleTimeMs: now - session.getLastActivity(),
        lastHeartbeat: null,
        heartbeatTimedOut: false,
        status: 'pending',
        projectPath: session.getProjectPath(),
        claudeVersionId: session.getClaudeVersionId(),
        modelId: session.getModelId(),
        sessionTitle: session.getSessionTitle() || undefined
      });
    }

    return result;
  }

  /**
   * 清除所有会话（用户主动清理）
   * @returns 清理的会话数量
   */
  async clearAllSessions(): Promise<number> {
    console.log('🧹 Clearing all sessions...');
    
    const totalSessions = this.sessions.size + this.tempSessions.size;
    
    // 关闭所有正式会话
    const sessionPromises = Array.from(this.sessions.values()).map(async (session) => {
      try {
        await session.close();
      } catch (error) {
        console.warn(`⚠️  Failed to close session:`, error);
      }
    });
    
    // 关闭所有临时会话
    const tempPromises = Array.from(this.tempSessions.values()).map(async (session) => {
      try {
        await session.close();
      } catch (error) {
        console.warn(`⚠️  Failed to close temp session:`, error);
      }
    });
    
    await Promise.all([...sessionPromises, ...tempPromises]);
    
    this.sessions.clear();
    this.tempSessions.clear();
    this.agentSessions.clear();
    this.sessionHeartbeats.clear();
    
    console.log(`✅ Cleared ${totalSessions} sessions`);
    return totalSessions;
  }

  /**
   * 关闭所有会话并清理资源
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down SessionManager...');
    
    clearInterval(this.cleanupInterval);
    
    // 关闭所有正式会话
    const sessionPromises = Array.from(this.sessions.values()).map(session => session.close());
    
    // 关闭所有临时会话
    const tempPromises = Array.from(this.tempSessions.values()).map(session => session.close());
    
    await Promise.all([...sessionPromises, ...tempPromises]);
    
    this.sessions.clear();
    this.tempSessions.clear();
    this.agentSessions.clear();
    this.sessionHeartbeats.clear();
    
    console.log('✅ SessionManager shutdown complete');
  }
}

// 全局单例
export const sessionManager = new SessionManager();