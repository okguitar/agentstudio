// 临时调试脚本：检查 SessionManager 状态
const { sessionManager } = require('./dist/services/sessionManager');

console.log('=== SessionManager 状态检查 ===\n');

// 获取所有会话信息
const sessionsInfo = sessionManager.getSessionsInfo();
const activeCount = sessionManager.getActiveSessionCount();

console.log(`活跃会话总数: ${activeCount}\n`);

if (sessionsInfo.length === 0) {
  console.log('✅ 没有活跃会话');
} else {
  console.log(`发现 ${sessionsInfo.length} 个会话:\n`);

  sessionsInfo.forEach((session, index) => {
    console.log(`--- 会话 ${index + 1} ---`);
    console.log(`Session ID: ${session.sessionId}`);
    console.log(`Agent ID: ${session.agentId}`);
    console.log(`状态: ${session.status}`);
    console.log(`是否活跃: ${session.isActive}`);
    console.log(`最后活动时间: ${new Date(session.lastActivity).toLocaleString('zh-CN')}`);
    console.log(`空闲时间: ${Math.floor(session.idleTimeMs / 1000)}秒`);

    if (session.lastHeartbeat) {
      console.log(`最后心跳: ${new Date(session.lastHeartbeat).toLocaleString('zh-CN')}`);
      console.log(`心跳超时: ${session.heartbeatTimedOut ? '是' : '否'}`);
    } else {
      console.log(`心跳记录: 无`);
    }

    if (session.projectPath) {
      console.log(`项目路径: ${session.projectPath}`);
    }

    if (session.claudeVersionId) {
      console.log(`Claude版本: ${session.claudeVersionId}`);
    }

    if (session.modelId) {
      console.log(`模型: ${session.modelId}`);
    }

    console.log('');
  });

  // 统计状态
  const confirmedCount = sessionsInfo.filter(s => s.status === 'confirmed').length;
  const pendingCount = sessionsInfo.filter(s => s.status === 'pending').length;
  const timeoutCount = sessionsInfo.filter(s => s.heartbeatTimedOut).length;

  console.log('=== 统计信息 ===');
  console.log(`已确认会话: ${confirmedCount}`);
  console.log(`待确认会话(Pending): ${pendingCount}`);
  console.log(`心跳超时会话: ${timeoutCount}`);
}

console.log('\n脚本执行完毕。');
process.exit(0);
