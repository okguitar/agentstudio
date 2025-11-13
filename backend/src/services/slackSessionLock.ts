/**
 * Slack Session Lock Manager
 *
 * 使用文件锁机制防止同一会话的并发处理
 * 简单、可靠、无需心跳机制
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SessionLockInfo {
  sessionId: string;
  threadTs: string;
  channel: string;
  agentId: string;
  lockTime: number;
  processId: number; // 记录创建锁的进程ID
}

export class SlackSessionLock {
  private locksDir: string;
  private readonly lockTimeoutMs = 10 * 60 * 1000; // 10分钟超时
  private cleanupInterval: NodeJS.Timeout;
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // 5分钟清理一次

  constructor(dataDir?: string) {
    // 使用与 SlackThreadMapper 相同的目录
    const baseDir = dataDir || path.join(os.homedir(), '.claude-agent');
    const locksDir = path.join(baseDir, 'slack-session-locks');

    if (!fs.existsSync(locksDir)) {
      fs.mkdirSync(locksDir, { recursive: true });
    }

    this.locksDir = locksDir;

    // 启动定期清理
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleLocks();
    }, this.cleanupIntervalMs);

    console.log(`📋 SlackSessionLock initialized with locks directory: ${this.locksDir}`);
  }

  /**
   * 获取锁文件路径
   */
  private getLockFilePath(sessionId: string): string {
    // 使用安全的文件名（移除特殊字符）
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.locksDir, `${safeSessionId}.lock`);
  }

  /**
   * 尝试获取会话锁
   * @param sessionId 会话ID
   * @param lockInfo 锁信息
   * @returns 是否成功获取锁
   */
  tryAcquireLock(sessionId: string, lockInfo: Omit<SessionLockInfo, 'lockTime' | 'processId'>): boolean {
    const lockFilePath = this.getLockFilePath(sessionId);

    // 检查锁文件是否已存在
    if (fs.existsSync(lockFilePath)) {
      const existingLock = this.readLockFile(lockFilePath);
      if (existingLock) {
        // 检查锁是否过期
        if (Date.now() - existingLock.lockTime < this.lockTimeoutMs) {
          // 锁未过期，检查进程是否还存在
          if (this.isProcessAlive(existingLock.processId)) {
            console.log(`🔒 Session ${sessionId} is locked by active process ${existingLock.processId}`);
            return false;
          } else {
            console.log(`🔓 Process ${existingLock.processId} for session ${sessionId} is dead, removing stale lock`);
            fs.unlinkSync(lockFilePath);
          }
        } else {
          console.log(`🔓 Lock for session ${sessionId} is expired, removing`);
          fs.unlinkSync(lockFilePath);
        }
      }
    }

    // 创建新锁
    const lockData: SessionLockInfo = {
      ...lockInfo,
      lockTime: Date.now(),
      processId: process.pid
    };

    try {
      fs.writeFileSync(lockFilePath, JSON.stringify(lockData, null, 2), 'utf8');
      console.log(`🔒 Acquired lock for session ${sessionId} by process ${process.pid}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create lock file for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * 释放会话锁
   * @param sessionId 会话ID
   * @returns 是否成功释放锁
   */
  releaseLock(sessionId: string): boolean {
    const lockFilePath = this.getLockFilePath(sessionId);

    if (!fs.existsSync(lockFilePath)) {
      console.log(`⚠️  No lock file found for session ${sessionId}`);
      return false;
    }

    try {
      const lockData = this.readLockFile(lockFilePath);
      if (lockData && lockData.processId === process.pid) {
        fs.unlinkSync(lockFilePath);
        console.log(`🔓 Released lock for session ${sessionId} by process ${process.pid}`);
        return true;
      } else if (lockData) {
        console.log(`⚠️  Lock for session ${sessionId} belongs to different process ${lockData.processId}, not releasing`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to release lock for session ${sessionId}:`, error);
    }

    return false;
  }

  /**
   * 检查会话是否被锁定
   * @param sessionId 会话ID
   * @param validateSession 是否验证Claude会话实例是否存在
   * @returns 锁定状态信息
   */
  isSessionLocked(sessionId: string, validateSession: boolean = true): { locked: boolean; reason?: string } {
    const lockFilePath = this.getLockFilePath(sessionId);

    if (!fs.existsSync(lockFilePath)) {
      return { locked: false };
    }

    const lockData = this.readLockFile(lockFilePath);
    if (!lockData) {
      return { locked: false, reason: 'Invalid lock file' };
    }

    // 检查锁是否过期
    if (Date.now() - lockData.lockTime > this.lockTimeoutMs) {
      console.log(`🔓 Lock for session ${sessionId} is expired (${Date.now() - lockData.lockTime}ms old)`);
      try {
        fs.unlinkSync(lockFilePath);
      } catch (error) {
        console.error(`❌ Failed to remove expired lock file:`, error);
      }
      return { locked: false, reason: 'Lock expired' };
    }

    // 检查进程是否存活
    if (!this.isProcessAlive(lockData.processId)) {
      console.log(`🔓 Process ${lockData.processId} for session ${sessionId} is dead, removing stale lock`);
      try {
        fs.unlinkSync(lockFilePath);
      } catch (error) {
        console.error(`❌ Failed to remove stale lock file:`, error);
      }
      return { locked: false, reason: 'Process dead' };
    }

    // 如果要求验证会话实例，检查Claude会话是否存在
    if (validateSession) {
      try {
        // 动态导入sessionManager来避免循环依赖
        const { sessionManager } = require('./sessionManager.js');
        const claudeSession = sessionManager.getSession(sessionId);

        if (!claudeSession) {
          console.log(`🔓 Claude session ${sessionId} does not exist, removing lock`);
          try {
            fs.unlinkSync(lockFilePath);
          } catch (error) {
            console.error(`❌ Failed to remove lock for non-existent session:`, error);
          }
          return { locked: false, reason: 'Session not found' };
        }
      } catch (error) {
        console.error(`❌ Failed to validate session ${sessionId}:`, error);
        // 如果验证失败，保守处理：认为锁定
        return { locked: true, reason: 'Session validation failed' };
      }
    }

    return {
      locked: true,
      reason: `Locked by process ${lockData.processId}`
    };
  }

  /**
   * 读取锁文件
   */
  private readLockFile(lockFilePath: string): SessionLockInfo | null {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      return JSON.parse(content) as SessionLockInfo;
    } catch (error) {
      console.error(`❌ Failed to read lock file ${lockFilePath}:`, error);
      return null;
    }
  }

  /**
   * 检查进程是否存活
   */
  private isProcessAlive(pid: number): boolean {
    try {
      // 在Unix系统上，向进程发送0信号可以检查进程是否存在
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // 如果进程不存在，会抛出错误
      return false;
    }
  }

  /**
   * 清理过期的锁文件
   */
  private cleanupStaleLocks(): void {
    try {
      if (!fs.existsSync(this.locksDir)) {
        return;
      }

      const lockFiles = fs.readdirSync(this.locksDir);
      let cleanedCount = 0;

      for (const filename of lockFiles) {
        if (!filename.endsWith('.lock')) {
          continue;
        }

        const lockFilePath = path.join(this.locksDir, filename);
        const lockData = this.readLockFile(lockFilePath);

        if (!lockData) {
          // 无效的锁文件，直接删除
          try {
            fs.unlinkSync(lockFilePath);
            cleanedCount++;
          } catch (error) {
            console.error(`❌ Failed to remove invalid lock file ${filename}:`, error);
          }
          continue;
        }

        // 检查是否过期
        const isExpired = Date.now() - lockData.lockTime > this.lockTimeoutMs;
        const isProcessDead = !this.isProcessAlive(lockData.processId);

        if (isExpired || isProcessDead) {
          const reason = isExpired ? 'expired' : 'dead process';
          console.log(`🧹 Removing stale lock ${filename} (${reason})`);

          try {
            fs.unlinkSync(lockFilePath);
            cleanedCount++;
          } catch (error) {
            console.error(`❌ Failed to remove stale lock file ${filename}:`, error);
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} stale session locks`);
      }
    } catch (error) {
      console.error('❌ Error during lock cleanup:', error);
    }
  }

  /**
   * 获取所有活跃的锁信息
   */
  getAllActiveLocks(): SessionLockInfo[] {
    const activeLocks: SessionLockInfo[] = [];

    try {
      if (!fs.existsSync(this.locksDir)) {
        return activeLocks;
      }

      const lockFiles = fs.readdirSync(this.locksDir);

      for (const filename of lockFiles) {
        if (!filename.endsWith('.lock')) {
          continue;
        }

        const lockFilePath = path.join(this.locksDir, filename);
        const lockData = this.readLockFile(lockFilePath);

        if (lockData) {
          const isExpired = Date.now() - lockData.lockTime > this.lockTimeoutMs;
          const isProcessAlive = this.isProcessAlive(lockData.processId);

          if (!isExpired && isProcessAlive) {
            activeLocks.push(lockData);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error reading active locks:', error);
    }

    return activeLocks;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalLocks: number;
    activeLocks: number;
    oldestLockAge: number;
    newestLockAge: number;
  } {
    const allLocks = this.getAllActiveLocks();
    const now = Date.now();

    if (allLocks.length === 0) {
      return {
        totalLocks: 0,
        activeLocks: 0,
        oldestLockAge: 0,
        newestLockAge: 0
      };
    }

    const ages = allLocks.map(lock => now - lock.lockTime);

    return {
      totalLocks: allLocks.length,
      activeLocks: allLocks.length,
      oldestLockAge: Math.max(...ages),
      newestLockAge: Math.min(...ages)
    };
  }

  /**
   * 关闭锁管理器
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    console.log('✅ SlackSessionLock shutdown complete');
  }
}

// 全局单例
export const slackSessionLock = new SlackSessionLock();