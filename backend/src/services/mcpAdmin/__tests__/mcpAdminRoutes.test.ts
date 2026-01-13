/**
 * MCP Admin Routes Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock admin API key service before importing route
const TEST_HOME = path.join(os.tmpdir(), 'mcp-admin-routes-test-' + Date.now());

// Store generated keys for testing
let testApiKey: string;
let testKeyId: string;

vi.mock('../adminApiKeyService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../adminApiKeyService.js')>();
  
  return {
    ...actual,
    validateAdminApiKey: vi.fn().mockImplementation(async (apiKey: string) => {
      if (apiKey === 'ask_valid_test_key_1234567890123456') {
        return {
          valid: true,
          keyId: 'test-key-id',
          permissions: ['admin:*'],
        };
      }
      if (apiKey === 'ask_limited_key_12345678901234567') {
        return {
          valid: true,
          keyId: 'limited-key-id',
          permissions: ['projects:read', 'agents:read'],
        };
      }
      return { valid: false };
    }),
    generateAdminApiKey: vi.fn().mockImplementation(async (description: string, permissions: string[]) => {
      return {
        key: 'ask_new_generated_key_1234567890',
        keyData: {
          id: 'new-key-id',
          description,
          permissions,
          createdAt: new Date().toISOString(),
        },
      };
    }),
    listAdminApiKeys: vi.fn().mockImplementation(async () => {
      return [
        {
          id: 'test-key-id',
          description: 'Test key',
          permissions: ['admin:*'],
          createdAt: '2024-01-01T00:00:00Z',
          decryptedKey: 'ask_valid_test_key_1234567890123456',
        },
      ];
    }),
    revokeAdminApiKey: vi.fn().mockImplementation(async (keyId: string) => {
      return keyId === 'other-key-id';
    }),
  };
});

// Mock MCP Admin Server
vi.mock('../mcpAdminServer.js', () => {
  const mockServer = {
    registerTools: vi.fn(),
    getToolCount: vi.fn().mockReturnValue(15),
    handleRequest: vi.fn().mockImplementation(async (request: any) => {
      if (request.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'agentstudio-admin', version: '1.0.0' },
            capabilities: { tools: {} },
          },
        };
      }
      if (request.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              { name: 'list_projects', description: 'List projects' },
              { name: 'list_agents', description: 'List agents' },
            ],
          },
        };
      }
      if (request.method === 'ping') {
        return { jsonrpc: '2.0', id: request.id, result: {} };
      }
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: 'Method not found' },
      };
    }),
  };

  return {
    getMcpAdminServer: vi.fn().mockReturnValue(mockServer),
    resetMcpAdminServer: vi.fn(),
  };
});

// Mock all tools
vi.mock('../tools/index.js', () => ({
  allTools: [],
  projectTools: [],
  agentTools: [],
  mcpServerTools: [],
  systemTools: [],
}));

// Import route after mocks
import mcpAdminRouter from '../../../routes/mcpAdmin.js';

describe('MCP Admin Routes', () => {
  let app: express.Express;

  beforeAll(() => {
    process.env.HOME = TEST_HOME;
  });

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/mcp-admin', mcpAdminRouter);

    // Create test directory
    await fs.mkdir(path.join(TEST_HOME, '.claude-agent'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_HOME, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Authentication', () => {
    it('should reject requests without Authorization header', async () => {
      const res = await request(app)
        .post('/api/mcp-admin')
        .send({ jsonrpc: '2.0', id: 1, method: 'ping' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Missing Authorization');
    });

    it('should reject requests with invalid Authorization format', async () => {
      const res = await request(app)
        .post('/api/mcp-admin')
        .set('Authorization', 'Basic invalid')
        .send({ jsonrpc: '2.0', id: 1, method: 'ping' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid Authorization');
    });

    it('should reject requests with invalid API key', async () => {
      const res = await request(app)
        .post('/api/mcp-admin')
        .set('Authorization', 'Bearer ask_invalid_key')
        .send({ jsonrpc: '2.0', id: 1, method: 'ping' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid or revoked');
    });

    it('should accept requests with valid API key', async () => {
      const res = await request(app)
        .post('/api/mcp-admin')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456')
        .send({ jsonrpc: '2.0', id: 1, method: 'ping' });

      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
    });
  });

  describe('POST /api/mcp-admin', () => {
    it('should handle initialize request', async () => {
      const res = await request(app)
        .post('/api/mcp-admin')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            clientInfo: { name: 'test', version: '1.0.0' },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.jsonrpc).toBe('2.0');
      expect(res.body.id).toBe(1);
      expect(res.body.result.protocolVersion).toBeDefined();
      expect(res.body.result.serverInfo).toBeDefined();
    });

    it('should handle tools/list request', async () => {
      const res = await request(app)
        .post('/api/mcp-admin')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456')
        .send({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        });

      expect(res.status).toBe(200);
      expect(res.body.result.tools).toBeDefined();
      expect(Array.isArray(res.body.result.tools)).toBe(true);
    });

    it('should return error for invalid JSON-RPC request', async () => {
      const res = await request(app)
        .post('/api/mcp-admin')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456')
        .send({ invalid: 'request' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return error for missing method', async () => {
      const res = await request(app)
        .post('/api/mcp-admin')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456')
        .send({ jsonrpc: '2.0', id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Invalid Request');
    });

    it('should set Content-Type to application/json', async () => {
      const res = await request(app)
        .post('/api/mcp-admin')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456')
        .send({ jsonrpc: '2.0', id: 1, method: 'ping' });

      expect(res.headers['content-type']).toContain('application/json');
    });
  });

  describe('GET /api/mcp-admin/keys', () => {
    it('should list API keys for admin', async () => {
      const res = await request(app)
        .get('/api/mcp-admin/keys')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456');

      expect(res.status).toBe(200);
      expect(res.body.keys).toBeDefined();
      expect(Array.isArray(res.body.keys)).toBe(true);
    });

    it('should deny access for non-admin', async () => {
      const res = await request(app)
        .get('/api/mcp-admin/keys')
        .set('Authorization', 'Bearer ask_limited_key_12345678901234567');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Permission denied');
    });
  });

  describe('POST /api/mcp-admin/keys', () => {
    it('should create new API key', async () => {
      const res = await request(app)
        .post('/api/mcp-admin/keys')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456')
        .send({ description: 'New test key' });

      expect(res.status).toBe(201);
      expect(res.body.key).toBeDefined();
      expect(res.body.key.startsWith('ask_')).toBe(true);
      expect(res.body.message).toContain('Save this key');
    });

    it('should reject without description', async () => {
      const res = await request(app)
        .post('/api/mcp-admin/keys')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Description is required');
    });
  });

  describe('DELETE /api/mcp-admin/keys/:keyId', () => {
    it('should revoke API key', async () => {
      const res = await request(app)
        .delete('/api/mcp-admin/keys/other-key-id')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should prevent self-revocation', async () => {
      const res = await request(app)
        .delete('/api/mcp-admin/keys/test-key-id')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot revoke your own');
    });

    it('should return 404 for non-existent key', async () => {
      const res = await request(app)
        .delete('/api/mcp-admin/keys/non-existent')
        .set('Authorization', 'Bearer ask_valid_test_key_1234567890123456');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/mcp-admin/bootstrap', () => {
    it('should reject bootstrap when keys exist', async () => {
      const res = await request(app)
        .post('/api/mcp-admin/bootstrap')
        .send({ description: 'First admin key' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Bootstrap not allowed');
    });

    it('should reject without description', async () => {
      // Need to mock empty keys for this test
      const { listAdminApiKeys } = await import('../adminApiKeyService.js');
      vi.mocked(listAdminApiKeys).mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/mcp-admin/bootstrap')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Description is required');
    });
  });
});
