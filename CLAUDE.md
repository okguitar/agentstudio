# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Developer Information

**Project Owner**: jeffkit
- **Name**: jeffkit
- **Email**: bbmyth@gmail.com
- **GitHub**: https://github.com/jeffkit

When creating or updating package.json files, use the above information for:
- `author` field: "jeffkit <bbmyth@gmail.com>"
- `repository.url`: "https://github.com/jeffkit/ai-ppt-editor.git"
- `homepage`: "https://github.com/jeffkit/ai-ppt-editor#readme"
- `bugs.url`: "https://github.com/jeffkit/ai-ppt-editor/issues"

## Project Overview

AI-powered PPT editor with React frontend and Node.js backend. The application features an agent-based architecture where specialized AI agents handle different types of content editing. The main interface provides a split-panel layout (chat on left, preview on right) with real-time collaboration between users and AI agents.

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
- `/api/health`: Health check endpoint
- Static file serving for slide HTML content via `/slides/*`

### Agent-Based Architecture
The application uses a sophisticated agent system built on Claude Code SDK:
- **Built-in Agents**: PPT Editor, Code Assistant, Document Writer
- **Custom Agents**: Configurable agents with specific tools and permissions
- **Session Management**: Per-agent conversation history with automatic title generation
- **Tool Integration**: Dynamic tool rendering with real-time status updates
- **Project-Aware**: Agents operate within specific project contexts

### File System Integration
- Slides stored as individual HTML files in `../slides/` directory (relative to backend)
- Compatible with existing html-slide-player framework
- Maintains 1280x720 slide dimensions and CSS conventions

## Development Commands

### Setup and Installation
```bash
npm run setup                # Install all dependencies (root, frontend, backend)
```

### Development
```bash
npm run dev                  # Start both frontend (3000) and backend (3001)
npm run dev:frontend         # Frontend only
npm run dev:backend          # Backend only
```

### Building and Production
```bash
npm run build               # Build both frontend and backend
npm run build:frontend      # Build frontend only
npm run build:backend       # Build backend only
npm start                   # Start production backend
```

### Testing
```bash
cd frontend && npm test        # Run tests
cd frontend && npm run test:ui # Run tests with UI
cd frontend && npm run test:run # Run tests once
cd frontend && npm run test:coverage # Run with coverage
```

### Code Quality
```bash
cd frontend && npm run lint    # ESLint for frontend
cd backend && npm run type-check  # TypeScript type checking
```

## Environment Configuration

Backend requires `.env` file in `backend/` directory:
```env
# AI Provider (choose one)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server Configuration
PORT=3002  # Note: Backend runs on port 3002, frontend on 3000
NODE_ENV=development

# File System
SLIDES_DIR=../slides  # Relative to backend/src
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

### Slide Management
- Slides are HTML files with embedded CSS
- Each slide maintains 1280x720 dimensions
- Auto-saving after AI edits via PUT /api/slides/:index

## Compatibility Notes

- Fully compatible with existing html-slide-player framework
- Maintains slides.js configuration format
- Preserves existing CSS styling conventions
- Uses same file structure and naming patterns

## Development Guidelines

### Project Structure
```
ai-editor/
├── package.json                    # Root package.json with monorepo scripts
├── shared/                         # Shared types and utilities
│   ├── types/agents.ts            # Agent configuration types
│   └── utils/agentStorage.ts      # Agent persistence utilities
├── frontend/                      # React frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── tools/             # Dynamic tool visualization components
│   │   │   └── ui/               # Reusable UI components
│   │   ├── hooks/                # React Query hooks
│   │   ├── stores/               # Zustand state management
│   │   ├── pages/                # Page components
│   │   └── types/                # Frontend type definitions
│   ├── vitest.config.ts          # Test configuration
│   └── vite.config.ts            # Vite configuration
└── backend/                      # Node.js backend
    ├── src/
    │   ├── routes/               # Express routes
    │   │   ├── agents.ts         # Agent-based AI endpoints
    │   │   ├── ai.ts            # Legacy AI endpoints
    │   │   └── slides.ts        # Slide CRUD operations
    │   └── index.ts             # Server entry point
    └── .env.example             # Environment variables template
```

### Adding New AI Features
1. Create agent configuration in `shared/types/agents.ts`
2. Add agent routes in `backend/src/routes/agents.ts`
3. Update frontend components to support new agent types

### UI Component Development
- Follow existing patterns in `frontend/src/components/`
- Use TailwindCSS for styling
- Implement tool components in `components/tools/` for custom tool rendering
- Add TypeScript interfaces in appropriate type files

### Testing
- Write component tests using Vitest + Testing Library
- Test files should be co-located with components in `__tests__/` directories
- Use jsdom environment for component testing

### Agent Development
- Extend `BUILTIN_AGENTS` in `shared/types/agents.ts` for new built-in agents
- Configure agent tools, permissions, and UI properties
- Implement context builders for agent-specific data