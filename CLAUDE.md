# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Project Overview

Claude-powered AgentStudio with React frontend and Node.js backend, built on top of Claude Code SDK. The application features an agent-based architecture where specialized AI agents handle different types of content editing. The main interface provides a split-panel layout (chat on left, preview on right) with real-time collaboration between users and AI agents.

## Architecture

### Full-Stack Monorepo Structure
- **Root**: Shared package.json with concurrently for running both services
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript with AI SDK integration

### Key Technologies
- **State Management**: Zustand (lightweight) + React Query (server state)
- **AI Integration**: Claude Agent SDK (@anthropic-ai/claude-agent-sdk) with streaming responses
- **A2A Integration**: @a2a-js/sdk for agent-to-agent communication
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Build Tools**: Vite (frontend), TSX (backend development)
- **Testing**: Vitest + Testing Library + jsdom environment, Playwright for E2E testing
- **Styling**: TailwindCSS with component variants
- **Routing**: React Router DOM
- **Documentation**: Storybook with Chromatic for component documentation

### Core Components Architecture
- `AgentChatPanel.tsx`: Main AI conversation interface with streaming responses
- `PreviewPanel.tsx`: Grid layout for slide thumbnails with zoom controls
- `SlidePreview.tsx`: Individual slide renderer with edit capabilities
- `AgentSelector.tsx`: Agent selection and management interface
- `SessionsDropdown.tsx`: Session history and management
- `ToolRenderer.tsx`: Dynamic tool usage visualization components
- `FileBrowser.tsx`: Integrated file explorer for project files
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
- `/api/commands/*`: Command management and execution endpoints
- `/api/projects/*`: Project management and configuration endpoints
- `/api/mcp/*`: MCP server management and health checks
- `/api/plugins/*`: Plugin marketplace and installation endpoints
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

### MCP Integration
Model Context Protocol (MCP) server integration for extended capabilities:
- **Server Types**: Support for both stdio and HTTP-based MCP servers
- **Tool Discovery**: Automatic detection of available MCP tools
- **Health Monitoring**: Real-time status checks for MCP services
- **Flexible Configuration**: Easy management of MCP server connections

### Plugin System
Extensible plugin architecture for adding new capabilities:
- **Plugin Types**: Agents, commands, skills, and MCP servers
- **Marketplace Management**: Add custom or community marketplaces
- **One-Click Install**: Easy installation and management of plugins
- **Version Control**: Track and update plugin versions

### Project Management System
- **Project-Level Commands**: Slash commands scoped to projects or users (types defined in both `frontend/src/types/commands.ts` and `backend/src/types/commands.ts`)
- **Project Metadata**: Track project configurations, agent associations, and custom attributes
- **Agent Associations**: Configure which agents are enabled per project with usage statistics

### File System Integration
- Slides stored as individual HTML files in `../slides/` directory (relative to backend)
- Compatible with existing html-slide-player framework
- Maintains 1280x720 slide dimensions and CSS conventions

## Development Commands

### Package Manager
This project uses **pnpm workspaces** with filter commands for monorepo management. All commands support both `pnpm` and `npm`.

**Workspace Names**:
- Frontend: `@agentstudio/frontend`
- Backend: `agentstudio-backend`

When using `pnpm --filter`, reference these workspace names for targeting specific packages.

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
pnpm start                   # Start production backend (after build)
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
# Frontend tests
cd frontend && pnpm test           # Run tests in watch mode
cd frontend && pnpm run test:ui    # Run tests with UI
cd frontend && pnpm run test:run   # Run tests once
cd frontend && pnpm run test:coverage # Run with coverage

