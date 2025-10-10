# AgentStudio

<div align="center">

![AgentStudio](./frontend/public/cc-studio.png)

**基于 Claude Code 的个人智能体工作平台**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![GitHub stars](https://img.shields.io/github/stars/git-men/agentstudio.svg)](https://github.com/git-men/agentstudio/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/git-men/agentstudio.svg)](https://github.com/git-men/agentstudio/issues)

[English](README.md) | [中文](README.zh-CN.md)

</div>

---

## 概述

AgentStudio 是一个基于 Claude Code SDK 构建的现代化个人智能体工作平台。它通过专业的 Web 界面扩展了 Claude Code 的功能，让 AI 驱动的开发对所有人都变得触手可及。

## ✨ 核心特性

### 🎨 **现代化 Web 界面**
- 专业直观的 Web UI，适合开发者和普通用户
- 实时流式响应，提供即时反馈
- 分屏布局，聊天界面与实时预览
- 响应式设计，支持桌面和移动端

### 🤖 **多模型支持**
- **Claude 集成**：基于 Claude Code SDK，全面 API 支持
- **多厂商支持**：支持 OpenAI、GLM、DeepSeek 等主流 LLM
- **灵活配置**：轻松切换不同 AI 模型
- **流式输入**：实时响应流，提升用户体验

### 🛠️ **高级智能体系统**
- **内置智能体**：PPT 编辑器、代码助手、文档写作器
- **自定义智能体**：创建和配置专门的智能体
- **子智能体**：用户定义的 AI 智能体，支持自定义系统提示词
- **智能体市场**：可扩展的智能体开发框架
- **消息级工具定制**：精细化控制智能体能力

### 📁 **集成文件管理**
- **内置文件浏览器**：无缝导航和管理项目文件
- **文件内容查看器**：直接在界面中预览和编辑文件
- **项目感知操作**：上下文敏感的文件操作
- **版本控制集成**：支持 Git 的文件管理

### 🎯 **专业工具**
- **幻灯片智能体**：AI 辅助创建和编辑演示文稿
- **代码探索器**：智能搜索导航代码库
- **文档大纲**：结构化文档编辑和管理
- **图片上传**：支持视觉内容分析
- **工具渲染器**：动态可视化工具使用和结果

### 🔧 **开发者友好**
- **全栈 TypeScript**：完整类型安全，提升开发体验
- **现代技术栈**：React 18、Vite、TailwindCSS、Zustand
- **测试套件**：Vitest 全面测试覆盖
- **热重载**：即时代码更新的快速开发

### 🌐 **部署就绪**
- **本地开发**：开发环境简易设置
- **一键安装**：终端用户简化部署
- **生产构建**：性能优化的构建
- **跨平台**：支持 Linux、macOS 和 Windows

## 🚀 快速开始

### 🐳 Docker 部署（推荐快速测试）

**一行命令启动：**

```bash
# 构建并运行
docker build -t agentstudio:latest .
docker-compose up -d
```

然后在浏览器中打开 http://localhost

**你将获得：**
- ✅ **一体化容器**：前端 + 后端在单个容器中
- ✅ **数据持久化**：通过 Docker volume 自动备份数据
- ✅ **零配置**：开箱即用
- ✅ **轻松更新**：简单的重新构建和重启

📖 **完整文档：**
- [Docker 部署指南](DOCKER.md) - 详细的设置和配置说明
- [快速入门指南](QUICKSTART.md) - 包含示例的分步教程

---

### 普通用户（一键安装）

**🐧 Linux & 🍎 macOS - 用户空间安装（推荐 - 无需 sudo）**

```bash
# 在用户空间安装 Agent Studio 后端
curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | bash
```

安装程序会：
- ✅ **自动检测并安装 Node.js 18+**（通过系统包管理器或 NVM）
- ✅ **自动安装 pnpm** 以获得更快的包管理性能（可选）
- ✅ **自动处理所有依赖项**
- ✅ **支持所有主流 Linux 发行版**（Ubuntu、CentOS、Fedora、Arch 等）
- ✅ **支持 root 用户和普通用户**

安装程序会询问是否立即启动后端。如果选择暂不启动，稍后可以手动启动：

```bash
# 启动后端
~/.agent-studio/start.sh

# 停止后端
~/.agent-studio/stop.sh
```

**🪟 Windows - PowerShell 安装**

```powershell
# 以管理员身份在 PowerShell 中运行
PowerShell -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/windows-install.ps1'))"
```

Windows 安装程序会：
- ✅ **自动安装 Node.js**（通过 Chocolatey、winget 或直接下载）
- ✅ **自动安装 Git**（如果未安装）
- ✅ **自动处理所有依赖项**
- ✅ **创建启动/停止批处理脚本**

**Windows 备选方案 - 简化批处理脚本**
如果您已经安装了 Node.js 和 Git：

```batch
# 下载并运行简化安装程序
curl -o windows-install-simple.bat https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/windows-install-simple.bat
windows-install-simple.bat
```

**访问应用：**
1. 打开浏览器访问：**https://agentstudio-frontend.vercel.app/**
2. 在 Web 界面中，进入 **设置 → API 配置**
3. 输入后端地址：`http://localhost:4936`
4. 点击"测试连接"验证

**方式二：系统服务安装（需要 sudo）**

用于生产部署，支持开机自动启动：

```bash
# 安装为系统服务，支持开机自启
curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | sudo bash
```

安装完成后，管理服务：
```bash
agent-studio start    # 启动服务
agent-studio stop     # 停止服务
agent-studio restart  # 重启服务
agent-studio status   # 查看状态
agent-studio logs     # 查看日志
agent-studio config   # 编辑配置
```

然后访问 **https://agentstudio-frontend.vercel.app/** 并在设置中配置后端地址。

### 开发者（开发环境设置）

**前置要求：**
- Node.js 18+
- pnpm（推荐）或 npm
- Git

**安装步骤：**
```bash
# 克隆仓库
git clone https://github.com/git-men/agentstudio.git
cd agentstudio

# 安装依赖
pnpm install

# 启动开发服务器（前后端同时启动）
pnpm run dev

# 或者分别启动
pnpm run dev:frontend  # 仅前端（端口 3000）
pnpm run dev:backend   # 仅后端（端口 4936）
```

**生产构建：**
```bash
pnpm run build
pnpm start
```

## 📁 项目结构

```
agentstudio/
├── frontend/           # React 前端应用
│   ├── src/
│   │   ├── components/ # 可复用 UI 组件
│   │   ├── pages/      # 页面组件
│   │   ├── agents/     # 智能体相关组件
│   │   ├── hooks/      # React hooks 和数据获取
│   │   └── stores/     # 状态管理（Zustand）
│   └── public/         # 静态资源
├── backend/            # Node.js 后端服务
│   ├── src/
│   │   ├── routes/     # API 端点
│   │   ├── services/   # 业务逻辑
│   │   └── index.ts    # 服务入口
│   └── dist/           # 构建后的代码
├── shared/             # 共享类型和工具
└── scripts/            # 安装和部署脚本
```

## ⚙️ 配置

### 环境变量

**开发环境：**
在 `backend/` 目录创建 `.env` 文件：

```env
# AI 提供商配置（选择一个或多个）
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# 服务器配置
PORT=4936
NODE_ENV=development

# 文件系统
SLIDES_DIR=../slides

# CORS 配置（生产环境）
CORS_ORIGINS=https://your-frontend-domain.com
```

**系统服务安装：**
编辑配置文件 `~/.agent-studio-config/config.env`：

```bash
# 编辑配置（仅系统服务安装）
agent-studio config
```

配置选项：
```env
# 服务器配置
NODE_ENV=production
PORT=4936
SLIDES_DIR=~/slides

# 可选：AI 提供商密钥（按需配置）
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here

# 可选：CORS 配置（自定义前端）
# CORS_ORIGINS=https://your-frontend.vercel.app,https://custom-domain.com
```

### API 配置

前端托管在 **https://agentstudio-frontend.vercel.app/**，可以连接不同的后端实例：

**本地后端：**
1. 在 Web 界面中打开 **设置 → API 配置**
2. 输入：`http://localhost:4936`（或自定义端口）
3. 点击"测试连接"验证

**远程后端：**
1. 将后端部署到具有公网 IP 或域名的服务器
2. 在设置中配置后端地址（例如：`https://your-backend.com`）
3. 确保后端的 `.env` 文件中正确配置了 CORS

## 📋 服务管理

### 系统服务命令（使用 sudo 安装时）

```bash
# 基本服务操作
agent-studio start      # 启动服务
agent-studio stop       # 停止服务
agent-studio restart    # 重启服务
agent-studio status     # 查看状态

# 监控和日志
agent-studio logs       # 查看实时日志

# 配置管理
agent-studio config     # 编辑配置文件

# 服务管理
agent-studio uninstall  # 卸载服务
```

### 服务详情

**安装目录：**

用户空间安装（无 sudo）：
- 应用程序：`~/.agent-studio`
- 配置文件：`~/.agent-studio-config/config.env`
- 日志目录：`~/.agent-studio-logs/`
- 幻灯片：`~/slides`
- 启动脚本：`~/.agent-studio/start.sh`
- 停止脚本：`~/.agent-studio/stop.sh`

系统服务安装（使用 sudo）：
- 应用程序：`~/.agent-studio`
- 配置文件：`~/.agent-studio-config/config.env`
- 日志目录：`~/.agent-studio-logs/`
- 幻灯片：`~/slides`

**日志文件：**
- 输出日志：`~/.agent-studio-logs/output.log`
- 错误日志：`~/.agent-studio-logs/error.log`
- 日志轮转：每日（保留 30 天）

**服务集成：**
- Linux：systemd 服务（`/etc/systemd/system/agent-studio.service`）
- macOS：launchd 服务（`/Library/LaunchDaemons/com.agent-studio.backend.plist`）
- 默认开机自启

## 🔧 故障排除

### 安装问题

**Node.js 安装问题：**
安装程序会自动处理 Node.js 安装，但如果遇到问题：

```bash
# Linux/macOS - 通过 NVM 手动安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts

# Windows - 从官网下载
# 访问：https://nodejs.org/
```

**Ubuntu/Debian 特定问题：**
- **Root 用户检测**：最新安装程序已修复 - 现在正确支持 root 用户和普通用户
- **TTY 问题**：安装程序设置 `CI=true` 处理非交互式环境
- **构建失败**：安装程序自动使用开发依赖重试

**Windows 安装问题：**
- **PowerShell 执行策略**：运行 `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- **缺少依赖**：安装程序会提示安装 Node.js、Git 和其他必需组件
- **权限问题**：以管理员身份运行 PowerShell 进行系统级安装

### 服务无法启动

**用户空间安装：**
```bash
# 检查后端是否运行
curl http://localhost:4936/api/health

# 查看日志
cat ~/.agent-studio-logs/output.log
cat ~/.agent-studio-logs/error.log

# 重启后端
~/.agent-studio/stop.sh
~/.agent-studio/start.sh
```

**系统服务安装：**
```bash
# 检查服务状态
agent-studio status

# 查看日志中的错误
agent-studio logs

# 验证配置
agent-studio config

# 检查端口是否可用
lsof -i :4936
```

### 常见问题

**权限错误（用户安装）：**
```bash
# 修复脚本权限
chmod +x ~/.agent-studio/start.sh
chmod +x ~/.agent-studio/stop.sh

# 修复目录权限
chmod -R 755 ~/.agent-studio
```

**权限错误（系统服务）：**
```bash
sudo chown -R agent-studio:agent-studio /opt/agent-studio
sudo chown -R agent-studio:agent-studio /var/log/agent-studio
```

**端口被占用：**
```bash
# 查找占用端口的进程
lsof -i :4936

# 终止进程（将 PID 替换为实际进程 ID）
kill -9 <PID>

# 或在配置中更改端口
# 编辑 ~/.agent-studio-config/config.env 并更改 PORT=8080
```

**构建失败：**
安装程序现在自动处理构建失败：
1. 安装开发依赖
2. 重试构建
3. 如果构建仍然失败，回退到开发模式

**健康检查：**
```bash
# 用户安装
curl http://localhost:4936/api/health

# 系统服务
agent-studio health
```

**Windows 特定问题：**
```batch
REM 检查 Node.js 是否可用
node --version

REM 检查后端是否运行
curl http://localhost:4936/api/health

REM 手动启动后端
cd %USERPROFILE%\.agent-studio
start.bat

REM 停止后端
stop.bat
```

## 📦 更新

更新已安装的服务：

```bash
# 停止服务
~/.agent-studio/stop.sh

# 更新代码
cd ~/.agent-studio
git pull
pnpm install
pnpm run build:backend

# 启动服务
~/.agent-studio/start.sh
```

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 仅运行前端测试
cd frontend && pnpm test

# 运行测试并生成覆盖率报告
cd frontend && pnpm run test:coverage

# 使用 UI 运行测试
cd frontend && pnpm run test:ui
```

## 🛡️ 安全

- **API 密钥保护**：基于环境变量的 API 密钥管理
- **CORS 配置**：可配置的跨域策略
- **输入验证**：全面的输入清理
- **安全文件操作**：沙箱化的文件系统访问

## 🤝 贡献

我们欢迎贡献！请查看我们的[贡献指南](CONTRIBUTING.md)了解详情。

1. Fork 仓库
2. 创建特性分支（`git checkout -b feature/amazing-feature`）
3. 提交更改（`git commit -m 'Add amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 基于 [Claude Code SDK](https://claude.ai/code) 构建
- 受现代开发工作流启发
- 社区反馈和贡献

---

## 📞 支持

- 📖 [文档](https://github.com/git-men/agentstudio/wiki)
- 🐛 [问题报告](https://github.com/git-men/agentstudio/issues)
- 💬 [讨论区](https://github.com/git-men/agentstudio/discussions)


## Links

| link | type | service | description |
|:---|:---|:---|:---|
| **[ctok.ai](https://ctok.ai/)** | 🤝 community | <small>✅ Claude Code<br>✅ Codex CLI</small> | 热心网友提供 Claude Code / Codex CLI 拼车服务
