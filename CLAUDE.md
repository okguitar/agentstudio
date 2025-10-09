# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Project Overview

Claude-powered AgentStudio with React frontend and Node.js backend, built on top of Claude Code SDK. The application features an agent-based architecture where specialized AI agents handle different types of content editing. The main interface provides a split-panel layout (chat on left, preview on right) with real-time collaboration between users and AI agents.

## Architecture

### Full-Stack Monorepo Structure
- **Root**: Shared package.json with concurrently for running both services
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript with AI SDK integration

### Key Technologies
- **State Management**: Zustand (lightweight) + React Query (server state)
- **AI Integration**: Claude Code SDK (@anthropic-ai/claude-code) with streaming responses
- **Build Tools**: Vite (frontend), TSX (backend development)
- **Testing**: Vitest + Testing Library + jsdom environment
- **Styling**: TailwindCSS with component variants
- **Routing**: React Router DOM

### Core Components Architecture
- `AgentChatPanel.tsx`: Main AI conversation interface with streaming responses
- `PreviewPanel.tsx`: Grid layout for slide thumbnails with zoom controls
- `SlidePreview.tsx`: Individual slide renderer with edit capabilities
- `AgentSelector.tsx`: Agent selection and management interface
- `SessionsDropdown.tsx`: Session history and management
- `ToolRenderer.tsx`: Dynamic tool usage visualization components
- `useSlides.ts`: React Query hooks for slide CRUD operations
- `useAI.ts`: AI chat and slide editing functionality (backward compatibility)
- `useAgents.ts`: Agent management and configuration
- `useAppStore.ts`: Global application state (current slide, selection, etc.)
- `useAgentStore.ts`: Agent-specific state management

### API Design
Backend follows RESTful patterns:
- `/api/slides/*`: Slide CRUD operations (GET, PUT, POST, DELETE)
- `/api/ai/*`: Legacy AI functionality and session management
- `/api/agents/*`: Agent-based AI interactions with Claude Code SDK
- `/api/usage/*`: Usage statistics and monitoring (daily, weekly, monthly, live, summary)
- `/api/health`: Health check endpoint
- Static file serving for slide HTML content via `/slides/*`

### Agent-Based Architecture
The application uses a sophisticated agent system built on Claude Code SDK:
- **Built-in Agents**: PPT Editor, Code Assistant, Document Writer
- **Custom Agents**: Configurable agents with specific tools and permissions
- **Subagents**: User-defined AI subagents with custom system prompts and tool access
- **Session Management**: Per-agent conversation history with automatic title generation
- **Tool Integration**: Dynamic tool rendering with real-time status updates
- **Project-Aware**: Agents operate within specific project contexts

### Project Management System
- **Project-Level Commands**: Slash commands scoped to projects or users (`/shared/types/commands.ts`)
- **Project Metadata**: Track project configurations, agent associations, and custom attributes
- **Agent Associations**: Configure which agents are enabled per project with usage statistics

### File System Integration
- Slides stored as individual HTML files in `../slides/` directory (relative to backend)
- Compatible with existing html-slide-player framework
- Maintains 1280x720 slide dimensions and CSS conventions

## Development Commands

### Package Manager
This project uses **pnpm workspaces** with filter commands for monorepo management. All commands support both `pnpm` and `npm`.

### Setup and Installation
```bash
pnpm install                 # Install all dependencies (recommended)
# or
npm run setup                # Install all dependencies (root, frontend, backend)
```

### Development
```bash
pnpm run dev                 # Start both frontend (3000) and backend (4936)
pnpm run dev:frontend        # Frontend only
pnpm run dev:backend         # Backend only
```

### Building and Production
```bash
pnpm run build               # Build both frontend and backend
pnpm run build:frontend      # Build frontend only
pnpm run build:backend       # Build backend only
pnpm start                   # Start production backend
```

### Service Management (Production)
```bash
pnpm run install:service     # Install as system service
pnpm run service:start       # Start service
pnpm run service:stop        # Stop service
pnpm run service:restart     # Restart service
pnpm run service:status      # Check service status
pnpm run service:logs        # View service logs
```

