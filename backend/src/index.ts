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
import skillsRouter from './routes/skills';
import pluginsRouter from './routes/plugins';
import a2aRouter from './routes/a2a';
import a2aManagementRouter from './routes/a2aManagement';
import scheduledTasksRouter from './routes/scheduledTasks';
import mcpAdminRouter from './routes/mcpAdmin';
import mcpAdminManagementRouter from './routes/mcpAdminManagement';
import cloudflareTunnelRouter from './routes/cloudflareTunnel';
import { authMiddleware } from './middleware/auth';
import { httpsOnly } from './middleware/httpsOnly';
import { loadConfig, getSlidesDir } from './config/index';
import { cleanupOrphanedTasks } from './services/a2a/taskCleanup';
import { startTaskTimeoutMonitor, stopTaskTimeoutMonitor } from './jobs/taskTimeoutMonitor';
import { initializeScheduler, shutdownScheduler } from './services/schedulerService';

dotenv.config();

// Get version from package.json (works in both dev and npm package mode)
const getVersion = () => {
  // Try npm package mode first (package.json in same directory as dist)
  const npmPackagePath = join(__dirname, 'package.json');
  // Then try development mode (backend/package.json)
  const devPackagePath = join(__dirname, '../package.json');
  // Also try root package.json
  const rootPackagePath = join(__dirname, '../../package.json');
  
  for (const packagePath of [npmPackagePath, devPackagePath, rootPackagePath]) {
    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      if (packageJson.version) {
        return packageJson.version;
      }
    } catch {
      // Continue to next path
    }
  }
  
  console.warn('Could not read version from package.json');
  return 'unknown';
};

const VERSION = getVersion();

const app: express.Express = express();

