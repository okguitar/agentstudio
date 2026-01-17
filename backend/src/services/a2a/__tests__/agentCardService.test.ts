/**
 * Unit tests for agentCardService.ts
 * Tests for Phase 4 (US2): Agent Card Auto-Generation
 */

import { describe, it, expect } from 'vitest';
import { generateAgentCard, type ProjectContext } from '../agentCardService.js';
import type { AgentConfig } from '../../../types/agents.js';

describe('agentCardService - Agent Card Generation', () => {
  // Helper to create test agent config
  const createTestAgentConfig = (overrides?: Partial<AgentConfig>): AgentConfig => ({
    id: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent for unit testing',
    version: '1.0.0',
    systemPrompt: 'You are a test agent',
    maxTurns: 25,
    permissionMode: 'acceptEdits' as const,
    // Note: model field removed - model is now determined by project/provider configuration
    allowedTools: [
      { name: 'read_file', enabled: true },
      { name: 'write_file', enabled: true },
      { name: 'execute_command', enabled: false },
    ],
    ui: {
      icon: '🤖',
      headerTitle: 'Test Agent',
      headerDescription: 'Testing agent',
    },
    author: 'Test Author',
    tags: ['test'],
    createdAt: '2025-11-21T10:00:00.000Z',
    updatedAt: '2025-11-21T10:00:00.000Z',
    enabled: true,
    source: 'local' as const,
    ...overrides,
  });

  // Helper to create test project context
  const createTestProjectContext = (overrides?: Partial<ProjectContext>): ProjectContext => ({
    projectId: 'proj-123',
    projectName: 'Test Project',
    workingDirectory: '/test/project',
    a2aAgentId: 'a2a-test-uuid',
    baseUrl: 'https://agentstudio.cc',
    ...overrides,
  });

  describe('generateAgentCard()', () => {
    it('should generate valid Agent Card with all required A2A protocol fields', () => {
      const agentConfig = createTestAgentConfig();
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      // Check A2A protocol required fields
      expect(agentCard.name).toBe('Test Agent');
      expect(agentCard.description).toBe('A test agent for unit testing');
      expect(agentCard.version).toBe('1.0.0');
      expect(agentCard.url).toBe('https://agentstudio.cc/a2a/a2a-test-uuid');
      expect(Array.isArray(agentCard.skills)).toBe(true);
      expect(Array.isArray(agentCard.securitySchemes)).toBe(true);
    });

    it('should extract skills from enabled tools only', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [
          { name: 'read_file', enabled: true },
          { name: 'write_file', enabled: true },
          { name: 'execute_command', enabled: false },
          { name: 'grep', enabled: true },
        ],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      // Should have 3 skills (read_file, write_file, grep - NOT execute_command)
      expect(agentCard.skills).toHaveLength(3);
      expect(agentCard.skills.map((s) => s.name)).toContain('read_file');
      expect(agentCard.skills.map((s) => s.name)).toContain('write_file');
      expect(agentCard.skills.map((s) => s.name)).toContain('grep');
      expect(agentCard.skills.map((s) => s.name)).not.toContain('execute_command');
    });

    it('should include correct skill schemas for known tools', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [{ name: 'read_file', enabled: true }],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      const readFileSkill = agentCard.skills.find((s) => s.name === 'read_file');
      expect(readFileSkill).toBeDefined();
      expect(readFileSkill?.description).toBe('Read content from a file');
      expect(readFileSkill?.inputSchema.type).toBe('object');
      expect(readFileSkill?.inputSchema.properties?.path).toBeDefined();
      expect(readFileSkill?.inputSchema.required).toContain('path');
      expect(readFileSkill?.outputSchema.properties?.content).toBeDefined();
    });

    it('should generate generic schema for unknown tools', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [{ name: 'custom_unknown_tool', enabled: true }],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      const customSkill = agentCard.skills.find((s) => s.name === 'custom_unknown_tool');
      expect(customSkill).toBeDefined();
      expect(customSkill?.description).toBe('Execute custom_unknown_tool tool');
      expect(customSkill?.inputSchema.type).toBe('object');
      expect(customSkill?.outputSchema.properties?.result).toBeDefined();
    });

    it('should include API key security scheme', () => {
      const agentConfig = createTestAgentConfig();
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.securitySchemes).toHaveLength(1);
      expect(agentCard.securitySchemes[0]).toEqual({
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        scheme: 'bearer',
      });
    });

    it('should include project context in Agent Card', () => {
      const agentConfig = createTestAgentConfig();
      const projectContext = createTestProjectContext({
        projectId: 'proj-456',
        projectName: 'My Project',
        workingDirectory: '/home/user/my-project',
        a2aAgentId: 'uuid-789',
      });

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.context.a2aAgentId).toBe('uuid-789');
      expect(agentCard.context.projectId).toBe('proj-456');
      expect(agentCard.context.projectName).toBe('My Project');
      expect(agentCard.context.workingDirectory).toBe('/home/user/my-project');
      expect(agentCard.context.agentType).toBe('test-agent');
    });

    it('should set agentCategory to builtin for local agents', () => {
      const agentConfig = createTestAgentConfig({
        source: 'local',
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.context.agentCategory).toBe('builtin');
    });

    it('should set agentCategory to subagent for plugin agents', () => {
      const agentConfig = createTestAgentConfig({
        source: 'plugin',
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.context.agentCategory).toBe('subagent');
    });

    it('should handle agent with no enabled tools', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.skills).toHaveLength(0);
      expect(agentCard.skills).toEqual([]);
    });

    it('should handle agent with all tools disabled', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [
          { name: 'read_file', enabled: false },
          { name: 'write_file', enabled: false },
        ],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.skills).toHaveLength(0);
    });

    it('should generate deterministic output for same input', () => {
      const agentConfig = createTestAgentConfig();
      const projectContext = createTestProjectContext();

      const agentCard1 = generateAgentCard(agentConfig, projectContext);
      const agentCard2 = generateAgentCard(agentConfig, projectContext);

      expect(agentCard1).toEqual(agentCard2);
    });

    it('should include all predefined tool schemas', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [
          { name: 'read_file', enabled: true },
          { name: 'write_file', enabled: true },
          { name: 'edit_file', enabled: true },
          { name: 'execute_command', enabled: true },
          { name: 'grep', enabled: true },
          { name: 'glob', enabled: true },
        ],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.skills).toHaveLength(6);
      expect(agentCard.skills.map((s) => s.name)).toContain('read_file');
      expect(agentCard.skills.map((s) => s.name)).toContain('write_file');
      expect(agentCard.skills.map((s) => s.name)).toContain('edit_file');
      expect(agentCard.skills.map((s) => s.name)).toContain('execute_command');
      expect(agentCard.skills.map((s) => s.name)).toContain('grep');
      expect(agentCard.skills.map((s) => s.name)).toContain('glob');
    });

    it('should construct correct URL from baseUrl and a2aAgentId', () => {
      const agentConfig = createTestAgentConfig();
      const projectContext = createTestProjectContext({
        baseUrl: 'http://localhost:4936',
        a2aAgentId: 'test-uuid-123',
      });

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.url).toBe('http://localhost:4936/a2a/test-uuid-123');
    });

    it('should be a pure function with no side effects', () => {
      const agentConfig = createTestAgentConfig();
      const projectContext = createTestProjectContext();

      const originalConfig = JSON.stringify(agentConfig);
      const originalContext = JSON.stringify(projectContext);

      generateAgentCard(agentConfig, projectContext);

      // Verify inputs are unchanged
      expect(JSON.stringify(agentConfig)).toBe(originalConfig);
      expect(JSON.stringify(projectContext)).toBe(originalContext);
    });

    it('should handle special characters in agent name and description', () => {
      const agentConfig = createTestAgentConfig({
        name: 'Test Agent with "quotes" & <special> chars',
        description: 'Description with \n newlines and \t tabs',
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.name).toBe('Test Agent with "quotes" & <special> chars');
      expect(agentCard.description).toBe('Description with \n newlines and \t tabs');
    });

    it('should use agentConfig.id as agentType in context', () => {
      const agentConfig = createTestAgentConfig({
        id: 'ppt-editor-v2',
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      expect(agentCard.context.agentType).toBe('ppt-editor-v2');
    });
  });

  describe('Tool schema mappings', () => {
    it('should have correct schema for write_file tool', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [{ name: 'write_file', enabled: true }],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      const writeFileSkill = agentCard.skills[0];
      expect(writeFileSkill.name).toBe('write_file');
      expect(writeFileSkill.description).toBe('Write content to a file');
      expect(writeFileSkill.inputSchema.required).toEqual(['path', 'content']);
    });

    it('should have correct schema for edit_file tool', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [{ name: 'edit_file', enabled: true }],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      const editFileSkill = agentCard.skills[0];
      expect(editFileSkill.name).toBe('edit_file');
      expect(editFileSkill.description).toBe('Edit file content with search and replace');
      expect(editFileSkill.inputSchema.required).toEqual(['path', 'old_string', 'new_string']);
    });

    it('should have correct schema for execute_command tool', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [{ name: 'execute_command', enabled: true }],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      const execSkill = agentCard.skills[0];
      expect(execSkill.name).toBe('execute_command');
      expect(execSkill.description).toBe('Execute shell command');
      expect(execSkill.inputSchema.required).toEqual(['command']);
      expect(execSkill.outputSchema.properties?.exitCode).toBeDefined();
    });

    it('should have correct schema for grep tool', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [{ name: 'grep', enabled: true }],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      const grepSkill = agentCard.skills[0];
      expect(grepSkill.name).toBe('grep');
      expect(grepSkill.description).toBe('Search for patterns in files');
      expect(grepSkill.inputSchema.required).toContain('pattern');
    });

    it('should have correct schema for glob tool', () => {
      const agentConfig = createTestAgentConfig({
        allowedTools: [{ name: 'glob', enabled: true }],
      });
      const projectContext = createTestProjectContext();

      const agentCard = generateAgentCard(agentConfig, projectContext);

      const globSkill = agentCard.skills[0];
      expect(globSkill.name).toBe('glob');
      expect(globSkill.description).toBe('Find files matching glob pattern');
      expect(globSkill.inputSchema.required).toContain('pattern');
    });
  });
});
