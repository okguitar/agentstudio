import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';

import filesRouter from './routes/files';
import agentsRouter from './routes/agents';
import mcpRouter from './routes/mcp';
import sessionsRouter from './routes/sessions';
import mediaRouter from './routes/media';
import mediaAuthRouter from './routes/mediaAuth';
import settingsRouter from './routes/settings';
import commandsRouter from './routes/commands';
import subagentsRouter from './routes/subagents';
import projectsRouter from './routes/projects';
import authRouter from './routes/auth';
import configRouter from './routes/config';
import slackRouter from './routes/slack';
import { authMiddleware } from './middleware/auth';
import { loadConfig, getSlidesDir } from './config/index';

dotenv.config();

// Get version from package.json
const getVersion = () => {
  try {
    const packagePath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.warn('Could not read version from package.json:', error);
    return 'unknown';
  }
};

const VERSION = getVersion();

const app: express.Express = express();

// Async initialization
(async () => {
  // Load configuration (including port and host)
  const config = await loadConfig();
  const PORT = config.port || 4936;
  const HOST = config.host || '0.0.0.0';

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow eval for development
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "data:"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:", "blob:", "data:"],
        frameAncestors: ["'self'", "http://localhost:3000", "https://localhost:3000", "http://localhost:3001", "https://agentstudio.cc", "https://*.agentstudio.cc"], // Allow iframe embedding
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"]
      }
    },
    // Disable problematic headers for non-HTTPS access
    crossOriginOpenerPolicy: false,
    originAgentCluster: false
  }));

  // Configure CORS origins
  const getAllowedOrigins = () => {
    const defaultOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ];

    // Add custom origins from configuration
    const customOrigins = config.corsOrigins ?
      config.corsOrigins.split(',').map(origin => origin.trim()) : [];

    return [...defaultOrigins, ...customOrigins];
  };

  app.use(cors({
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if the origin is allowed
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview URLs (*.vercel.app)
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      // Allow agentstudio.cc and its subdomains (*.agentstudio.cc) - hardcoded
      if (origin === 'https://agentstudio.cc' || origin === 'http://agentstudio.cc' ||
          origin.endsWith('.agentstudio.cc')) {
        return callback(null, true);
      }

      // Allow custom domains from configuration (CORS_ALLOWED_DOMAINS)
      const customDomains = config.corsAllowedDomains ?
        config.corsAllowedDomains.split(',').map(domain => domain.trim()) : [];

      for (const domain of customDomains) {
        // Match exact domain (https://example.com)
        if (origin === `https://${domain}` || origin === `http://${domain}`) {
          return callback(null, true);
        }
        // Match subdomains (https://*.example.com)
        if (origin.endsWith(`.${domain}`)) {
          return callback(null, true);
        }
      }

      // Allow any localhost with any port for development
      if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
        return callback(null, true);
      }

      // Allow 127.0.0.1 with any port for development
      if (origin.match(/^https?:\/\/127\.0\.0\.1(:\d+)?$/)) {
        return callback(null, true);
      }

      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  }));
  // JSON parser - skip /api/slack (needs raw body for signature verification)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/slack')) {
      return next();
    }
    express.json({ limit: '10mb' })(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static files - serve slides directory
  const slidesDir = await getSlidesDir();
  app.use('/slides', express.static(slidesDir));

  // Static files - serve frontend in production
  if (process.env.NODE_ENV === 'production') {
    // Check if frontend build exists
    const frontendDistPath = join(__dirname, '../../frontend/dist');
    const fs = await import('fs');

    if (fs.existsSync(frontendDistPath)) {
      app.use(express.static(frontendDistPath));

      // For SPA routing - serve index.html for any non-API routes
      app.get('*', (req, res, next) => {
        // Skip API routes and other specific routes
        if (req.path.startsWith('/api') ||
            req.path.startsWith('/media') ||
            req.path.startsWith('/slides')) {
          return next();
        }

        // Serve index.html for all other routes
        res.sendFile(join(frontendDistPath, 'index.html'));
      });

      console.log('Frontend static files enabled');
    } else {
      console.log('Frontend build not found, serving API only');
    }
  }

// Routes - Public routes
  app.use('/api/auth', authRouter);
  // Slack webhook - needs raw body for signature verification
  app.use('/api/slack',
    express.json({
      limit: '10mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString('utf8');
      }
    }),
    slackRouter
  );

  // Protected routes - Require authentication
  app.use('/api/files', authMiddleware, filesRouter);
  app.use('/api/agents', authMiddleware, agentsRouter);
  app.use('/api/mcp', authMiddleware, mcpRouter);
  app.use('/api/sessions', authMiddleware, sessionsRouter);
  app.use('/api/settings', authMiddleware, settingsRouter);
  app.use('/api/config', authMiddleware, configRouter);
  app.use('/api/commands', authMiddleware, commandsRouter);
  app.use('/api/subagents', authMiddleware, subagentsRouter);
  app.use('/api/projects', authMiddleware, projectsRouter);
  app.use('/api/media', mediaAuthRouter); // Media auth endpoints
  app.use('/media', mediaRouter); // Remove authMiddleware - media files are now public

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: VERSION,
      name: 'agentstudio-backend'
    });
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

  // Check if this file is being run directly (CommonJS way)
  if (require.main === module) {
    app.listen(PORT, HOST, () => {
      console.log(`AI PPT Editor backend running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
      console.log(`Serving slides from: ${slidesDir}`);
    });
  }
})();

export default app;
