/**
 * Unit tests for a2a.ts - A2A Protocol Endpoints
 * Tests for Phase 3: US1 - Agent as A2A Server
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('../../middleware/a2aAuth');
vi.mock('../../middleware/rateLimiting');
vi.mock('../../services/a2a/agentMappingService');
vi.mock('../../services/a2a/apiKeyService');
vi.mock('../../services/a2a/taskManager', () => ({
  taskManager: {
    createTask: vi.fn().mockResolvedValue({
      id: 'test-task-id',
      taskId: 'test-task-id',
      status: 'pending',
      checkUrl: '/a2a/test-agent/tasks/test-task-id'
    }),
    getTask: vi.fn().mockImplementation((projectId, taskId) => {
      if (taskId === 'test-task-id') {
        return Promise.resolve({
          id: 'test-task-id',
          taskId: 'test-task-id',
          status: 'pending',
          createdAt: new Date().toISOString(),
          progress: { currentStep: 'Processing', percentComplete: 50 }
        });
      }
      return Promise.resolve(null);
    }),
    cancelTask: vi.fn().mockResolvedValue({
      id: 'test-task-id',
      taskId: 'test-task-id',
      status: 'canceled',
      message: 'Task canceled successfully'
    })
  }
}));
vi.mock('../../services/sessionManager');
vi.mock('../../utils/sessionUtils');

describe('A2A Protocol Endpoints', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set up Express app with A2A routes
    app = express();
    app.use(express.json());

    // Import mocked middleware
    const { a2aAuth } = await import('../../middleware/a2aAuth');
    const { a2aRateLimiter, a2aStrictRateLimiter } = await import('../../middleware/rateLimiting');

    // Mock middleware to add a2aContext
    vi.mocked(a2aAuth).mockImplementation(async (req: any, res, next) => {
      req.a2aContext = {
        a2aAgentId: 'test-a2a-agent-id',
        projectId: 'test-project',
        agentType: 'ppt-editor',
        workingDirectory: '/test/working/dir',
        apiKeyId: 'test-key-id'
      };
      next();
    });

    // Mock rate limiters (no-op for tests)
    vi.mocked(a2aRateLimiter).mockImplementation((req, res, next) => next());
    vi.mocked(a2aStrictRateLimiter).mockImplementation((req, res, next) => next());

    // Mock session management
    const { handleSessionManagement } = await import('../../utils/sessionUtils');
    vi.mocked(handleSessionManagement).mockResolvedValue({
      claudeSession: {
        sendMessage: vi.fn().mockImplementation((msg, callback) => {
          // Simulate immediate response
          callback({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'Processed message' }] }
          });
          callback({ type: 'result' });
          return Promise.resolve('req-id');
        }),
        getClaudeSessionId: vi.fn().mockReturnValue('test-session-id')
      },
      actualSessionId: 'test-session-id'
    });

    // Import and mount A2A router
    const a2aRouter = await import('../a2a');
    app.use('/a2a/:a2aAgentId', a2aRouter.default);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // T032: Test GET /.well-known/agent-card.json endpoint
  // ============================================================================
  describe('GET /.well-known/agent-card.json', () => {
    it('should return agent card with 200 status', async () => {
      const response = await request(app)
        .get('/a2a/test-agent/.well-known/agent-card.json')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('skills');
      expect(response.body).toHaveProperty('securitySchemes');
      expect(response.body).toHaveProperty('context');
    });

    it('should include correct context information', async () => {
      const response = await request(app)
        .get('/a2a/test-agent/.well-known/agent-card.json')
        .expect(200);

      expect(response.body.context).toMatchObject({
        a2aAgentId: 'test-a2a-agent-id',
        projectId: 'test-project',
        agentType: 'ppt-editor',
        workingDirectory: '/test/working/dir'
      });
    });

    it('should include security schemes with API key authentication', async () => {
      const response = await request(app)
        .get('/a2a/test-agent/.well-known/agent-card.json')
        .expect(200);

      expect(response.body.securitySchemes).toContainEqual({
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        scheme: 'bearer'
      });
    });

    it('should return 500 if authentication context is missing', async () => {
      // Mock middleware to not add context
      const { a2aAuth } = await import('../../middleware/a2aAuth');
      vi.mocked(a2aAuth).mockImplementation(async (req: any, res, next) => {
        // Don't add a2aContext
        next();
      });

      // Recreate app with new middleware behavior
      app = express();
      app.use(express.json());
      const a2aRouter = await import('../a2a');
      app.use('/a2a/:a2aAgentId', a2aRouter.default);

      const response = await request(app)
        .get('/a2a/test-agent/.well-known/agent-card.json')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('AUTH_CONTEXT_MISSING');
    });
  });

  // ============================================================================
  // T033: Test POST /messages endpoint
  // ============================================================================
  describe('POST /messages', () => {
    it('should accept valid message and return 200 status', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/messages')
        .send({
          message: 'Hello, agent!',
          context: { key: 'value' }
        })
        .expect(200);

      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('metadata');
    });

    it('should accept sessionId and return it', async () => {
      const { handleSessionManagement } = await import('../../utils/sessionUtils');
      vi.mocked(handleSessionManagement).mockResolvedValue({
        claudeSession: {
          sendMessage: vi.fn().mockImplementation((msg, callback) => {
            callback({
              type: 'assistant',
              message: { content: [{ type: 'text', text: 'Response' }] }
            });
            callback({ type: 'result' });
            return Promise.resolve('req-id');
          }),
          getClaudeSessionId: vi.fn().mockReturnValue('existing-session-id')
        },
        actualSessionId: 'existing-session-id'
      });

      const response = await request(app)
        .post('/a2a/test-agent/messages')
        .send({
          message: 'Hello again',
          sessionId: 'existing-session-id'
        })
        .expect(200);

      expect(response.body.sessionId).toBe('existing-session-id');
      expect(handleSessionManagement).toHaveBeenCalledWith(
        expect.anything(),
        'existing-session-id',
        expect.anything(),
        expect.not.objectContaining({ resume: 'existing-session-id' })
      );
    });

    it('should process message with only required fields', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/messages')
        .send({
          message: 'Test message'
        })
        .expect(200);

      expect(response.body).toHaveProperty('response');
      expect(response.body.response).toContain('Processed message');
    });

    it('should return 400 for missing message field', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/messages')
        .send({
          context: { key: 'value' }
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 for invalid message type', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/messages')
        .send({
          message: 123 // Should be string
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty message string', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/messages')
        .send({
          message: ''
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 if authentication context is missing', async () => {
      // Mock middleware to not add context
      const { a2aAuth } = await import('../../middleware/a2aAuth');
      vi.mocked(a2aAuth).mockImplementation(async (req: any, res, next) => {
        next();
      });

      // Recreate app
      app = express();
      app.use(express.json());
      const a2aRouter = await import('../a2a');
      app.use('/a2a/:a2aAgentId', a2aRouter.default);

      const response = await request(app)
        .post('/a2a/test-agent/messages')
        .send({
          message: 'Test message'
        })
        .expect(500);

      expect(response.body.code).toBe('AUTH_CONTEXT_MISSING');
    });
  });

  // ============================================================================
  // T034: Test POST /tasks endpoint
  // ============================================================================
  describe('POST /tasks', () => {
    it('should accept valid task request and return 202 status', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/tasks')
        .send({
          message: 'Long running task',
          timeout: 300000,
          context: { key: 'value' }
        })
        .expect(202);

      expect(response.body).toHaveProperty('taskId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checkUrl');
      expect(response.body.status).toBe('pending');
    });

    it('should create task with only required fields', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/tasks')
        .send({
          message: 'Test task'
        })
        .expect(202);

      expect(response.body).toHaveProperty('taskId');
      expect(response.body.status).toBe('pending');
    });

    it('should return checkUrl with correct path', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/tasks')
        .send({
          message: 'Test task'
        })
        .expect(202);

      expect(response.body.checkUrl).toContain('/a2a/test-a2a-agent-id/tasks/');
      expect(response.body.checkUrl).toContain(response.body.taskId);
    });

    it('should return 400 for missing message field', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/tasks')
        .send({
          timeout: 300000
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid timeout value', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/tasks')
        .send({
          message: 'Test task',
          timeout: 'invalid' // Should be number
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for negative timeout value', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/tasks')
        .send({
          message: 'Test task',
          timeout: -1000
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================================================
  // T035: Test authentication failure scenarios
  // ============================================================================
  describe('Authentication Failures', () => {
    beforeEach(async () => {
      // Mock auth middleware to reject requests
      const { a2aAuth } = await import('../../middleware/a2aAuth');
      vi.mocked(a2aAuth).mockImplementation(async (req, res: any, next) => {
        return res.status(401).json({
          error: 'Unauthorized',
          code: 'INVALID_API_KEY'
        });
      });

      // Recreate app with failing auth
      app = express();
      app.use(express.json());
      const a2aRouter = await import('../a2a');
      app.use('/a2a/:a2aAgentId', a2aRouter.default);
    });

    it('should reject agent card request without valid API key', async () => {
      const response = await request(app)
        .get('/a2a/test-agent/.well-known/agent-card.json')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('INVALID_API_KEY');
    });

    it('should reject message request without valid API key', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/messages')
        .send({
          message: 'Test message'
        })
        .expect(401);

      expect(response.body.code).toBe('INVALID_API_KEY');
    });

    it('should reject task creation without valid API key', async () => {
      const response = await request(app)
        .post('/a2a/test-agent/tasks')
        .send({
          message: 'Test task'
        })
        .expect(401);

      expect(response.body.code).toBe('INVALID_API_KEY');
    });

    it('should reject task status query without valid API key', async () => {
      const response = await request(app)
        .get('/a2a/test-agent/tasks/test-task-id')
        .expect(401);

      expect(response.body.code).toBe('INVALID_API_KEY');
    });

    it('should reject task cancellation without valid API key', async () => {
      const response = await request(app)
        .delete('/a2a/test-agent/tasks/test-task-id')
        .expect(401);

      expect(response.body.code).toBe('INVALID_API_KEY');
    });
  });

  // ============================================================================
  // T036: Test rate limiting behavior
  // ============================================================================
  describe('Rate Limiting', () => {
    it('should enforce rate limit on task creation endpoint', async () => {
      const { a2aStrictRateLimiter } = await import('../../middleware/rateLimiting');

      // Mock rate limiter to reject request
      vi.mocked(a2aStrictRateLimiter).mockImplementation((req, res: any, next) => {
        return res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 3600
        });
      });

      // Recreate app with rate limiting
      app = express();
      app.use(express.json());

      const { a2aAuth } = await import('../../middleware/a2aAuth');
      const { a2aRateLimiter } = await import('../../middleware/rateLimiting');

      vi.mocked(a2aAuth).mockImplementation(async (req: any, res, next) => {
        req.a2aContext = {
          a2aAgentId: 'test-a2a-agent-id',
          projectId: 'test-project',
          agentType: 'ppt-editor',
          workingDirectory: '/test/working/dir',
          apiKeyId: 'test-key-id'
        };
        next();
      });
      vi.mocked(a2aRateLimiter).mockImplementation((req, res, next) => next());

      const a2aRouter = await import('../a2a');
      app.use('/a2a/:a2aAgentId', a2aRouter.default);

      const response = await request(app)
        .post('/a2a/test-agent/tasks')
        .send({
          message: 'Test task'
        })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body).toHaveProperty('retryAfter');
    });

    it('should enforce rate limit on regular endpoints', async () => {
      const { a2aAuth } = await import('../../middleware/a2aAuth');
      const { a2aRateLimiter, a2aStrictRateLimiter } = await import('../../middleware/rateLimiting');

      // Mock rate limiter to reject request
      vi.mocked(a2aRateLimiter).mockImplementation((req, res: any, next) => {
        return res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 3600
        });
      });

      // Recreate app with rate limiting
      app = express();
      app.use(express.json());

      vi.mocked(a2aAuth).mockImplementation(async (req: any, res, next) => {
        req.a2aContext = {
          a2aAgentId: 'test-a2a-agent-id',
          projectId: 'test-project',
          agentType: 'ppt-editor',
          workingDirectory: '/test/working/dir',
          apiKeyId: 'test-key-id'
        };
        next();
      });
      vi.mocked(a2aStrictRateLimiter).mockImplementation((req, res, next) => next());

      const a2aRouter = await import('../a2a');
      app.use('/a2a/:a2aAgentId', a2aRouter.default);

      const response = await request(app)
        .post('/a2a/test-agent/messages')
        .send({
          message: 'Test message'
        })
        .expect(429);

      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  // ============================================================================
  // Additional Tests for Task Management Endpoints
  // ============================================================================
  describe('GET /tasks/:taskId', () => {
    it('should return task status with 200', async () => {
      const response = await request(app)
        .get('/a2a/test-agent/tasks/test-task-id')
        .expect(200);

      expect(response.body).toHaveProperty('taskId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should include progress information', async () => {
      const response = await request(app)
        .get('/a2a/test-agent/tasks/test-task-id')
        .expect(200);

      expect(response.body).toHaveProperty('progress');
      expect(response.body.progress).toHaveProperty('currentStep');
      expect(response.body.progress).toHaveProperty('percentComplete');
    });
  });

  describe('DELETE /tasks/:taskId', () => {
    it('should cancel task and return 200', async () => {
      const response = await request(app)
        .delete('/a2a/test-agent/tasks/test-task-id')
        .expect(200);

      expect(response.body).toHaveProperty('taskId');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('canceled');
      expect(response.body).toHaveProperty('message');
    });
  });
});
