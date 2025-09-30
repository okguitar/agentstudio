# AgentStudio

<div align="center">

![AgentStudio](./frontend/public/cc-studio.png)

**A Claude Code-powered Personal Agent Workspace Platform**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![GitHub stars](https://img.shields.io/github/stars/git-men/agentstudio.svg)](https://github.com/git-men/agentstudio/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/git-men/agentstudio.svg)](https://github.com/git-men/agentstudio/issues)

[English](README.md) | [中文](README.zh-CN.md)

</div>

---

## English

### Overview

AgentStudio is a modern, web-based personal agent workspace platform built on top of Claude Code SDK. It extends Claude Code's capabilities with a professional web interface, making AI-powered development accessible to everyone.

### ✨ Key Features

#### 🎨 **Modern Web Interface**
- Professional, intuitive web UI designed for both developers and general users
- Real-time streaming responses for immediate feedback
- Split-panel layout with chat interface and live preview
- Responsive design optimized for desktop and mobile

#### 🤖 **Multi-LLM Support**
- **Claude Integration**: Built on Claude Code SDK with full API support
- **Multiple Providers**: Support for OpenAI, GLM, DeepSeek, and other popular LLMs
- **Flexible Configuration**: Easy switching between different AI models
- **Streaming Input**: Real-time response streaming for better user experience

#### 🛠️ **Advanced Agent System**
- **Built-in Agents**: PPT Editor, Code Assistant, Document Writer
- **Custom Agents**: Create and configure your own specialized agents
- **Subagents**: User-defined AI agents with custom system prompts
- **Agent Marketplace**: Extensible agent development framework
- **Message-level Tool Customization**: Fine-grained control over agent capabilities

#### 📁 **Integrated File Management**
- **Built-in File Browser**: Navigate and manage project files seamlessly
- **File Content Viewer**: Preview and edit files directly in the interface
- **Project-aware Operations**: Context-sensitive file operations
- **Version Control Integration**: Git-aware file management

#### 🎯 **Specialized Tools**
- **Slide Agent**: Create and edit presentations with AI assistance
- **Code Explorer**: Navigate codebases with intelligent search
- **Document Outline**: Structured document editing and management
- **Image Upload**: Support for visual content analysis
- **Tool Renderer**: Dynamic visualization of tool usage and results

#### 🔧 **Developer-Friendly**
- **TypeScript Throughout**: Full type safety for better development experience
- **Modern Stack**: React 18, Vite, TailwindCSS, Zustand
- **Testing Suite**: Comprehensive test coverage with Vitest
- **Hot Reload**: Fast development with instant code updates

#### 🌐 **Deployment Ready**
- **Local Development**: Easy setup for development environments
- **One-Click Installation**: Simplified deployment for end users
- **Production Builds**: Optimized builds for performance
- **Cross-Platform**: Support for Linux, macOS, and Windows

### 🚀 Quick Start

#### For End Users (One-Click Installation)

**Option 1: User Installation (Recommended - No sudo required)**

```bash
# Install Agent Studio backend in user space
curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | bash
```

The installer will ask if you want to start the backend immediately. If you choose not to start now, you can start it later:

```bash
# Start the backend
~/.agent-studio/start.sh

# Stop the backend
~/.agent-studio/stop.sh
```

**Access the application:**
1. Open your browser and visit: **https://agentstudio-frontend.vercel.app/**
2. In the web interface, go to **Settings → API Configuration**
3. Enter your backend URL: `http://localhost:4936`
4. Click "Test Connection" to verify

**Option 2: System Service Installation (Requires sudo)**

For production deployments with automatic startup on boot:

```bash
# Install as system service with auto-start
curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | sudo bash
```

After installation, manage the service:
```bash
agent-studio start    # Start the service
agent-studio stop     # Stop the service
agent-studio restart  # Restart the service
agent-studio status   # Check service status
agent-studio logs     # View logs
agent-studio config   # Edit configuration
```

Then access the web interface at **https://agentstudio-frontend.vercel.app/** and configure the backend URL in Settings.

#### For Developers (Development Setup)

**Prerequisites:**
- Node.js 18+
- pnpm (recommended) or npm
- Git

**Installation:**
```bash
# Clone the repository
git clone https://github.com/git-men/agentstudio.git
cd agentstudio

# Install dependencies
pnpm install

# Start development servers (both frontend and backend)
pnpm run dev

# Or start them separately
pnpm run dev:frontend  # Frontend only (port 3000)
pnpm run dev:backend   # Backend only (port 4936)
```

**Build for production:**
```bash
pnpm run build
pnpm start
```

### 📁 Project Structure

```
agentstudio/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── agents/     # Agent-specific components
│   │   ├── hooks/      # React hooks and data fetching
│   │   └── stores/     # State management (Zustand)
│   └── public/         # Static assets
├── backend/            # Node.js backend server
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Business logic
│   │   └── index.ts    # Server entry point
│   └── dist/           # Built backend code
├── shared/             # Shared types and utilities
└── scripts/            # Installation and deployment scripts
```

### ⚙️ Configuration

#### Environment Variables

**For Development:**
Create a `.env` file in the `backend/` directory:

```env
# AI Provider Configuration (choose one or more)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=4936
NODE_ENV=development

# File System
SLIDES_DIR=../slides

# CORS Configuration (for production)
CORS_ORIGINS=https://your-frontend-domain.com
```

**For System Service Installation:**
Edit the configuration file at `/etc/agent-studio/config.env`:

```bash
# Edit configuration
agent-studio config
```

Configuration options:
```env
# Server configuration
NODE_ENV=production
PORT=4936
SLIDES_DIR=/opt/slides

# Optional: AI provider keys (configure if needed)
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here

# Optional: CORS configuration for custom frontends
# CORS_ORIGINS=https://your-frontend.vercel.app,https://custom-domain.com
```

#### API Configuration

The frontend is hosted at **https://agentstudio-frontend.vercel.app/** and can connect to different backend instances:

**For Local Backend:**
1. Open **Settings → API Configuration** in the web interface
2. Enter: `http://localhost:4936` (or your custom port)
3. Click "Test Connection" to verify

**For Remote Backend:**
1. Deploy your backend to a server with a public IP or domain
2. Configure the backend URL in Settings (e.g., `https://your-backend.com`)
3. Ensure CORS is properly configured in your backend's `.env` file

### 📋 Service Management

#### System Service Commands (when installed with sudo)

```bash
# Basic service operations
agent-studio start      # Start the service
agent-studio stop       # Stop the service
agent-studio restart    # Restart the service
agent-studio status     # Check service status

# Monitoring and logs
agent-studio logs       # View real-time logs
agent-studio health     # Check service health

# Configuration
agent-studio config     # Edit configuration file

# Service details
agent-studio uninstall  # Remove the service
```

#### Service Details

**Installation Directories:**

For user installation (no sudo):
- Application: `~/.agent-studio`
- Configuration: `~/.agent-studio-config/config.env`
- Logs: `~/.agent-studio-logs/`
- Slides: `~/slides`
- Start script: `~/.agent-studio/start.sh`
- Stop script: `~/.agent-studio/stop.sh`

For system service installation (with sudo):
- Application: `~/.agent-studio`
- Configuration: `~/.agent-studio-config/config.env`
- Logs: `~/.agent-studio-logs/`
- Slides: `~/slides`

**Log Files:**
- Output log: `/var/log/agent-studio/output.log`
- Error log: `/var/log/agent-studio/error.log`
- Log rotation: Daily (30 days retention)

**Service Integration:**
- Linux: systemd service (`/etc/systemd/system/agent-studio.service`)
- macOS: launchd service (`/Library/LaunchDaemons/com.agent-studio.backend.plist`)
- Auto-start on boot enabled by default

### 🔧 Troubleshooting

#### Service Won't Start

```bash
# Check service status
agent-studio status

# View logs for errors
agent-studio logs

# Verify configuration
agent-studio config

# Check if port is available
lsof -i :4936
```

#### Common Issues

**Permission Errors:**
```bash
sudo chown -R agent-studio:agent-studio /opt/agent-studio
sudo chown -R agent-studio:agent-studio /var/log/agent-studio
```

**Port Already in Use:**
```bash
# Find process using the port
lsof -i :4936

# Change port in configuration
agent-studio config  # Edit PORT=8080
agent-studio restart
```

**Health Check:**
```bash
agent-studio health
# Or manually:
curl http://localhost:4936/api/health
```

### 📦 Updates

To update an existing installation:

```bash
# Stop the service
agent-studio stop

# Update the code
cd /opt/agent-studio
git pull
pnpm install
pnpm run build:backend

# Start the service
agent-studio start
```

### 🧪 Testing

```bash
# Run all tests
pnpm test

# Run frontend tests only
cd frontend && pnpm test

# Run tests with coverage
cd frontend && pnpm run test:coverage

# Run tests with UI
cd frontend && pnpm run test:ui
```

### 🛡️ Security

- **API Key Protection**: Environment-based API key management
- **CORS Configuration**: Configurable cross-origin policies
- **Input Validation**: Comprehensive input sanitization
- **Secure File Operations**: Sandboxed file system access

### 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- Built on top of [Claude Code SDK](https://claude.ai/code)
- Inspired by modern development workflows
- Community feedback and contributions


## Links

| link | type | service | description |
|:---|:---|:---|:---|
| **[ctok.ai](https://ctok.ai/)** | 🤝 community | <small>✅ Claude Code<br>✅ Codex CLI</small> | Claude Code / Codex CLI carpool service. |


## 中文文档

请查看 [README.zh-CN.md](README.zh-CN.md) 获取中文文档。

---