// Async initialization
(async () => {
  // Load configuration (including port and host)
  const config = await loadConfig();
  const PORT = config.port || 4936;
  const HOST = config.host || '0.0.0.0';

  // Initialize system Claude version if needed
  try {
    const { initializeSystemVersion } = await import('./services/claudeVersionStorage.js');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Try to find Claude executable, but initialize anyway
    let claudePath: string | null = null;
    try {
      const { stdout } = await execAsync('which claude');
      if (stdout && stdout.trim()) {
        claudePath = stdout.trim();
        console.log(`[System] Found Claude CLI at: ${claudePath}`);
      }
    } catch (error) {
      console.log('[System] Claude CLI not found in PATH, initializing without executable path');
    }

    // Initialize system version (with or without executable path)
    await initializeSystemVersion(claudePath || '');
    console.log(`[System] Initialized Claude version${claudePath ? ` from: ${claudePath}` : ' without executable path'}`);
  } catch (error) {
    console.warn('Failed to initialize system Claude version:', error);
  }

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow eval for development
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "data:"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:", "blob:", "data:", "http://localhost:*", "http://127.0.0.1:*", "https://localhost:*", "https://127.0.0.1:*"],
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

  // A2A Task Lifecycle: Clean up orphaned tasks on startup
  console.info('[A2A] Running orphaned task cleanup...');
  try {
    const cleanedCount = await cleanupOrphanedTasks();
    if (cleanedCount > 0) {
      console.info(`[A2A] Cleaned up ${cleanedCount} orphaned tasks`);
    } else {
      console.info('[A2A] No orphaned tasks found');
    }
  } catch (error) {
    console.error('[A2A] Error during orphaned task cleanup:', error);
  }

  // A2A Task Lifecycle: Start task timeout monitor
  console.info('[A2A] Starting task timeout monitor...');
  try {
    startTaskTimeoutMonitor();
  } catch (error) {
    console.error('[A2A] Error starting task timeout monitor:', error);
  }

  // Scheduled Tasks: Initialize scheduler (always initialize, but enable state depends on env var)
  const enableSchedulerInitially = process.env.ENABLE_SCHEDULER !== 'false'; // Default to true
  console.info('[Scheduler] Initializing scheduled tasks... (ENABLE_SCHEDULER=' + process.env.ENABLE_SCHEDULER + ', initial enabled=' + enableSchedulerInitially + ')');
  try {
    initializeScheduler({ enabled: enableSchedulerInitially });
  } catch (error) {
    console.error('[Scheduler] Error initializing scheduler:', error);
  }

  // Static files - serve embedded frontend (for npm package) or development frontend
  // Check both npm package location (./public) and development location (../../frontend/dist)
  const fs = await import('fs');
  const npmPublicPath = join(__dirname, 'public');
  const devFrontendPath = join(__dirname, '../../frontend/dist');
  
  // Prefer npm package embedded frontend, fallback to development path
  const frontendDistPath = fs.existsSync(npmPublicPath) ? npmPublicPath : devFrontendPath;
  const hasEmbeddedFrontend = fs.existsSync(join(frontendDistPath, 'index.html'));

  if (hasEmbeddedFrontend && process.env.API_ONLY !== 'true') {
    app.use(express.static(frontendDistPath));

    // For SPA routing - serve index.html for any non-API routes
    app.get('*', (req, res, next) => {
      // Skip API routes and other specific routes
      if (req.path.startsWith('/api') ||
          req.path.startsWith('/media') ||
          req.path.startsWith('/slides') ||
          req.path.startsWith('/a2a')) {
        return next();
      }

      // Serve index.html for all other routes
      res.sendFile(join(frontendDistPath, 'index.html'));
    });

    console.log(`Frontend static files enabled from: ${frontendDistPath}`);
  } else if (process.env.API_ONLY === 'true') {
    console.log('API only mode - frontend serving disabled');
  } else {
    console.log('Frontend build not found, serving API only');
  }

// Routes - Public routes
  app.use('/api/auth', authRouter);
  // MCP Admin - uses its own API key authentication
  app.use('/api/mcp-admin', mcpAdminRouter);
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

  // A2A Protocol routes - Public but require API key authentication and HTTPS in production
  app.use('/a2a/:a2aAgentId', httpsOnly, a2aRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: VERSION,
      name: 'agentstudio-backend'
    });
  });

  // A2A Health check (public endpoint, no authentication required)
  app.get('/api/a2a/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      protocol: 'A2A',
      timestamp: new Date().toISOString(),
      features: {
        agentCard: true,
        syncMessages: true,
        asyncTasks: true,
        taskManagement: true,
        apiKeyAuth: true,
      },
    });
  });

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
  app.use('/api/a2a', authMiddleware, a2aManagementRouter); // A2A management routes with user auth
  app.use('/api/skills', authMiddleware, skillsRouter);
  app.use('/api/plugins', authMiddleware, pluginsRouter);
  app.use('/api/scheduled-tasks', authMiddleware, scheduledTasksRouter);
  app.use('/api/mcp-admin-management', authMiddleware, mcpAdminManagementRouter); // MCP Admin management with JWT auth
  app.use('/api/cloudflare-tunnel', authMiddleware, cloudflareTunnelRouter); // Cloudflare Tunnel management
  app.use('/api/media', mediaAuthRouter); // Media auth endpoints
  app.use('/media', mediaRouter); // Remove authMiddleware - media files are now public

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

  // Graceful shutdown handler
  const gracefulShutdown = () => {
    console.info('[System] Shutting down gracefully...');

    // Stop task timeout monitor
    try {
      stopTaskTimeoutMonitor();
    } catch (error) {
      console.error('[A2A] Error stopping task timeout monitor:', error);
    }

    // Stop scheduler
    try {
      shutdownScheduler();
    } catch (error) {
      console.error('[Scheduler] Error shutting down scheduler:', error);
    }

    // Exit process
    process.exit(0);
  };

  // Register shutdown handlers
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Check if this file is being run directly (CommonJS way)
  if (require.main === module) {
    app.listen(PORT, HOST, () => {
      console.log(`AI PPT Editor backend running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
      console.log(`Serving slides from: ${slidesDir}`);
    });
  }
})();

export default app;
