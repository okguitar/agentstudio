# AgentStudio

<div align="center">

![AgentStudio](./frontend/public/cc-studio.png)

**Agent for Work — 本地的 Agent 工作台**

由 Claude Agent SDK 强力驱动

[![GPL v3 License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/okguitar/agentstudio.svg)](https://github.com/okguitar/agentstudio/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/okguitar/agentstudio.svg)](https://github.com/okguitar/agentstudio/issues)

[English](README.md) | [中文](README.zh-CN.md)

</div>

---

## 📖 项目简介

AgentStudio 是一个运行在你电脑上的**本地 Agent 工作台** —— 真正意义的私人 AI 助理。你的数据完全私有，安全可控，支持定时任务自动化和多 Agent 协作。

基于 Claude Agent SDK 构建，AgentStudio 将命令行体验转化为友好的 Web 界面，让 AI Agent 不再是开发者的专属，而是每个人都能使用的工作伙伴。

<div align="center">

![聊天界面](./frontend/public/screenshot-chat.png)

</div>

## 🚀 快速开始

使用 npm 安装并运行：

```bash
# 全局安装
npm install -g agentstudio

# 启动服务
agentstudio start
```

然后在浏览器中打开 [http://localhost:4936](http://localhost:4936) 即可。

**更多命令：**

```bash
agentstudio start --port 8080  # 自定义端口
agentstudio install            # 安装为系统服务（开机自启）
agentstudio upgrade            # 升级到最新版本
agentstudio doctor             # 检查系统状态
agentstudio --help             # 显示所有命令
```

## ✨ 核心特性

### 🖥️ 本地的 Agent 工作台

- **运行在你的电脑上** —— 真正意义的本地工作台
- **数据完全私有** —— 不上传云端
- **完全掌控** —— 文件、代码、对话记录都在你的掌控之中

### 🌐 Web 版交互体验

- **告别命令行** —— 拥抱友好的 Web 界面
- **工具调用可视化** —— 实时看到 Agent 在做什么
- **内置文件浏览器** —— 对话同时查看项目文件

### 🧰 Claude Agent SDK 全家桶

Claude Code 的所有能力，以及更多：

| 能力 | 说明 |
|------|------|
| **MCP** | 一键导入 Claude Code 的 MCP 配置 |
| **技能系统** | 可复用的代码技能库 |
| **自定义命令** | 自定义斜杠命令，快速执行操作 |
| **插件生态** | 安装智能体、命令、技能和 MCP 服务器 |
| **项目记忆** | 每个项目独立的记忆（CLAUDE.md） |
| **子 Agent** | 配置嵌套的 AI 智能体 |
| **多模型支持** | Claude、GLM、DeepSeek、Kimi K2、MiniMax 等 |

### ⏰ 定时任务调度

让 Agent 按计划自动执行 —— 真正实现 AI 工作自动化！

**典型应用场景：**
- 📊 **每日进度日报** —— 每天早上 9 点，自动生成项目进度日报
- 🔍 **代码自动审查** —— 每 2 小时检查代码仓库，自动提交审查意见
- 📝 **周会纪要整理** —— 每周五自动整理本周会议纪要并归档
- 📈 **月度数据分析** —— 每月 1 号自动生成业务数据分析报告

### 🔗 A2A 协议（Agent 间通信）

让多个 Agent 形成协同工作的网络：

- **秘书 Agent 调度** —— 一个秘书 Agent 统一接收任务，自动调度其他项目 Agent 执行具体工作
- **本地 ↔ 远程协作** —— 本地电脑与远程开发机上的 Agent 互相通讯，协同完成任务
- **移动端随时访问** —— 通过移动通讯端与本地 Agent 交互，随时随地工作（内测中）

### 🎨 自定义 Agent

无需编写代码，通过界面配置即可定制专属 Agent：

- **PPT 制作 Agent**
- **秘书 Agent**
- **文档写作 Agent**
- **代码审查 Agent**
- 以及任何你需要的工作流！

## 📊 AgentStudio vs Claude Code

| 对比维度 | AgentStudio | Claude Code |
|---------|-------------|-------------|
| 交互形态 | Web 界面 | 命令行 (CLI) |
| 目标用户 | 所有人 | 主要开发者 |
| 工具展示 | 可视化呈现 | 纯文本 |
| 文件浏览器 | ✅ | ❌ |
| Agent 定制 | ✅ | ❌ |
| 定时任务 | ✅ | ❌ |
| A2A 协议 | ✅ | ❌ |
| 移动端访问 | 内测中 | ❌ |

同样的 Claude Agent SDK，更友好的使用体验。

## 📦 其他安装方式

### Docker 部署

```bash
docker build -t agentstudio:latest .
docker-compose up -d
```

详见 [DOCKER.md](DOCKER.md)。

### 一键安装

**macOS/Linux：**

```bash
curl -fsSL https://raw.githubusercontent.com/okguitar/agentstudio/main/scripts/install-macos.sh | bash
```

**Windows（PowerShell）：**

```powershell
irm https://raw.githubusercontent.com/okguitar/agentstudio/main/scripts/windows-install.ps1 | iex
```

### 开发环境搭建

```bash
git clone https://github.com/okguitar/agentstudio.git
cd agentstudio
pnpm install
cp backend/.env.example backend/.env
# 编辑 backend/.env 添加你的 API 密钥
pnpm run dev
```

## 🧪 开发

```bash
pnpm run dev          # 启动开发服务器
pnpm run test         # 运行测试
pnpm run type-check   # 类型检查
pnpm run lint         # 代码检查
pnpm run build        # 生产构建
```

## 📦 技术栈

**前端：** React 19、TypeScript、Vite、TailwindCSS、Zustand、React Query

**后端：** Node.js、Express、TypeScript、Claude Agent SDK、JWT

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

## 📄 许可证

GPL v3 许可证 —— 详见 [LICENSE](LICENSE)。

## 📮 支持

- 🐛 [报告问题](https://github.com/okguitar/agentstudio/issues)
- 💬 [讨论区](https://github.com/okguitar/agentstudio/discussions)
- 📧 邮箱：okguitar@gmail.com

---

<div align="center">

Made with ❤️ by the AgentStudio Team

</div>
