# Claude Internal SDK 使用指南

本文档介绍如何在 AgentStudio 中使用 `claude-internal` SDK。

## 📋 概述

AgentStudio 支持两种 Claude SDK：

1. **`claude-code`** (默认) - 标准 Claude Code SDK，适合大多数场景
2. **`claude-internal`** (实验性) - Claude 内部 SDK，提供额外的高级功能

## 🚀 快速开始

### 1. 使用 claude-internal SDK 启动

```bash
# 使用 claude-internal SDK 启动
agentstudio start --sdk claude-internal

# 指定端口和 SDK
agentstudio start --port 8080 --sdk claude-internal

# 使用自定义配置文件
agentstudio start --sdk claude-internal --env /path/to/.env

# 仅启动 API 服务器（无前端）
agentstudio start --sdk claude-internal --api-only
```

### 2. 检查当前 SDK

启动时，AgentStudio 会显示当前使用的 SDK：

```
🚀 Starting AgentStudio...
   Version: 0.3.2
   SDK: claude-internal
   Mode: Full (frontend + API)
```

## 🔧 配置

### 环境变量

在 `.env` 文件中配置：

```env
# API Key（必需）
ANTHROPIC_API_KEY=your_api_key_here

# 服务器配置
PORT=4936
HOST=0.0.0.0

# SDK 配置（可选，通过 CLI 参数覆盖）
AGENT_SDK=claude-internal

# 数据目录
DATA_DIR=~/.agentstudio
```

### CLI 参数优先级

CLI 参数会覆盖环境变量：

```bash
# .env 中设置 AGENT_SDK=claude-code
# 但 CLI 指定 --sdk claude-internal
# 最终使用: claude-internal
agentstudio start --sdk claude-internal
```

## 📖 SDK 对比

| 特性 | claude-code | claude-internal |
|------|-------------|----------------|
| 基础对话 | ✅ | ✅ |
| 工具调用 | ✅ | ✅ |
| 流式响应 | ✅ | ✅ |
| 多模态输入 | ✅ | ✅ |
| MCP 集成 | ✅ | ✅ |
| A2A 通信 | ✅ | ✅ |
| 高级功能 | ❌ | ✅ |
| 实验性功能 | ❌ | ✅ |

## 🛠️ 使用场景

### 何时使用 claude-code（默认）
- ✅ 生产环境部署
- ✅ 稳定性优先
- ✅ 标准功能足够
- ✅ 不需要实验性功能

### 何时使用 claude-internal
- 🔬 开发和测试环境
- 🔬 需要高级/实验性功能
- 🔬 功能探索和原型开发
- 🔬 内部工具和测试

## 💡 最佳实践

### 1. 开发与生产分离

```bash
# 开发环境：使用 claude-internal 探索新功能
agentstudio start --sdk claude-internal --port 4936

# 生产环境：使用 claude-code 确保稳定性
agentstudio start --sdk claude-code --port 4936
```

### 2. 系统服务配置

安装为系统服务时指定 SDK：

```bash
# 安装服务并配置 SDK（需要手动编辑服务文件）
agentstudio install --port 4936

# 编辑服务配置文件
# macOS: ~/Library/LaunchAgents/cc.agentstudio.plist
# Linux: ~/.config/systemd/user/agentstudio.service

# 在启动参数中添加 --sdk claude-internal
```

#### macOS launchd 配置示例

编辑 `~/Library/LaunchAgents/cc.agentstudio.plist`：

```xml
<array>
    <string>/path/to/node</string>
    <string>/path/to/agentstudio</string>
    <string>start</string>
    <string>--port</string>
    <string>4936</string>
    <string>--sdk</string>
    <string>claude-internal</string>
</array>
```

#### Linux systemd 配置示例

编辑 `~/.config/systemd/user/agentstudio.service`：

```ini
[Service]
ExecStart=/path/to/node /path/to/agentstudio start --port 4936 --sdk claude-internal
```

重新加载服务：

```bash
# macOS
launchctl unload ~/Library/LaunchAgents/cc.agentstudio.plist
launchctl load ~/Library/LaunchAgents/cc.agentstudio.plist

# Linux
systemctl --user daemon-reload
systemctl --user restart agentstudio
```

### 3. 多实例部署

在不同端口上运行不同 SDK：

```bash
# 实例 1: claude-code (生产)
agentstudio start --sdk claude-code --port 4936 --data-dir ~/.agentstudio-prod

# 实例 2: claude-internal (开发)
agentstudio start --sdk claude-internal --port 4937 --data-dir ~/.agentstudio-dev
```

## 🔍 故障排查

### 问题：SDK 切换后功能异常

**解决方案**：
1. 检查 API Key 是否有效
2. 清除缓存并重启

```bash
# 停止服务
agentstudio service stop

# 清除缓存（可选）
rm -rf ~/.agentstudio/cache

# 使用指定 SDK 重启
agentstudio start --sdk claude-internal
```

### 问题：不确定当前使用的 SDK

**解决方案**：
查看启动日志或使用 info 命令

```bash
# 查看系统信息
agentstudio info

# 查看服务日志
agentstudio service logs
```

### 问题：想切换回 claude-code

**解决方案**：

```bash
# 直接指定 SDK 启动
agentstudio start --sdk claude-code

# 或不指定（默认使用 claude-code）
agentstudio start
```

## 📚 相关文档

- [用户手册](./USER_MANUAL.md)
- [API 文档](./API.md)
- [MCP 集成指南](./MCP.md)
- [A2A 通信指南](./A2A.md)

## ⚠️ 注意事项

1. **claude-internal 是实验性功能**
   - 可能包含未稳定的 API
   - 不建议在生产环境使用
   - API 可能会发生变化

2. **兼容性**
   - 两种 SDK 的数据格式完全兼容
   - 可以随时在两种 SDK 之间切换
   - 不会丢失历史会话数据

3. **性能考虑**
   - claude-internal 可能有额外的性能开销
   - 建议在测试环境中评估性能影响

## 🆘 获取帮助

如果遇到问题：

1. 查看[问题追踪器](https://github.com/okguitar/agentstudio/issues)
2. 运行诊断命令：`agentstudio doctor`
3. 查看服务日志：`agentstudio service logs`
4. 提交 Issue 并附上日志信息

---

**更新日期**: 2026-01-29  
**文档版本**: 1.0  
**适用版本**: AgentStudio 0.3.0+
