import { Options } from '@anthropic-ai/claude-code';
import { ClaudeSession } from './claudeSession.js';
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
  
  private cleanupInterval: NodeJS.Timeout;
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 分钟
  private readonly defaultIdleTimeoutMs = Infinity; // 无限超时，即不自动清理

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
    // Convert path like /Users/kongjie/slides/ai-editor
    // to: -Users-kongjie-slides-ai-editor
    return projectPath.replace(/\//g, '-');
  }

  /**
   * 创建新会话（还没有 sessionId）
   * @param agentId Agent ID
   * @param options Claude 查询选项
   * @param resumeSessionId 可选的恢复会话ID
   */
  createNewSession(agentId: string, options: Options, resumeSessionId?: string): ClaudeSession {
    const session = new ClaudeSession(agentId, options, resumeSessionId);
    if (resumeSessionId) {
      this.sessions.set(resumeSessionId, session);
      const sessionForAgent = this.agentSessions.get(agentId);
      if (sessionForAgent) {
        sessionForAgent.add(resumeSessionId);
      } else {
        this.agentSessions.set(agentId, new Set([resumeSessionId]));
      }

      console.log(`✅ Resumed persistent Claude session for agent: ${agentId} (sessionId: ${resumeSessionId})`);
      return session;
    }
    // 生成临时键并存储
    const tempKey = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.tempSessions.set(tempKey, session);
    console.log(`🆕 Created new persistent Claude session for agent: ${agentId} (temp key: ${tempKey})`);
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
   * 清理空闲会话
   */
  private async cleanupIdleSessions(): Promise<void> {
    // 如果设置为无限超时，则不进行自动清理，但仍然清理长时间未确认的临时会话
    if (this.defaultIdleTimeoutMs === Infinity) {
      const idleTempKeys: string[] = [];
      const tempSessionTimeoutMs = 30 * 60 * 1000; // 临时会话30分钟超时
      
      // 仅检查临时会话（需要清理长时间未确认的）
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
      return;
    }

    const idleSessionIds: string[] = [];
    
    // 检查正式会话
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.isIdle(this.defaultIdleTimeoutMs)) {
        idleSessionIds.push(sessionId);
      }
    }

    // 检查临时会话（也需要清理长时间未确认的）
    const idleTempKeys: string[] = [];
    for (const [tempKey, session] of this.tempSessions.entries()) {
      if (session.isIdle(this.defaultIdleTimeoutMs)) {
        idleTempKeys.push(tempKey);
      }
    }

    if (idleSessionIds.length === 0 && idleTempKeys.length === 0) {
      return;
    }

    console.log(`🧹 Starting cleanup of ${idleSessionIds.length + idleTempKeys.length} idle sessions`);

    // 清理正式会话
    for (const sessionId of idleSessionIds) {
      await this.removeSession(sessionId);
    }

    // 清理临时会话
    for (const tempKey of idleTempKeys) {
      const session = this.tempSessions.get(tempKey);
      if (session) {
        await session.close();
        this.tempSessions.delete(tempKey);
        console.log(`🗑️  Removed idle temp session: ${tempKey}`);
      }
    }

    console.log(`✅ Cleaned up ${idleSessionIds.length + idleTempKeys.length} idle sessions`);
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
    status: 'confirmed' | 'pending';
  }> {
    const now = Date.now();
    const result: Array<{
      sessionId: string;
      agentId: string;
      isActive: boolean;
      lastActivity: number;
      idleTimeMs: number;
      status: 'confirmed' | 'pending';
    }> = [];

    // 添加正式会话
    for (const [sessionId, session] of this.sessions.entries()) {
      result.push({
        sessionId,
        agentId: session.getAgentId(),
        isActive: session.isSessionActive(),
        lastActivity: session.getLastActivity(),
        idleTimeMs: now - session.getLastActivity(),
        status: 'confirmed'
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
        status: 'pending'
      });
    }

    return result;
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
    
    console.log('✅ SessionManager shutdown complete');
  }
}

// 全局单例
export const sessionManager = new SessionManager();