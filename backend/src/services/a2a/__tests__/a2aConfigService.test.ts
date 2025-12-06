/**
 * Unit tests for a2aConfigService.ts
 * Tests for Phase 7 (US5): Project-Level A2A Configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateA2AConfig, loadA2AConfig } from '../a2aConfigService.js';
import type { A2AConfig } from '../../../types/a2a.js';
import { DEFAULT_A2A_CONFIG } from '../../../types/a2a.js';
import path from 'path';
import fs from 'fs/promises';

// Mock fs and path
vi.mock('fs/promises');

describe('a2aConfigService - Configuration Validation', () => {
  describe('validateA2AConfig()', () => {
    it('should validate default config successfully', () => {
      const validation = validateA2AConfig(DEFAULT_A2A_CONFIG);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should validate config with valid allowed agents', () => {
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'External Agent 1',
            url: 'https://external-agent.example.com',
            apiKey: 'agt_proj_external_123456789abcdef',
            description: 'Test external agent',
            enabled: true,
          },
        ],
        taskTimeout: 60000,
        maxConcurrentTasks: 10,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should validate config with multiple allowed agents', () => {
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'Agent A',
            url: 'https://agent-a.example.com',
            apiKey: 'key_a',
            enabled: true,
          },
          {
            name: 'Agent B',
            url: 'https://agent-b.example.com',
            apiKey: 'key_b',
            enabled: false,
          },
          {
            name: 'Agent C',
            url: 'https://agent-c.example.com',
            apiKey: 'key_c',
            description: 'Third agent',
            enabled: true,
          },
        ],
        taskTimeout: 120000,
        maxConcurrentTasks: 20,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    // ========== Invalid Configuration Tests ==========

    it('should reject config with missing allowedAgents', () => {
      const config = {
        taskTimeout: 60000,
        maxConcurrentTasks: 10,
      } as any;

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors).toContain('allowedAgents must be an array');
    });

    it('should reject config with non-array allowedAgents', () => {
      const config = {
        allowedAgents: 'not-an-array',
        taskTimeout: 60000,
        maxConcurrentTasks: 10,
      } as any;

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors).toContain('allowedAgents must be an array');
    });

    it('should reject config with agent missing name', () => {
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: '',
            url: 'https://agent.example.com',
            apiKey: 'key',
            enabled: true,
          },
        ],
        taskTimeout: 60000,
        maxConcurrentTasks: 10,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.some((err) => err.includes('name'))).toBe(true);
    });

    it('should reject config with agent missing URL', () => {
      const config = {
        allowedAgents: [
          {
            name: 'Agent',
            apiKey: 'key',
            enabled: true,
          },
        ],
        taskTimeout: 60000,
        maxConcurrentTasks: 10,
      } as any;

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.some((err) => err.includes('url'))).toBe(true);
    });

    it('should reject config with invalid URL format', () => {
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'Agent',
            url: 'not-a-valid-url',
            apiKey: 'key',
            enabled: true,
          },
        ],
        taskTimeout: 60000,
        maxConcurrentTasks: 10,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.some((err) => err.includes('not a valid URL'))).toBe(true);
    });

    it('should require HTTPS in production environment', () => {
      // Save original NODE_ENV
      const originalEnv = process.env.NODE_ENV;

      try {
        // Set to production
        process.env.NODE_ENV = 'production';

        const config: A2AConfig = {
          allowedAgents: [
            {
              name: 'Agent',
              url: 'http://insecure-agent.example.com',
              apiKey: 'key',
              enabled: true,
            },
          ],
          taskTimeout: 60000,
          maxConcurrentTasks: 10,
        };

        const validation = validateA2AConfig(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toBeDefined();
        expect(validation.errors?.some((err) => err.includes('HTTPS'))).toBe(true);
      } finally {
        // Restore NODE_ENV
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should allow HTTP in non-production environment', () => {
      // Save original NODE_ENV
      const originalEnv = process.env.NODE_ENV;

      try {
        // Set to development
        process.env.NODE_ENV = 'development';

        const config: A2AConfig = {
          allowedAgents: [
            {
              name: 'Agent',
              url: 'http://localhost:4936',
              apiKey: 'key',
              enabled: true,
            },
          ],
          taskTimeout: 60000,
          maxConcurrentTasks: 10,
        };

        const validation = validateA2AConfig(config);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toBeUndefined();
      } finally {
        // Restore NODE_ENV
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should reject config with agent missing apiKey', () => {
      const config = {
        allowedAgents: [
          {
            name: 'Agent',
            url: 'https://agent.example.com',
            enabled: true,
          },
        ],
        taskTimeout: 60000,
        maxConcurrentTasks: 10,
      } as any;

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.some((err) => err.includes('apiKey'))).toBe(true);
    });

    it('should reject config with agent missing enabled flag', () => {
      const config = {
        allowedAgents: [
          {
            name: 'Agent',
            url: 'https://agent.example.com',
            apiKey: 'key',
          },
        ],
        taskTimeout: 60000,
        maxConcurrentTasks: 10,
      } as any;

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.some((err) => err.includes('enabled'))).toBe(true);
    });

    it('should reject config with invalid taskTimeout type', () => {
      const config = {
        allowedAgents: [],
        taskTimeout: 'not-a-number',
        maxConcurrentTasks: 10,
      } as any;

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.some((err) => err.includes('taskTimeout'))).toBe(true);
    });

    it('should reject config with taskTimeout below minimum (1000ms)', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 500,
        maxConcurrentTasks: 10,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(
        validation.errors?.some((err) => err.includes('taskTimeout') && err.includes('1000'))
      ).toBe(true);
    });

    it('should reject config with taskTimeout above maximum (1800000ms)', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 2000000,
        maxConcurrentTasks: 10,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(
        validation.errors?.some((err) => err.includes('taskTimeout') && err.includes('1800000'))
      ).toBe(true);
    });

    it('should reject config with invalid maxConcurrentTasks type', () => {
      const config = {
        allowedAgents: [],
        taskTimeout: 60000,
        maxConcurrentTasks: 'not-a-number',
      } as any;

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.some((err) => err.includes('maxConcurrentTasks'))).toBe(true);
    });

    it('should reject config with maxConcurrentTasks below minimum (1)', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 60000,
        maxConcurrentTasks: 0,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(
        validation.errors?.some((err) => err.includes('maxConcurrentTasks') && err.includes('1'))
      ).toBe(true);
    });

    it('should reject config with maxConcurrentTasks above maximum (50)', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 60000,
        maxConcurrentTasks: 100,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(
        validation.errors?.some((err) => err.includes('maxConcurrentTasks') && err.includes('50'))
      ).toBe(true);
    });

    it('should collect multiple validation errors', () => {
      const config = {
        allowedAgents: [
          {
            name: '',
            url: 'invalid-url',
            enabled: true,
            // missing apiKey
          },
        ],
        taskTimeout: 'invalid',
        maxConcurrentTasks: 0,
      } as any;

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors!.length).toBeGreaterThan(3);
    });

    // ========== Edge Cases ==========

    it('should validate config with empty allowedAgents array', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 60000,
        maxConcurrentTasks: 5,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should validate config with minimum valid taskTimeout (1000ms)', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 1000,
        maxConcurrentTasks: 5,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should validate config with maximum valid taskTimeout (1800000ms)', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 1800000,
        maxConcurrentTasks: 5,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should validate config with minimum valid maxConcurrentTasks (1)', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 60000,
        maxConcurrentTasks: 1,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should validate config with maximum valid maxConcurrentTasks (50)', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 60000,
        maxConcurrentTasks: 50,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should validate config with optional apiKeyRotationDays', () => {
      const config: A2AConfig = {
        allowedAgents: [],
        taskTimeout: 60000,
        maxConcurrentTasks: 5,
        apiKeyRotationDays: 90,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should validate config with agent having optional description', () => {
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'Agent',
            url: 'https://agent.example.com',
            apiKey: 'key',
            description: 'This is an optional description field',
            enabled: true,
          },
        ],
        taskTimeout: 60000,
        maxConcurrentTasks: 5,
      };

      const validation = validateA2AConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });
  });
});
