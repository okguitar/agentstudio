# AI Editor 开发和维护工具

## 概述

这个目录包含了 AI Editor 的开发和维护工具。

## 清理重复系统版本工具 (cleanup-duplicate-system-versions.js)

### 用途

修复由于并发初始化导致的重复系统 Claude 版本问题。如果你在供应商管理页面看到多个 "System Claude (system)" 条目，使用这个工具可以清理重复数据。

### 使用方法

```bash
# 在 backend 目录下运行
node scripts/cleanup-duplicate-system-versions.js

# 或者在任何位置直接运行
node /path/to/backend/scripts/cleanup-duplicate-system-versions.js
```

### 工作原理

1. **检查版本配置**: 读取 `~/.claude-agent/claude-versions.json`
2. **查找重复**: 找出所有标记为 `isSystem: true` 的版本
3. **保留第一个**: 保留最早创建的系统版本
4. **删除重复**: 移除其他重复的系统版本
5. **自动备份**: 清理前自动备份原文件

### 安全性

- ✅ **自动备份**: 清理前会自动创建备份文件
- ✅ **详细输出**: 显示所有将要删除的版本信息
- ✅ **可恢复**: 如果出错，可以从备份文件恢复

### 输出示例

```
🔍 检查重复的系统 Claude 版本...

📊 当前共有 3 个版本

当前版本列表：
  1. system (claude)
     - isSystem: true
     - executablePath: /usr/local/bin/claude
     
  2. system (m8k3n2p4)
     - isSystem: true
     - executablePath: /usr/local/bin/claude
     
  3. my-custom (abc123)
     - isSystem: false
     - executablePath: /opt/claude/bin/claude

⚠️ 发现 2 个系统版本（重复）

✅ 将保留: system (claude)
   - 创建时间: 2025-12-01T10:00:00.000Z
   - 可执行路径: /usr/local/bin/claude

🗑️ 将删除以下重复版本:
   - system (m8k3n2p4)
     创建时间: 2025-12-01T10:00:05.000Z
     可执行路径: /usr/local/bin/claude

💾 已备份原文件到: /Users/user/.claude-agent/claude-versions.json.backup.1733054400000

✅ 清理完成！

📊 清理后共有 2 个版本
```

### 恢复备份

如果清理后出现问题，可以从备份恢复：

```bash
# 找到最新的备份文件
ls -lt ~/.claude-agent/claude-versions.json.backup.*

# 恢复备份
cp ~/.claude-agent/claude-versions.json.backup.1733054400000 ~/.claude-agent/claude-versions.json
```

## 项目迁移工具 (migrate-projects.js)

### 用途

这是一个一次性的开发工具，用于扫描用户目录中的现有项目并将它们添加到代理配置中。主要用于：

- 首次部署时迁移已有的项目
- 开发过程中重新关联丢失的项目
- 故障恢复时重建项目索引

### 使用方法

```bash
# 在 backend 目录下运行
npm run migrate-projects

# 或者直接运行脚本
node scripts/migrate-projects.js
```

### 工作原理

1. **扫描项目目录**: 检查 `~/claude-code-projects/` 下的所有子目录
2. **识别代理会话**: 查找每个项目的 `.cc-sessions/` 目录中的代理子目录
3. **更新代理配置**: 将项目路径添加到对应代理的 `projects` 数组中
4. **保存配置**: 更新代理配置文件的时间戳并保存

### 安全性

- ✅ **只读操作**: 不会修改或删除任何项目文件
- ✅ **幂等性**: 可以安全地重复运行，不会重复添加项目
- ✅ **备份保护**: 只修改代理配置，不影响实际项目数据

### 输出示例

```
🚀 AI Editor 项目迁移工具
=====================================
🔍 开始扫描现有项目...
📁 找到 4 个项目目录

📂 检查项目: my-project
   👤 找到代理会话: code-assistant
   ✅ 添加项目到代理 code-assistant: /Users/user/claude-code-projects/my-project

💾 保存代理配置...
   ✅ 已保存代理: 代码助手 (2 个项目)

🎉 迁移完成！总共添加了 1 个项目
```

### 注意事项

- 这个工具设计为**开发时使用**，不应该集成到用户界面中
- 如果项目已经在代理配置中，会跳过不重复添加
- 工具会检查项目目录中是否存在 `.cc-sessions/` 来确认这是一个有效的AI Editor项目

### 故障排除

**问题**: 项目没有被检测到
- 检查项目目录是否包含 `.cc-sessions/` 目录
- 确认 `.cc-sessions/` 中有对应的代理目录

**问题**: 代理配置没有更新
- 检查文件权限，确保有写入 `~/.claude-agent/agents/` 的权限
- 查看控制台输出中的错误信息

**问题**: ES模块错误
- 确保使用 Node.js 16+ 版本
- 项目的 package.json 中应该有 `"type": "module"`