# Backend tests
cd backend && pnpm test            # Run tests in watch mode
cd backend && pnpm run test:ui     # Run tests with UI
cd backend && pnpm run test:run    # Run tests once
cd backend && pnpm run test:coverage # Run with coverage
```

### Code Quality
```bash
pnpm run lint                  # Run linting for all workspaces
pnpm run type-check            # TypeScript type checking for all workspaces
cd frontend && pnpm run lint   # ESLint for frontend only
cd backend && pnpm run type-check # TypeScript check for backend only
```

## 🔧 **IMPORTANT**: Pre-Commit Build Verification

**ALWAYS run build and lint checks before committing code to prevent Vercel deployment failures:**

```bash
# ✅ MANDATORY: Run this before every commit
pnpm run build                 # Full build for all workspaces (shared, frontend, backend)
pnpm run lint                  # Check for linting errors

# 🚫 NEVER skip these steps - they will cause Vercel build failures!
# ❌ Common mistakes that cause Vercel failures:
# - TypeScript errors (untyped variables, missing types)
# - ESLint errors (unused variables, code style issues)
# - Missing dependencies or import errors
# - Git merge conflicts left in files

# ✅ Example safe commit workflow:
# 1. Make your changes
# 2. pnpm run build && pnpm run lint
# 3. If no errors: git add . && git commit -m "feat: your changes"
# 4. git push origin your-branch
# 5. Check Vercel build status

# 📋 Quick checklist before commits:
# □ pnpm run build passes
# □ pnpm run lint passes (or use --fix for auto-fixable issues)
# □ No Git conflicts remaining in files
# □ All new dependencies added to package.json
# □ TypeScript types properly defined (avoid 'any' type)
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

### CLI Tool
The backend includes a CLI tool (`agentstudio`) for managing the application:
- Project management and migration
- Agent configuration upgrades
- Service management (start/stop/status/logs)
- Available after build: `pnpm run build && npx agentstudio`

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

### Docker Deployment (Recommended)
The project includes Docker support for all-in-one deployment:
```bash
# Build and run with Docker Compose
docker build -t agentstudio:latest .
docker-compose up -d

# Access at http://localhost
```

**What you get:**
- All-in-one container (frontend + backend)
- Data persistence via Docker volumes
- Zero configuration needed
- Easy updates and rollbacks

See [DOCKER.md](DOCKER.md) for detailed Docker deployment guide.

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
├── frontend/                      # React frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── tools/             # Dynamic tool visualization components
│   │   │   └── ui/               # Reusable UI components
│   │   ├── hooks/                # React Query hooks
│   │   ├── stores/               # Zustand state management
│   │   ├── pages/                # Page components
│   │   ├── types/                # Frontend type definitions
│   │   │   ├── agents.ts         # Agent configuration types
│   │   │   ├── commands.ts       # Slash command types (project/user scoped)
│   │   │   └── subagents.ts      # Subagent configuration types
│   │   └── lib/
│   │       └── config.ts         # API configuration system
│   ├── vitest.config.ts          # Test configuration
│   └── vite.config.ts            # Vite configuration
└── backend/                      # Node.js backend
    ├── src/
    │   ├── routes/               # Express routes
    │   │   ├── agents.ts         # Agent-based AI endpoints
    │   │   ├── commands.ts       # Command management endpoints
    │   │   ├── projects.ts       # Project management endpoints
    │   │   ├── ai.ts            # Legacy AI endpoints
    │   │   ├── slides.ts        # Slide CRUD operations
    │   │   └── usage.ts         # Usage statistics API
    │   ├── types/                # Backend type definitions
    │   │   ├── agents.ts         # Agent configuration types
    │   │   ├── commands.ts       # Slash command types
    │   │   ├── subagents.ts      # Subagent configuration types
    │   │   └── projects.ts       # Project metadata types
    │   ├── services/
    │   │   └── ccusageService.ts # ccusage integration service
    │   └── index.ts             # Server entry point (includes CORS config)
    └── .env.example             # Environment variables template