### Testing
```bash
cd frontend && pnpm test           # Run tests in watch mode
cd frontend && pnpm run test:ui    # Run tests with UI
cd frontend && pnpm run test:run   # Run tests once
cd frontend && pnpm run test:coverage # Run with coverage
```

### Code Quality
```bash
pnpm run lint                  # Run linting for all workspaces
pnpm run type-check            # TypeScript type checking for all workspaces
cd frontend && pnpm run lint   # ESLint for frontend only
cd backend && pnpm run type-check # TypeScript check for backend only
```

## Environment Configuration

Backend requires `.env` file in `backend/` directory:
```env
# AI Provider (choose one)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server Configuration  
PORT=4936  # Backend runs on port 4936, frontend on 3000
NODE_ENV=development

# File System
SLIDES_DIR=../slides  # Relative to backend/src

# CORS Configuration (optional)
# Add custom origins for production deployments
CORS_ORIGINS=https://your-frontend.vercel.app,https://custom-domain.com
```

## Key Development Patterns

### State Management Flow
1. Server state managed by React Query (slides, sessions, agents)
2. Client state managed by Zustand (`useAppStore`, `useAgentStore`)
3. AI interactions use Server-Sent Events (SSE) streaming
4. Tool usage rendered dynamically with real-time status updates

### AI Integration Pattern
- Claude Code SDK integration in backend with streaming responses
- Agent-based architecture with configurable tools and permissions
- Session persistence with automatic title generation
- Tool execution visualization with real-time feedback
- Context-aware agents with project-specific configurations

### API Configuration System
- Dynamic API endpoint configuration via `frontend/src/lib/config.ts`
- User-configurable backend host through settings UI (`/settings/api`)
- Automatic detection of development vs production environment
- LocalStorage-based persistence of custom API endpoints
- Built-in connection testing for API validation

### Slide Management
- Slides are HTML files with embedded CSS
- Each slide maintains 1280x720 dimensions
- Auto-saving after AI edits via PUT /api/slides/:index

### Internationalization (i18n)
- **Framework**: react-i18next with JSON translation files
- **Supported Languages**: English (en-US), Chinese (zh-CN)
- **Translation Files**: `frontend/src/i18n/locales/{locale}/pages.json`
- **Usage Pattern**: Use `useTranslation()` hook with namespaced keys (e.g., `t('pages:nav.dashboard')`)
- **Adding New Languages**:
  1. Create new locale directory under `frontend/src/i18n/locales/`
  2. Copy translation structure from existing locales
  3. Add locale configuration to `frontend/src/i18n/config.ts`

## Compatibility Notes

- Fully compatible with existing html-slide-player framework
- Maintains slides.js configuration format
- Preserves existing CSS styling conventions
- Uses same file structure and naming patterns

## Deployment and Production

### Frontend Deployment to Vercel
The project includes `vercel.json` configuration for seamless deployment:
- Automatic build via `pnpm --filter frontend run build`
- SPA routing support with proper rewrites
- Security headers and static file caching
- Framework detection for optimized deployments

### CORS and Cross-Origin Configuration
Backend includes comprehensive CORS support:
- Automatic support for localhost development (any port)
- Built-in support for all `*.vercel.app` domains
- Custom domain support via `CORS_ORIGINS` environment variable
- Dynamic origin validation for security

### API Endpoint Configuration
Frontend supports flexible API configuration:
- Development: Auto-detects `http://127.0.0.1:4936`
- Production: Defaults to `https://agentstudio.cc`
- User-configurable via `/settings/api` with connection testing
- Persistent configuration via LocalStorage

## Development Guidelines

