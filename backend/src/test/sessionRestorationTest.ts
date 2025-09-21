#!/usr/bin/env node

/**
 * 会话恢复测试脚本
 * 用于测试各种会话恢复场景
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { SessionManager } from '../services/sessionManager.js';
import { ClaudeSession } from '../services/claudeSession.js';
import { Options } from '@anthropic-ai/claude-code';

class SessionRestorationTester {
  private sessionManager: SessionManager;
  private testProjectPath = '/Users/kongjie/slides/ai-editor';
  private testSessionId = 'test_session_123';
  private testAgentId = 'general-chat';

  constructor() {
    this.sessionManager = new SessionManager();
  }

  /**
   * 测试场景1: 正常会话恢复
   */
  async testNormalSessionRestoration() {
    console.log('\n🧪 测试场景1: 正常会话恢复');
    console.log('=================================');

    try {
      // 1. 创建模拟的会话历史文件
      await this.createMockSessionHistory(this.testSessionId);
      
      // 2. 检查会话是否存在
      const exists = this.sessionManager.checkSessionExists(this.testSessionId, this.testProjectPath);
      console.log(`会话存在检查结果: ${exists}`);
      
      if (!exists) {
        console.log('❌ 会话历史文件创建失败');
        return false;
      }

      // 3. 尝试恢复会话
      const queryOptions: Options = {
        customSystemPrompt: 'You are a helpful assistant.',
        allowedTools: ['Write', 'Read'],
        maxTurns: 10,
        cwd: this.testProjectPath,
        permissionMode: 'default',
        model: 'sonnet'
      };

      const session = this.sessionManager.createNewSession(
        this.testAgentId, 
        queryOptions, 
        this.testSessionId
      );

      console.log(`✅ 会话恢复成功，Agent ID: ${session.getAgentId()}`);

      // 4. 清理
      await this.cleanupMockSession(this.testSessionId);
      return true;

    } catch (error) {
      console.error('❌ 正常会话恢复测试失败:', error);
      return false;
    }
  }

  /**
   * 测试场景2: 内存中现有会话
   */
  async testExistingMemorySession() {
    console.log('\n🧪 测试场景2: 内存中现有会话');
    console.log('=================================');

    try {
      // 1. 创建新会话
      const queryOptions: Options = {
        customSystemPrompt: 'You are a helpful assistant.',
        allowedTools: ['Write', 'Read'],
        maxTurns: 10,
        cwd: this.testProjectPath,
        permissionMode: 'default',
        model: 'sonnet'
      };

      const session = this.sessionManager.createNewSession(this.testAgentId, queryOptions);
      const sessionId = `temp_${Date.now()}`;
      
      // 手动确认会话ID（模拟正常流程）
      this.sessionManager.confirmSessionId(session, sessionId);

      // 2. 尝试获取现有会话
      const existingSession = this.sessionManager.getSession(sessionId);
      
      if (existingSession) {
        console.log(`✅ 成功获取内存中的会话，Agent ID: ${existingSession.getAgentId()}`);
        return true;
      } else {
        console.log('❌ 未能获取内存中的会话');
        return false;
      }

    } catch (error) {
      console.error('❌ 内存中现有会话测试失败:', error);
      return false;
    }
  }

  /**
   * 测试场景3: 会话不存在但提供了sessionId
   */
  async testNonExistentSession() {
    console.log('\n🧪 测试场景3: 会话不存在但提供了sessionId');
    console.log('=================================');

    try {
      // 1. 使用不存在的sessionId
      const nonExistentSessionId = 'non_existent_session_456';
      
      // 2. 检查会话是否存在
      const exists = this.sessionManager.checkSessionExists(nonExistentSessionId, this.testProjectPath);
      console.log(`会话存在检查结果: ${exists}`);

      if (exists) {
        console.log('❌ 意外：不存在的会话被找到了');
        return false;
      }

      // 3. 尝试创建会话（系统应该创建新会话）
      const queryOptions: Options = {
        customSystemPrompt: 'You are a helpful assistant.',
        allowedTools: ['Write', 'Read'],
        maxTurns: 10,
        cwd: this.testProjectPath,
        permissionMode: 'default',
        model: 'sonnet'
      };

      const session = this.sessionManager.createNewSession(this.testAgentId, queryOptions);
      console.log(`✅ 对于不存在的会话，系统创建了新会话，Agent ID: ${session.getAgentId()}`);

      return true;

    } catch (error) {
      console.error('❌ 不存在会话测试失败:', error);
      return false;
    }
  }

  /**
   * 测试场景4: 新会话创建
   */
  async testNewSessionCreation() {
    console.log('\n🧪 测试场景4: 新会话创建');
    console.log('=================================');

    try {
      // 1. 不提供sessionId，创建新会话
      const queryOptions: Options = {
        customSystemPrompt: 'You are a helpful assistant.',
        allowedTools: ['Write', 'Read'],
        maxTurns: 10,
        cwd: this.testProjectPath,
        permissionMode: 'default',
        model: 'sonnet'
      };

      const session = this.sessionManager.createNewSession(this.testAgentId, queryOptions);
      console.log(`✅ 新会话创建成功，Agent ID: ${session.getAgentId()}`);

      // 验证会话状态
      const isActive = session.isSessionActive();
      console.log(`会话活跃状态: ${isActive}`);

      return isActive;

    } catch (error) {
      console.error('❌ 新会话创建测试失败:', error);
      return false;
    }
  }

  /**
   * 测试场景5: 会话管理器状态检查
   */
  async testSessionManagerStatus() {
    console.log('\n🧪 测试场景5: 会话管理器状态检查');
    console.log('=================================');

    try {
      // 1. 获取活跃会话数量
      const activeCount = this.sessionManager.getActiveSessionCount();
      console.log(`当前活跃会话数量: ${activeCount}`);

      // 2. 获取所有会话信息
      const sessionsInfo = this.sessionManager.getSessionsInfo();
      console.log(`会话详细信息数量: ${sessionsInfo.length}`);
      
      sessionsInfo.forEach((info: any, index: number) => {
        console.log(`会话 ${index + 1}:`);
        console.log(`  - Session ID: ${info.sessionId}`);
        console.log(`  - Agent ID: ${info.agentId}`);
        console.log(`  - 状态: ${info.status}`);
        console.log(`  - 活跃: ${info.isActive}`);
        console.log(`  - 空闲时间: ${Math.round(info.idleTimeMs / 1000)}秒`);
      });

      return true;

    } catch (error) {
      console.error('❌ 会话管理器状态检查失败:', error);
      return false;
    }
  }

  /**
   * 创建模拟的会话历史文件
   */
  private async createMockSessionHistory(sessionId: string): Promise<void> {
    const claudeProjectPath = this.testProjectPath.replace(/\//g, '-');
    const homeDir = os.homedir();
    const historyDir = path.join(homeDir, '.claude', 'projects', claudeProjectPath);
    const sessionFile = path.join(historyDir, `${sessionId}.jsonl`);

    // 确保目录存在
    fs.mkdirSync(historyDir, { recursive: true });

    // 创建模拟的会话历史内容
    const mockHistory = [
      JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }]
        },
        timestamp: Date.now()
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hi there!' }]
        },
        timestamp: Date.now()
      })
    ].join('\n');

    fs.writeFileSync(sessionFile, mockHistory);
    console.log(`📝 创建模拟会话历史文件: ${sessionFile}`);
  }

  /**
   * 清理模拟的会话文件
   */
  private async cleanupMockSession(sessionId: string): Promise<void> {
    const claudeProjectPath = this.testProjectPath.replace(/\//g, '-');
    const homeDir = os.homedir();
    const historyDir = path.join(homeDir, '.claude', 'projects', claudeProjectPath);
    const sessionFile = path.join(historyDir, `${sessionId}.jsonl`);

    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
      console.log(`🗑️  清理模拟会话文件: ${sessionFile}`);
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🚀 开始会话恢复测试');
    console.log('=============================');

    const tests = [
      this.testNormalSessionRestoration.bind(this),
      this.testExistingMemorySession.bind(this),
      this.testNonExistentSession.bind(this),
      this.testNewSessionCreation.bind(this),
      this.testSessionManagerStatus.bind(this)
    ];

    const results = [];
    for (const test of tests) {
      try {
        const result = await test();
        results.push(result);
      } catch (error) {
        console.error('测试执行出错:', error);
        results.push(false);
      }
    }

    console.log('\n📊 测试结果汇总');
    console.log('=============================');
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`通过: ${passed}/${total}`);
    console.log(`成功率: ${Math.round((passed / total) * 100)}%`);

    if (passed === total) {
      console.log('🎉 所有测试通过！');
    } else {
      console.log('⚠️  部分测试失败，请检查上述错误信息');
    }

    // 清理资源
    await this.sessionManager.shutdown();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SessionRestorationTester();
  tester.runAllTests().catch(console.error);
}

export { SessionRestorationTester };