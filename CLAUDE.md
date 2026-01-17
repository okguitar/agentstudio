# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentStudio is a modern web-based AI agent workspace platform built on Claude Agent SDK. It provides a professional interface for AI-powered content editing, code assistance, and task automation through specialized agents. The architecture features a React frontend with Node.js backend, using Server-Sent Events (SSE) for real-time streaming responses.

## Architecture

### Full-Stack Monorepo Structure
- **Root**: Shared package.json with pnpm workspaces
- **Frontend**: `@agentstudio/frontend` - React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: `agentstudio-backend` - Node.js + Express + TypeScript + Claude Agent SDK

### Key Technologies
- **State Management**: Zustand (client state) + React Query (server state)
- **AI Integration**: @anthropic-ai/claude-agent-sdk with streaming responses
- **A2A Integration**: @a2a-js/sdk for agent-to-agent communication
- **Authentication**: JWT-based with bcrypt password hashing
- **Build Tools**: Vite (frontend), TSX (backend dev)
- **Testing**: Vitest + Testing Library + jsdom, Playwright for E2E
- **Styling**: TailwindCSS with component variants
- **Routing**: React Router DOM
- **I18n**: react-i18next (English, Chinese)

### Core Services Architecture

#### Backend Services (`backend/src/services/`)
- **sessionManager.ts**: Manages Claude sessions with persistent conversation history and automatic cleanup
- **schedulerService.ts**: Cron-based task scheduler for automated agent execution
- **agentStorage.ts**: Agent configuration management with file-based persistence
- **a2a/**: Agent-to-agent communication system
  - `a2aClientTool.ts`: MCP tool for calling external A2A-compatible agents
  - `apiKeyService.ts`: API key management for A2A authentication
  - `taskManager.ts`: Async task lifecycle management
- **askUserQuestion/**: Multi-channel user interaction system
  - Supports SSE, Slack, and custom notification channels
  - Real-time question-answer flow during agent execution
- **pluginParser.ts**, **pluginInstaller.ts**: Plugin marketplace integration
- **projectMetadataStorage.ts**: Project-level configurations and agent associations

#### Frontend Architecture (`frontend/src/`)
- **stores/useAgentStore.ts**: Zustand store for agent chat state, messages, streaming
- **stores/useAppStore.ts**: Global application state (current slide, selection, etc.)
- **hooks/agentChat/useAIStreamHandler.ts**: SSE stream processing with 60fps RAF throttling
- **components/tools/**: Dynamic tool visualization components (22+ specialized tools)
- **components/AgentChatPanel.tsx**: Main AI conversation interface
- **types/**: TypeScript definitions mirrored in frontend and backend for type safety

### API Routes (`backend/src/routes/`)
- `/api/agents/*`: Agent CRUD and chat endpoints with SSE streaming
- `/api/sessions/*`: Session history and management
- `/api/a2a/*`: A2A agent discovery and streaming
- `/api/a2aManagement/*`: A2A configuration and API key management
- `/api/commands/*`: Slash command execution
- `/api/projects/*`: Project management and metadata
- `/api/mcp/*`: MCP server management and health checks
- `/api/plugins/*`: Plugin marketplace operations
- `/api/scheduledTasks/*`: Scheduled task CRUD and control
- `/api/files/*`: File system operations
- `/api/usage/*`: Usage statistics (daily, weekly, monthly, live)

### Agent-Based Architecture

The application uses a sophisticated multi-tier agent system:

1. **Built-in Agents**: Pre-configured agents (PPT Editor, Code Assistant, Document Writer)
2. **Custom Agents**: User-created agents with specific tools, permissions, and system prompts
3. **Subagents**: Nested AI agents with custom capabilities
4. **Project Commands**: Slash commands scoped to projects (defined in `types/commands.ts`)

**Agent Configuration Flow**:
- Types defined in both `frontend/src/types/agents.ts` and `backend/src/types/agents.ts`
- When updating agent types, changes must be mirrored in both locations
- Agent tools are configurable with individual permissions and path restrictions

### SSE Streaming Architecture

Real-time AI responses use Server-Sent Events with sophisticated state management:

**Backend** (`routes/agents.ts`):
- Creates SSE streams for each agent conversation
- Sends `stream_event` messages with content_block deltas
- Tracks session state in `sessionManager` with cleanup handlers

**Frontend** (`hooks/agentChat/useAIStreamHandler.ts`):
- Uses `StreamingState` ref to track active streaming blocks
- Implements RAF throttling (60fps) for UI updates
- Accumulates incremental JSON fragments for tool inputs
- Maps streaming blocks to message parts for real-time display

**Critical**: Tool input JSON in SSE streams is INCREMENTAL. When handling `input_json_delta`, accumulate with `+=`, not replace with `=`. Only parse when JSON appears complete (ends with `}`).

## Development Commands

### Package Manager
Uses **pnpm workspaces**. Workspace names:
- Frontend: `@agentstudio/frontend`
- Backend: `agentstudio-backend`

### Common Commands
```bash
# Development
pnpm run dev                 # Start both frontend (3000) and backend (4936)
pnpm run dev:frontend        # Frontend only
pnpm run dev:backend         # Backend only

# Building
pnpm run build               # Build both frontend and backend
pnpm run build:frontend      # Frontend only
pnpm run build:backend       # Backend only

# Testing (individual workspaces)
cd frontend && pnpm test           # Watch mode
cd frontend && pnpm run test:run   # Run once
cd backend && pnpm test            # Watch mode
cd backend && pnpm run test:run    # Run once

# Code Quality
pnpm run lint              # Lint all workspaces
pnpm run type-check        # TypeScript check all workspaces
```

### Single Test Execution
```bash
# Frontend
cd frontend && pnpm test path/to/test.test.ts

# Backend (use vitest run to avoid watch mode)
cd backend && npx vitest run path/to/test.test.ts
```

## Important Development Patterns

### SSE Streaming Implementation
When working with streaming responses in `useAIStreamHandler.ts`:

1. **JSON Accumulation**: Always use `+=` for `partial_json` fragments
   ```typescript
   streamingBlock.content += partialJsonFragment;  // Correct
   // streamingBlock.content = partialJsonFragment;  // WRONG - loses data
   ```

2. **Parse on Complete**: Only parse when JSON looks complete
   ```typescript
   const trimmed = accumulatedJson.trim();
   if (trimmed.endsWith('}')) {
     const toolInput = JSON.parse(accumulatedJson);
     updateToolPartInMessage(messageId, partId, { toolInput });
   }
   ```

3. **Final Parse**: Always parse on `content_block_stop` to capture complete parameters

### Type Synchronization
Types are maintained in BOTH frontend and backend:
- `frontend/src/types/agents.ts` ↔ `backend/src/types/agents.ts`
- `frontend/src/types/commands.ts` ↔ `backend/src/types/commands.ts`
- `frontend/src/types/subagents.ts` ↔ `backend/src/types/subagents.ts`
- `frontend/src/types/a2a.ts` ↔ `backend/src/types/a2a.ts`

When updating types, update BOTH locations to maintain type safety.

### Tool Component Development
Tool visualization components in `frontend/src/components/tools/`:
- Extend `BaseToolComponent` for consistent styling
- Set `hideToolName={false}` explicitly for tool name display
- Use `useTranslation('components')` for i18n
- Handle loading, executing, and completed states

### Agent Context Building
Agents receive context from multiple sources:
- Project files and metadata
- Session history
- MCP server capabilities
- Custom context builders (defined in agent config)

### Session Management
Sessions track conversation state per agent:
- `sessionManager.ts` handles session lifecycle
- Automatic title generation from first message
- Cleanup on disconnect with configurable timeout
- Support for both persistent and temporary sessions

### Plugin System
Plugins extend AgentStudio with:
- **Agents**: Pre-configured AI agents
- **Commands**: Slash commands for quick actions
- **Skills**: Reusable code snippets
- **MCP Servers**: Tool integrations

Plugins are installed from marketplaces and symlinked into the project.

### Internationalization
All user-facing text must use i18n:
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('components');
t('toolRenderer.executing');  // Never hardcode strings
```

Translation files: `frontend/src/i18n/locales/{locale}/pages.json`

## Environment Configuration

Backend `.env` file (`backend/.env`):
```env
# AI Provider (choose one)
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here

# Server
PORT=4936
NODE_ENV=development

# File System
SLIDES_DIR=../slides  # Relative to backend/src

# CORS (optional)
CORS_ORIGINS=https://your-frontend.vercel.app

# Telemetry (optional, disabled by default)
TELEMETRY_ENABLED=false
POSTHOG_API_KEY=phc_your_api_key_here
POSTHOG_HOST=https://app.posthog.com
```

Frontend `.env` file (`frontend/.env`):
```env
# Telemetry (optional, uses PostHog)
VITE_POSTHOG_API_KEY=phc_your_api_key_here
VITE_POSTHOG_HOST=https://app.posthog.com
VITE_APP_VERSION=0.2.0
```

## Git Workflow

### Commit Messages
- Write clear, concise commit messages
- **DO NOT** include Claude Code signatures or Co-Authored-By tags
- Follow conventional commit format: `feat:`, `fix:`, `refactor:`, etc.
- Focus on what changed and why

### Pre-Commit Hook
The project has a pre-commit hook that runs:
1. Incremental lint on staged files
2. TypeScript type checking
3. Build verification
4. Tests (if available)

If tests fail due to pre-existing issues (not your changes), use `git commit --no-verify` to skip the hook.

### Development Workflow
Small tasks (≤3 files, <30 min): Work directly on main
Medium/Large features: Use git worktree for isolation

```bash
# Create worktree for feature
git checkout -b feature-name
git worktree add ../agentstudio-feature-name feature-name
cd ../agentstudio-feature-name
pnpm install && pnpm run dev
```

## Testing Strategy

### Backend Tests
- Vitest with test files co-located in `__tests__/` directories
- Integration tests for routes, services, and A2A functionality
- Mock SSE streams for testing streaming behavior
- Some tests in `agents.test.ts` are currently failing (pre-existing issues)

### Frontend Tests
- Vitest + Testing Library with jsdom environment
- Component tests for tools and UI elements
- Hook tests for React Query and Zustand stores
- Run with `cd frontend && pnpm test`

### E2E Tests
- Playwright for full user flow testing
- Tests in `frontend/e2e/` directory

## Deployment

### Vercel Deployment
Frontend deploys to Vercel with `vercel.json` configuration:
- Automatic build via `pnpm --filter frontend run build`
- SPA routing with rewrites
- Static asset caching

### Backend Deployment
Backend can be deployed as:
- System service (Linux/macOS)
- Docker container (all-in-one with frontend)
- Any Node.js hosting platform with CORS configured

### API Configuration
Frontend uses dynamic API configuration:
- Development: Auto-detects `http://127.0.0.1:4936`
- Production: User-configurable via `/settings/api`
- Persistent storage via LocalStorage

## Common Issues

### SSE Streaming Not Working
- Check browser console for connection errors
- Verify backend PORT matches frontend API_BASE
- Ensure CORS allows frontend origin

### Tool Input Display Corruption
- Verify JSON accumulation uses `+=` not `=`
- Check for final parse on `content_block_stop`
- Review `useAIStreamHandler.ts` implementation

### Type Errors After Changes
- Ensure types are updated in BOTH frontend and backend
- Run `pnpm run type-check` to verify
- Check import paths use `.js` extensions for ESM

### Session Cleanup Issues
- Sessions may get stuck in pending state
- Use `manualCleanupSession()` to force cleanup
- Check `sessionManager.ts` logs for cleanup errors

## Debugging & Testing

### Generate JWT Token for API Testing
When testing authenticated API endpoints manually (e.g., scheduled tasks), generate a JWT token:

```bash
# Generate a new JWT token (valid for 7 days by default)
cd /Users/kongjie/slides/ai-editor
node -e "require('./backend/dist/utils/jwt').generateToken().then(console.log)"
```

Then use the token in API calls:

```bash
# Example: Manually trigger a scheduled task
curl -X POST "http://127.0.0.1:4936/api/scheduled-tasks/<task_id>/run" \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# Example: Get task execution history
curl "http://127.0.0.1:4936/api/scheduled-tasks/<task_id>/history?limit=5" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### Test Claude CLI Directly
To verify Claude Code CLI is working:

```bash
cd /path/to/project
echo "Say OK" | claude --print --dangerously-skip-permissions
```

### Scheduled Task Model Compatibility
- **Claude models** (sonnet, haiku, opus): Fully compatible with `bypassPermissions` mode
- **GLM models**: May require testing - check `schedulerService.ts` for compatibility logic