### Project Structure
```
ai-editor/
├── package.json                    # Root package.json with monorepo scripts
├── shared/                         # Shared types and utilities
│   ├── types/
│   │   ├── agents.ts              # Agent configuration types
│   │   ├── commands.ts            # Slash command types (project/user scoped)
│   │   ├── subagents.ts           # Subagent configuration types
│   │   └── projects.ts            # Project metadata types
│   └── utils/agentStorage.ts      # Agent persistence utilities
├── frontend/                      # React frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── tools/             # Dynamic tool visualization components
│   │   │   └── ui/               # Reusable UI components
│   │   ├── hooks/                # React Query hooks
│   │   │   └── useUsageStats.ts  # Usage statistics hook
│   │   ├── stores/               # Zustand state management
│   │   ├── pages/                # Page components
│   │   │   └── UsageStatsPage.tsx # Usage monitoring dashboard
│   │   └── types/                # Frontend type definitions
│   ├── vitest.config.ts          # Test configuration
│   └── vite.config.ts            # Vite configuration
└── backend/                      # Node.js backend
    ├── src/
    │   ├── routes/               # Express routes
    │   │   ├── agents.ts         # Agent-based AI endpoints
    │   │   ├── ai.ts            # Legacy AI endpoints
    │   │   ├── slides.ts        # Slide CRUD operations
    │   │   └── usage.ts         # Usage statistics API
    │   ├── services/
    │   │   └── ccusageService.ts # ccusage integration service
    │   └── index.ts             # Server entry point (includes CORS config)
    └── .env.example             # Environment variables template
├── vercel.json                   # Vercel deployment configuration
└── DEPLOYMENT.md                 # Detailed deployment guide
```

### Adding New AI Features
1. **Built-in Agents**: Create agent configuration in `shared/types/agents.ts`
2. **Subagents**: Use `shared/types/subagents.ts` for user-defined agents
3. **Slash Commands**: Add project/user-scoped commands via `shared/types/commands.ts`
4. Add corresponding routes in `backend/src/routes/agents.ts`
5. Update frontend components to support new agent types

### UI Component Development
- Follow existing patterns in `frontend/src/components/`
- Use TailwindCSS for styling
- Implement tool components in `components/tools/` for custom tool rendering
- Add TypeScript interfaces in appropriate type files
- **Internationalization**: Use `useTranslation()` hook for all user-facing text
  - Import: `import { useTranslation } from 'react-i18next'`
  - Usage: `const { t } = useTranslation('pages'); t('nav.dashboard')`
  - Never hardcode user-facing strings in components

### Testing
- Write component tests using Vitest + Testing Library
- Test files should be co-located with components in `__tests__/` directories
- Use jsdom environment for component testing
- Run tests with `cd frontend && pnpm test`

### Agent Development
- **Built-in Agents**: Extend `BUILTIN_AGENTS` in `shared/types/agents.ts`
- **Subagents**: Create user-defined agents with custom system prompts in `shared/types/subagents.ts`
- **Project Commands**: Define project-scoped slash commands in `shared/types/commands.ts`
- Configure agent tools, permissions, and UI properties
- Implement context builders for agent-specific data

### Usage Monitoring
- **ccusage Integration**: Backend uses ccusage service for API usage tracking
- **Statistics API**: Endpoints for daily, weekly, monthly, and live usage data
- **Usage Dashboard**: Frontend `UsageStatsPage.tsx` displays consumption metrics
- **Monitoring**: Real-time burn rate and usage summaries via `/api/usage/*` endpoints

### API Configuration Guidelines
When modifying API endpoints or adding new hooks:
1. **Import API_BASE**: Always use `import { API_BASE } from '../lib/config.js'` instead of hardcoded paths
2. **Avoid Hardcoded URLs**: Never use '/api/...' directly in fetch calls
3. **Dynamic Configuration**: Support both development and production environments
4. **Connection Testing**: Implement health checks for new API endpoints at `/api/health`

### Deployment Architecture Patterns
The project supports multiple deployment configurations:
- **Frontend**: Vercel (CDN-optimized) + **Backend**: Local/Self-hosted
- **Frontend**: Vercel + **Backend**: Cloud server (full remote)
- **Frontend**: Local build + **Backend**: Local (full local)
- **Frontend**: Any static host + **Backend**: Any server with CORS configured