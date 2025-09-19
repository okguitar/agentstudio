import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import filesRouter from './routes/files.js';
import agentsRouter from './routes/agents.js';
import mcpRouter from './routes/mcp.js';
import sessionsRouter from './routes/sessions.js';
import mediaRouter from './routes/media.js';
import settingsRouter from './routes/settings.js';
import commandsRouter from './routes/commands.js';
import subagentsRouter from './routes/subagents.js';
import projectsRouter from './routes/projects.js';
import { usageRouter } from './routes/usage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameAncestors: ["'self'", "http://localhost:3000", "https://localhost:3000", "http://localhost:3001"] // Allow iframe embedding
    }
  }
}));
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - serve slides directory
const slidesDir = join(__dirname, '../..', process.env.SLIDES_DIR || 'slides');
app.use('/slides', express.static(slidesDir));

// Routes
app.use('/api/files', filesRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/mcp', mcpRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/commands', commandsRouter);
app.use('/api/subagents', subagentsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/usage', usageRouter);
app.use('/media', mediaRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`AI PPT Editor backend running on http://localhost:${PORT}`);
  console.log(`Serving slides from: ${slidesDir}`);
});