├── vercel.json                   # Vercel deployment configuration
└── DEPLOYMENT.md                 # Detailed deployment guide
```

**Note**: Type definitions are maintained in both `frontend/src/types/` and `backend/src/types/` to ensure type safety across the monorepo. When updating types, changes must be made in both locations to maintain consistency.

### Adding New AI Features
1. **Built-in Agents**: Create agent configuration in both `frontend/src/types/agents.ts` and `backend/src/types/agents.ts`
2. **Subagents**: Update subagent types in both `frontend/src/types/subagents.ts` and `backend/src/types/subagents.ts`
3. **Slash Commands**: Add project/user-scoped commands via `frontend/src/types/commands.ts` and `backend/src/types/commands.ts`
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
- **Built-in Agents**: Extend `BUILTIN_AGENTS` in both `frontend/src/types/agents.ts` and `backend/src/types/agents.ts`
- **Subagents**: Create user-defined agents with custom system prompts in both frontend and backend types
- **Project Commands**: Define project-scoped slash commands in both `frontend/src/types/commands.ts` and `backend/src/types/commands.ts`
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

### Development Workflow with Git Worktree

#### Worktree-Based Development Strategy
When developing new features or fixing issues, follow this workflow based on task complexity:

**Small Tasks (Main Directory)**
- **Scope**: Simple bug fixes, minor UI tweaks, documentation updates
- **Criteria**:
  - Affects ≤ 3 files
  - Estimated time < 30 minutes
  - No breaking changes
  - No new dependencies
- **Workflow**: Work directly in main directory on main branch

**Medium to Large Features (Worktree Required)**
- **Scope**: New components, API endpoints, agent integrations, UI features
- **Criteria**:
  - Affects > 3 files
  - Estimated time ≥ 30 minutes
  - Adds new dependencies
  - Requires testing
- **Workflow**: Create dedicated feature branch with worktree
- **Testing Requirement**: Must pass user testing and approval before merging to main

#### Worktree Commands
```bash
# Create feature branch and worktree
git checkout -b feature-name
git worktree add ../agentstudio-feature-name feature-name

# Switch to worktree
cd ../agentstudio-feature-name

# Install dependencies and start development
pnpm install
pnpm run dev

# After completion, request user testing and approval
# User must test the feature and confirm it's ready for merge

# Once approved, merge from main directory
cd ../agentstudio
git merge feature-name

# Clean up worktree
git worktree remove ../agentstudio-feature-name
git branch -d feature-name
```

#### Testing and Approval Process
Before merging any feature branch to main, follow this mandatory testing and approval process:

**Developer Testing (Required)**
- Run all automated tests: `cd frontend && pnpm test:run`
- Build verification: `pnpm run build`
- Manual testing of new functionality
- Check for breaking changes in existing features

**User Testing and Approval (Mandatory)**
- Provide clear instructions for user to test the feature
- Include specific test scenarios and expected outcomes
- Wait for explicit user confirmation before merging
- Document any issues found during user testing

**Merge Criteria**
- All automated tests pass
- Build succeeds without errors
- User has tested and approved the feature
- No breaking changes to existing functionality
- Code review completed if applicable

#### Worktree Benefits for This Project
- **Independent Development Environments**: Each worktree has separate dependency installations and build caches
- **Parallel Testing**: Run different test suites simultaneously across worktrees
- **Agent Isolation**: Test different agent configurations without interference
- **Performance**: Avoid constant dependency reinstallation when switching contexts
- **Safe Testing**: Users can test features in isolation before merging to main

### Deployment Architecture Patterns
The project supports multiple deployment configurations:
- **Frontend**: Vercel (CDN-optimized) + **Backend**: Local/Self-hosted
- **Frontend**: Vercel + **Backend**: Cloud server (full remote)
- **Frontend**: Local build + **Backend**: Local (full local)
- **Frontend**: Any static host + **Backend**: Any server with CORS configured

## Git Workflow

### Commit Messages
- Write clear, concise commit messages that describe the changes
- **DO NOT** include Claude Code signatures or Co-Authored-By tags
- Follow conventional commit format when appropriate (e.g., `feat:`, `fix:`, `docs:`)
- Keep commit messages focused on what changed and why