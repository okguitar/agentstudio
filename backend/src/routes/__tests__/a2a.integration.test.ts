/**
 * Integration tests for A2A Protocol
 * Tests for Phase 3: US1 - Agent Discovery Workflow
 *
 * This test suite validates the complete agent discovery workflow:
 * 1. Get/create A2A ID for an agent
 * 2. Generate API key for project
 * 3. Retrieve Agent Card using A2A ID and API key
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import os from 'os';

// Mock the paths module before importing services
// Note: vi.mock is hoisted, so we use inline values instead of referencing testDataDir
vi.mock('../../config/paths', () => {
  const tmpDir = require('os').tmpdir();
  const pathJoin = require('path').join;
  const mockTestDataDir = pathJoin(tmpDir, 'a2a-integration-test');
  return {
    CLAUDE_AGENT_DIR: mockTestDataDir,
    A2A_AGENT_MAPPINGS_FILE: pathJoin(mockTestDataDir, 'a2a-agent-mappings.json'),
    getProjectA2ADir: (projectPath: string) => pathJoin(projectPath, '.a2a'),
    getProjectTasksDir: (projectPath: string) => pathJoin(projectPath, '.a2a', 'tasks'),
    getProjectA2AConfigFile: (projectPath: string) => pathJoin(projectPath, '.a2a', 'config.json'),
    getProjectApiKeysFile: (projectPath: string) => pathJoin(projectPath, '.a2a', 'api-keys.json'),
  };
});

// Import services after mocking
import * as agentMappingService from '../../services/a2a/agentMappingService';
import * as apiKeyService from '../../services/a2a/apiKeyService';

// Use temp directory for test isolation (match the mocked value)
const testDataDir = join(os.tmpdir(), 'a2a-integration-test');

describe('A2A Agent Discovery Workflow (Integration)', () => {
  let app: express.Express;
  const testProjectId = 'test-integration-project';
  const testWorkingDir = join(testDataDir, 'projects', testProjectId);
  const testAgentType = 'ppt-editor';
  let a2aAgentId: string;
  let apiKey: string;

  beforeAll(() => {
    // Create test data directory
    if (!existsSync(testDataDir)) {
      mkdirSync(testDataDir, { recursive: true });
    }
    
    // Create test working directory
    if (!existsSync(testWorkingDir)) {
      mkdirSync(testWorkingDir, { recursive: true });
    }

    // Initialize test data files
    const mappingsFile = join(testDataDir, 'a2a-agent-mappings.json');
    writeFileSync(mappingsFile, JSON.stringify({ version: '1.0.0', mappings: {} }, null, 2));

    // Set up environment for services
    process.env.A2A_DATA_DIR = testDataDir;

    // Create Express app with A2A routes
    app = express();
    app.use(express.json());

    // Import and mount A2A router with auth middleware
    // Note: We'll manually add auth context for testing
    const a2aRouter = express.Router({ mergeParams: true });

    // Simple auth middleware for testing
    a2aRouter.use(async (req: any, res, next) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          code: 'MISSING_API_KEY'
        });
      }

      const key = authHeader.substring(7);

      // Validate API key and get context
      try {
        const a2aId = req.params.a2aAgentId;
        const mapping = await agentMappingService.resolveA2AId(a2aId);

        if (!mapping) {
          return res.status(404).json({
            error: 'Agent not found',
            code: 'AGENT_NOT_FOUND'
          });
        }

        const isValid = await apiKeyService.validateApiKey(mapping.workingDirectory, key);

        if (!isValid.valid) {
          return res.status(401).json({
            error: 'Unauthorized',
            code: 'INVALID_API_KEY'
          });
        }

        // Add A2A context to request
        req.a2aContext = {
          a2aAgentId: mapping.a2aAgentId,
          projectId: mapping.projectId,
          agentType: mapping.agentType,
          workingDirectory: mapping.workingDirectory,
          apiKeyId: 'test-key-id'
        };

        next();
      } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    });

    // Agent Card endpoint
    a2aRouter.get('/.well-known/agent-card.json', (req: any, res) => {
      const { a2aContext } = req;

      if (!a2aContext) {
        return res.status(500).json({
          error: 'Authentication context missing',
          code: 'AUTH_CONTEXT_MISSING'
        });
      }

      res.json({
        name: `Agent ${a2aContext.agentType}`,
        description: `AgentStudio agent of type ${a2aContext.agentType}`,
        version: '1.0.0',
        url: `${req.protocol}://${req.get('host')}/a2a/${a2aContext.a2aAgentId}`,
        skills: [],
        securitySchemes: [
          {
            type: 'apiKey' as const,
            in: 'header' as const,
            name: 'Authorization' as const,
            scheme: 'bearer' as const,
          },
        ],
        context: {
          a2aAgentId: a2aContext.a2aAgentId,
          projectId: a2aContext.projectId,
          projectName: a2aContext.projectId,
          workingDirectory: a2aContext.workingDirectory,
          agentType: a2aContext.agentType,
          agentCategory: 'builtin' as const,
        },
      });
    });

    app.use('/a2a/:a2aAgentId', a2aRouter);
  });

  afterAll(() => {
    // Clean up test data directory
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Reset mappings file
    const mappingsFile = join(testDataDir, 'a2a-agent-mappings.json');
    writeFileSync(mappingsFile, JSON.stringify({ version: '1.0.0', mappings: {} }, null, 2));
    
    // Invalidate cache in services
    agentMappingService.invalidateCache();
  });

  // ============================================================================
  // T037: Complete Agent Discovery Workflow
  // ============================================================================
  describe('Complete Agent Discovery Workflow', () => {
    it('should complete full workflow: create A2A ID → generate API key → retrieve Agent Card', async () => {
      // Step 1: Create or get A2A ID for agent
      a2aAgentId = await agentMappingService.getOrCreateA2AId(
        testProjectId,
        testAgentType,
        testWorkingDir
      );

      expect(a2aAgentId).toBeDefined();
      expect(typeof a2aAgentId).toBe('string');
      expect(a2aAgentId.length).toBeGreaterThan(0);

      // Step 2: Verify mapping resolution
      const mapping = await agentMappingService.resolveA2AId(a2aAgentId);

      expect(mapping).toBeDefined();
      expect(mapping?.projectId).toBe(testProjectId);
      expect(mapping?.agentType).toBe(testAgentType);
      expect(mapping?.a2aAgentId).toBe(a2aAgentId);

      // Step 3: Generate API key for project (use workingDirectory as path)
      const keyData = await apiKeyService.generateApiKey(
        testWorkingDir,
        'Test integration key'
      );

      expect(keyData).toBeDefined();
      expect(keyData.key).toBeDefined();
      expect(keyData.keyData.id).toBeDefined();
      expect(keyData.key).toMatch(/^agt_proj_/);

      apiKey = keyData.key;

      // Step 4: Validate API key works
      const isValid = await apiKeyService.validateApiKey(testWorkingDir, apiKey);
      expect(isValid.valid).toBe(true);

      // Step 5: Retrieve Agent Card using A2A ID and API key
      const response = await request(app)
        .get(`/a2a/${a2aAgentId}/.well-known/agent-card.json`)
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      // Step 6: Verify Agent Card structure
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('skills');
      expect(response.body).toHaveProperty('securitySchemes');
      expect(response.body).toHaveProperty('context');

      // Step 7: Verify Agent Card context matches mapping
      expect(response.body.context.a2aAgentId).toBe(a2aAgentId);
      expect(response.body.context.projectId).toBe(testProjectId);
      expect(response.body.context.agentType).toBe(testAgentType);
      expect(response.body.context.workingDirectory).toBe(testWorkingDir);
    });

    it('should reject Agent Card request with invalid API key', async () => {
      // Create A2A ID
      a2aAgentId = await agentMappingService.getOrCreateA2AId(
        testProjectId,
        testAgentType,
        testWorkingDir
      );

      // Try to access with invalid API key
      const response = await request(app)
        .get(`/a2a/${a2aAgentId}/.well-known/agent-card.json`)
        .set('Authorization', 'Bearer invalid-key-12345')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('INVALID_API_KEY');
    });

    it('should reject Agent Card request without API key', async () => {
      // Create A2A ID
      a2aAgentId = await agentMappingService.getOrCreateA2AId(
        testProjectId,
        testAgentType,
        testWorkingDir
      );

      // Try to access without API key
      const response = await request(app)
        .get(`/a2a/${a2aAgentId}/.well-known/agent-card.json`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('MISSING_API_KEY');
    });

    it('should return 404 for non-existent A2A agent ID', async () => {
      // Generate valid API key
      const keyData = await apiKeyService.generateApiKey(
        testProjectId,
        'Test key'
      );

      // Try to access non-existent agent
      const response = await request(app)
        .get('/a2a/non-existent-agent-id/.well-known/agent-card.json')
        .set('Authorization', `Bearer ${keyData.key}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('AGENT_NOT_FOUND');
    });

    it('should reuse same A2A ID for same project and agent type', async () => {
      // Create A2A ID first time
      const firstId = await agentMappingService.getOrCreateA2AId(
        testProjectId,
        testAgentType,
        testWorkingDir
      );

      // Create A2A ID second time (should return same ID)
      const secondId = await agentMappingService.getOrCreateA2AId(
        testProjectId,
        testAgentType,
        testWorkingDir
      );

      expect(firstId).toBe(secondId);

      // Verify only one mapping exists
      const allMappings = await agentMappingService.listAgentMappings();
      const projectMappings = allMappings.filter(
        (m) => m.projectId === testProjectId && m.agentType === testAgentType
      );

      expect(projectMappings.length).toBe(1);
    });

    it('should create different A2A IDs for different agent types in same project', async () => {
      // Create A2A ID for first agent type
      const pptEditorId = await agentMappingService.getOrCreateA2AId(
        testProjectId,
        'ppt-editor',
        testWorkingDir
      );

      // Create A2A ID for second agent type
      const codeAssistantId = await agentMappingService.getOrCreateA2AId(
        testProjectId,
        'code-assistant',
        testWorkingDir
      );

      expect(pptEditorId).not.toBe(codeAssistantId);

      // Verify both mappings exist
      const allMappings = await agentMappingService.listAgentMappings();
      expect(allMappings.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow multiple API keys for same project', async () => {
      // Create A2A ID
      a2aAgentId = await agentMappingService.getOrCreateA2AId(
        testProjectId,
        testAgentType,
        testWorkingDir
      );

      // Generate first API key
      const key1 = await apiKeyService.generateApiKey(testWorkingDir, 'Key 1');

      // Generate second API key
      const key2 = await apiKeyService.generateApiKey(testWorkingDir, 'Key 2');

      expect(key1.key).not.toBe(key2.key);

      // Both keys should work
      const response1 = await request(app)
        .get(`/a2a/${a2aAgentId}/.well-known/agent-card.json`)
        .set('Authorization', `Bearer ${key1.key}`)
        .expect(200);

      const response2 = await request(app)
        .get(`/a2a/${a2aAgentId}/.well-known/agent-card.json`)
        .set('Authorization', `Bearer ${key2.key}`)
        .expect(200);

      expect(response1.body.context.projectId).toBe(testProjectId);
      expect(response2.body.context.projectId).toBe(testProjectId);
    });
  });
});
