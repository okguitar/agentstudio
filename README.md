# AgentStudio

A sophisticated AI-powered workspace built on top of Claude Code SDK, featuring advanced agent management, project organization, and real-time collaboration capabilities.

## 🚀 Features

### Core Functionality
- **🤖 Multi-Agent System**: Built-in agents (PPT Editor, Code Assistant, Document Writer) plus custom user-defined subagents
- **📁 Project Management**: Organize work into projects with agent associations and metadata
- **💬 Interactive Chat**: Full-screen chat interface with streaming AI responses
- **🔧 Custom Tools**: Dynamic tool rendering and real-time status updates
- **📊 Usage Analytics**: Comprehensive API usage tracking and monitoring dashboard
- **⚡ Slash Commands**: Project-scoped and user-scoped custom commands
- **🔗 MCP Integration**: Model Context Protocol support for enhanced AI capabilities

### Advanced Features
- **Project-Level Configuration**: Per-project agent settings and custom commands
- **Subagent Management**: Create and manage custom AI agents with specific system prompts
- **Usage Monitoring**: Real-time API cost tracking with daily, weekly, and monthly breakdowns
- **Session Management**: Persistent conversation history with automatic title generation
- **File System Integration**: Direct file operations and slide management
- **Settings Management**: Comprehensive configuration for agents, memory, and user preferences

## 🛠 Tech Stack

### Frontend
- **React 19** + **TypeScript** - Modern React with latest features
- **Vite** - Lightning-fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **React Query** - Server state management and caching
- **Zustand** - Lightweight client state management
- **Lucide React** - Beautiful icon library

### Backend
- **Node.js** + **Express** + **TypeScript** - Robust API server
- **Claude Code SDK** - Advanced AI integration with tool support
- **ccusage** - API usage tracking and monitoring
- **Helmet** + **CORS** - Security and cross-origin support
- **Zod** - Runtime type validation
- **fs-extra** - Enhanced file system operations

### Shared
- **Monorepo Structure** - Shared types and utilities across frontend/backend
- **TypeScript** - End-to-end type safety

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies for root, frontend, and backend
npm run setup
```

### 2. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
# AI Provider Configuration (choose one or both)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=4936
NODE_ENV=development

# File System Configuration
SLIDES_DIR=../slides
```

### 3. Start Development Servers

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually
npm run dev:frontend  # Frontend: http://localhost:3000
npm run dev:backend   # Backend: http://localhost:4936
```

## 📖 Usage Guide

### Dashboard Overview
Access the main dashboard at `http://localhost:3000` to:
- View active projects and recent sessions
- Monitor API usage statistics
- Access agent management tools
- Configure application settings

### Chat Interface
Navigate to `/chat/{agentId}` for full-screen AI conversations with:
- Streaming responses and real-time tool execution
- Context-aware project integration
- Session history and management
- Custom slash commands support

### Project Management
- **Create Projects**: Organize work into distinct projects with metadata
- **Agent Associations**: Configure which agents are available per project
- **Custom Commands**: Define project-specific slash commands
- **Usage Tracking**: Monitor per-project API consumption

### Agent System
- **Built-in Agents**: Pre-configured agents for common tasks
- **Subagents**: Create custom agents with specific system prompts and tool access
- **Tool Configuration**: Control which tools each agent can access
- **Context Builders**: Agent-specific data and context management

## 🗂 Project Structure

```
agentstudio/
├── package.json                    # Root package configuration
├── shared/                         # Shared types and utilities
│   ├── types/
│   │   ├── agents.ts              # Agent system types
│   │   ├── commands.ts            # Slash command types
│   │   ├── subagents.ts           # Custom subagent types
│   │   └── projects.ts            # Project management types
│   └── utils/agentStorage.ts      # Agent persistence utilities
├── frontend/                      # React application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── AgentChatPanel.tsx # Main chat interface
│   │   │   ├── ProjectSelector.tsx # Project management UI
│   │   │   ├── SubagentForm.tsx   # Custom agent creation
│   │   │   └── tools/            # Dynamic tool components
│   │   ├── pages/               # Application pages
│   │   │   ├── ChatPage.tsx     # Full-screen chat interface
│   │   │   ├── ProjectsPage.tsx # Project management
│   │   │   ├── AgentsPage.tsx   # Agent configuration
│   │   │   └── UsageStatsPage.tsx # Analytics dashboard
│   │   ├── hooks/               # React Query hooks
│   │   │   ├── useAgents.ts     # Agent management
│   │   │   └── useUsageStats.ts # Usage analytics
│   │   └── stores/              # Zustand state management
│   ├── vite.config.ts           # Vite configuration
│   └── tailwind.config.js       # Styling configuration
└── backend/                     # Express API server
    ├── src/
    │   ├── routes/              # API endpoints
    │   │   ├── agents.ts        # Agent-based AI interactions
    │   │   ├── projects.ts      # Project management API
    │   │   ├── subagents.ts     # Custom agent management
    │   │   ├── commands.ts      # Slash command API
    │   │   └── usage.ts         # Usage statistics API
    │   ├── services/
    │   │   └── ccusageService.ts # Usage tracking service
    │   └── index.ts             # Server entry point
    └── .env.example             # Environment template
```

## 🔧 API Endpoints

### Core APIs
- `GET /api/agents` - List available agents
- `POST /api/agents/:id/chat` - Agent chat interactions
- `GET /api/projects` - Project management
- `GET /api/usage/*` - Usage statistics (daily, weekly, monthly, live)

### Management APIs
- `/api/subagents/*` - Custom agent CRUD operations
- `/api/commands/*` - Slash command management
- `/api/settings/*` - Application configuration
- `/api/files/*` - File system operations

### Monitoring
- `GET /api/health` - Health check endpoint
- `GET /api/usage/summary` - Overall usage analytics
- `GET /api/usage/live` - Real-time monitoring data

## 🚀 Development

### Build Commands

```bash
# Build both frontend and backend
npm run build

# Build individually
npm run build:frontend
npm run build:backend

# Production start
npm start
```

### Testing

```bash
# Run frontend tests
cd frontend && npm test

# Run tests with UI
cd frontend && npm run test:ui

# Run tests with coverage
cd frontend && npm run test:coverage
```

### Code Quality

```bash
# Frontend linting
cd frontend && npm run lint

# Backend type checking
cd backend && npm run type-check
```

### Adding Features

1. **New Agent Types**: Extend `BUILTIN_AGENTS` in `shared/types/agents.ts`
2. **Custom Tools**: Add components to `frontend/src/components/tools/`
3. **API Endpoints**: Add routes in `backend/src/routes/`
4. **UI Components**: Follow patterns in `frontend/src/components/`

## 📊 Monitoring & Analytics

The application includes comprehensive usage monitoring:

- **Real-time Tracking**: Monitor API calls, token usage, and costs
- **Historical Data**: Daily, weekly, and monthly usage breakdowns
- **Burn Rate Analysis**: Track spending velocity and trends
- **Agent-specific Metrics**: Usage statistics per agent and project
- **Export Capabilities**: Data export for external analysis

## 🔒 Security Features

- **Helmet Security**: Comprehensive HTTP security headers
- **CORS Configuration**: Controlled cross-origin resource sharing
- **Content Security Policy**: Protection against XSS attacks
- **Input Validation**: Zod-based runtime type checking
- **Environment Isolation**: Secure environment variable management

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

This is a sophisticated AI workspace designed for productivity and extensibility. The codebase follows modern development practices with comprehensive TypeScript coverage, React best practices, and scalable architecture patterns.