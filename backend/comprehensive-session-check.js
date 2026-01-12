// 全面的会话检查脚本
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=== 全面会话状态检查 ===\n');

// 1. 检查正在运行的后端服务的 SessionManager
try {
  const { sessionManager } = require('./dist/services/sessionManager');

  const sessionsInfo = sessionManager.getSessionsInfo();
  const activeCount = sessionManager.getActiveSessionCount();

  console.log('【1】后端 SessionManager 状态:');
  console.log(`   活跃会话总数: ${activeCount}`);

  if (sessionsInfo.length > 0) {
    console.log(`   发现 ${sessionsInfo.length} 个会话:`);

    const confirmedCount = sessionsInfo.filter(s => s.status === 'confirmed').length;
    const pendingCount = sessionsInfo.filter(s => s.status === 'pending').length;
    const timeoutCount = sessionsInfo.filter(s => s.heartbeatTimedOut).length;

    console.log(`   - 已确认: ${confirmedCount}`);
    console.log(`   - 待确认(Pending): ${pendingCount}`);
    console.log(`   - 心跳超时: ${timeoutCount}`);

    // 显示待确认的会话详情
    if (pendingCount > 0) {
      console.log('\n   待确认会话详情:');
      sessionsInfo
        .filter(s => s.status === 'pending')
        .forEach((session, idx) => {
          console.log(`   [${idx + 1}] Session: ${session.sessionId}`);
          console.log(`       Agent: ${session.agentId}`);
          console.log(`       空闲: ${Math.floor(session.idleTimeMs / 1000)}秒`);
        });
    }

    // 显示心跳超时的会话详情
    if (timeoutCount > 0) {
      console.log('\n   心跳超时会话详情:');
      sessionsInfo
        .filter(s => s.heartbeatTimedOut)
        .forEach((session, idx) => {
          console.log(`   [${idx + 1}] Session: ${session.sessionId}`);
          console.log(`       Agent: ${session.agentId}`);
          console.log(`       最后心跳: ${session.lastHeartbeat ? new Date(session.lastHeartbeat).toLocaleString('zh-CN') : '无'}`);
        });
    }
  } else {
    console.log('   ✅ 没有活跃会话');
  }
} catch (error) {
  console.log('   ❌ 无法连接到 SessionManager:', error.message);
}

console.log('\n');

// 2. 检查 Claude 历史文件
console.log('【2】Claude 历史文件检查:');
const claudeProjectPath = '/Users/kongjie/slides/ai-editor'.replace(/\//g, '-');
const historyDir = path.join(os.homedir(), '.claude', 'projects', claudeProjectPath);

if (fs.existsSync(historyDir)) {
  const files = fs.readdirSync(historyDir)
    .filter(file => file.endsWith('.jsonl'))
    .filter(file => !file.startsWith('agent-'));

  console.log(`   历史目录: ${historyDir}`);
  console.log(`   会话文件总数: ${files.length}`);

  // 统计文件大小
  const emptyFiles = [];
  const recentFiles = [];
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(historyDir, file);
    const stats = fs.statSync(filePath);

    if (stats.size === 0) {
      emptyFiles.push({
        name: file,
        mtime: stats.mtime
      });
    }

    if (stats.mtimeMs > oneHourAgo) {
      recentFiles.push({
        name: file,
        size: stats.size,
        mtime: stats.mtime
      });
    }
  });

  console.log(`   空文件数量: ${emptyFiles.length}`);
  if (emptyFiles.length > 0) {
    console.log('   空文件列表:');
    emptyFiles.forEach(f => {
      console.log(`   - ${f.name} (修改时间: ${f.mtime.toLocaleString('zh-CN')})`);
    });
  }

  console.log(`\n   最近1小时活跃文件: ${recentFiles.length}`);
  if (recentFiles.length > 0) {
    console.log('   最近活跃会话:');
    recentFiles
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5)
      .forEach(f => {
        console.log(`   - ${f.name} (${Math.floor(f.size / 1024)}KB, ${f.mtime.toLocaleString('zh-CN')})`);
      });
  }
} else {
  console.log(`   ❌ 历史目录不存在: ${historyDir}`);
}

console.log('\n');

// 3. 检查是否有进程锁文件或其他可能导致卡住的状态
console.log('【3】系统状态检查:');

// 检查是否有多个后端进程在运行
const { execSync } = require('child_process');
try {
  const processes = execSync('ps aux | grep "node.*backend" | grep -v grep', { encoding: 'utf-8' });
  const processLines = processes.trim().split('\n').filter(line => line.trim());
  console.log(`   后端Node进程数: ${processLines.length}`);
  if (processLines.length > 1) {
    console.log('   ⚠️  发现多个后端进程，可能存在冲突');
  }
} catch (error) {
  // ps命令没有找到进程
  console.log('   后端Node进程数: 0');
}

console.log('\n=== 检查完成 ===');
process.exit(0);
