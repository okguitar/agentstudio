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

AI-powered PPT editor with React frontend and Node.js backend. The application allows users to chat with AI to edit presentation slides in real-time with a split-panel interface (chat on left, preview on right).

## Architecture

### Full-Stack Monorepo Structure
- **Root**: Shared package.json with concurrently for running both services
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript with AI SDK integration

### Key Technologies
- **State Management**: Zustand (lightweight) + React Query (server state)
- **AI Integration**: Vercel AI SDK supporting OpenAI/Anthropic
- **Build Tools**: Vite (frontend), TSX (backend development)
- **Styling**: TailwindCSS with component variants

### Core Components Architecture
- `ChatPanel.tsx`: AI conversation interface with streaming responses
- `PreviewPanel.tsx`: Grid layout for slide thumbnails with zoom controls
- `SlidePreview.tsx`: Individual slide renderer with edit capabilities
- `useSlides.ts`: React Query hooks for slide CRUD operations
- `useAI.ts`: AI chat and slide editing functionality
- `useAppStore.ts`: Global application state (current slide, selection, etc.)

### API Design
Backend follows RESTful patterns:
- `/api/slides/*`: Slide CRUD operations (GET, PUT, POST, DELETE)
- `/api/ai/*`: AI functionality (chat, edit-slide, generate-slide)
- Static file serving for slide HTML content via `/slides/*`

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

### Code Quality
```bash
cd frontend && npm run lint  # ESLint for frontend
cd backend && npm run type-check  # TypeScript type checking
```

## Environment Configuration

Backend requires `.env` file in `backend/` directory:
```env
# AI Provider (choose one)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# File System
SLIDES_DIR=../slides  # Relative to backend/src
```

## Key Development Patterns

### State Management Flow
1. Server state managed by React Query (`useSlides` hook)
2. Client state managed by Zustand (`useAppStore`)
3. AI interactions use streaming responses with `useAI` hook

### AI Integration Pattern
- All AI requests go through backend API routes
- Frontend uses streaming responses for real-time chat
- AI operations automatically trigger slide data refresh

### Slide Management
- Slides are HTML files with embedded CSS
- Each slide maintains 1280x720 dimensions
- Auto-saving after AI edits via PUT /api/slides/:index

## Compatibility Notes

- Fully compatible with existing html-slide-player framework
- Maintains slides.js configuration format
- Preserves existing CSS styling conventions
- Uses same file structure and naming patterns

## Common Development Tasks

### Adding New AI Features
Add routes in `backend/src/routes/ai.ts` and corresponding frontend hooks in `hooks/useAI.ts`

### UI Component Development
Create components in `frontend/src/components/` following existing patterns with TailwindCSS

### State Management Extensions
Extend `useAppStore.ts` for new global state requirements