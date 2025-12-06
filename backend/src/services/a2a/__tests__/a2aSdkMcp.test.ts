/**
 * Unit tests for A2A SDK MCP Server
 *
 * Tests the SDK MCP server implementation including:
 * - Server creation
 * - Dynamic description generation
 * - Tool definition structure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createA2ASdkMcpServer, getA2AToolName } from '../a2aSdkMcp.js';
import * as a2aConfigService from '../a2aConfigService.js';
import type { A2AConfig } from '../../../types/a2a.js';
import * as a2aClientTool from '../a2aClientTool.js';

// Mock dependencies
vi.mock('../a2aConfigService.js');
vi.mock('../a2aClientTool.js');

describe('A2A SDK MCP Server', () => {
    const testProjectId = 'test-project-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getA2AToolName', () => {
        it('should return correct tool name format', () => {
            const toolName = getA2AToolName();
            expect(toolName).toBe('mcp__a2a-client__call_external_agent');
        });
    });

    describe('createA2ASdkMcpServer', () => {
        it('should create SDK MCP server with correct structure', async () => {
            const mockConfig: A2AConfig = {
                allowedAgents: [],
                taskTimeout: 300000,
                maxConcurrentTasks: 5,
            };

            vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue(mockConfig);

            const { server, tool } = await createA2ASdkMcpServer(testProjectId);

            expect(server).toBeDefined();
            expect(tool).toBeDefined();
            expect(tool.name).toBe('call_external_agent');
        });



        it('should generate description with no agents configured', async () => {
            const mockConfig: A2AConfig = {
                allowedAgents: [],
                taskTimeout: 300000,
                maxConcurrentTasks: 5,
            };

            vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue(mockConfig);

            const { tool } = await createA2ASdkMcpServer(testProjectId);

            expect(tool.description).toContain('Call an external A2A-compatible agent');
            expect(tool.description).toContain('No external agents are currently configured');
        });

        it('should generate description with enabled agents', async () => {
            const mockConfig: A2AConfig = {
                allowedAgents: [
                    {
                        name: 'Analytics Agent',
                        url: 'https://analytics.example.com/a2a/agent-1',
                        apiKey: 'test-key-1',
                        description: 'Analyzes data and generates reports',
                        enabled: true,
                    },
                    {
                        name: 'Translation Agent',
                        url: 'https://translate.example.com/a2a/agent-2',
                        apiKey: 'test-key-2',
                        description: 'Translates text between languages',
                        enabled: true,
                    },
                ],
                taskTimeout: 300000,
                maxConcurrentTasks: 5,
            };

            vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue(mockConfig);

            const { tool } = await createA2ASdkMcpServer(testProjectId);

            expect(tool.description).toContain('Analytics Agent');
            expect(tool.description).toContain('Analyzes data and generates reports');
            expect(tool.description).toContain('https://analytics.example.com/a2a/agent-1');
            expect(tool.description).toContain('Translation Agent');
            expect(tool.description).toContain('Translates text between languages');
        });

        it('should only include enabled agents in description', async () => {
            const mockConfig: A2AConfig = {
                allowedAgents: [
                    {
                        name: 'Enabled Agent',
                        url: 'https://enabled.example.com/a2a/agent-1',
                        apiKey: 'test-key-1',
                        enabled: true,
                    },
                    {
                        name: 'Disabled Agent',
                        url: 'https://disabled.example.com/a2a/agent-2',
                        apiKey: 'test-key-2',
                        enabled: false,
                    },
                ],
                taskTimeout: 300000,
                maxConcurrentTasks: 5,
            };

            vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue(mockConfig);

            const { tool } = await createA2ASdkMcpServer(testProjectId);

            expect(tool.description).toContain('Enabled Agent');
            expect(tool.description).not.toContain('Disabled Agent');
        });

        it('should handle null config gracefully', async () => {
            vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue(null);

            const { tool } = await createA2ASdkMcpServer(testProjectId);

            expect(tool.description).toContain('No A2A configuration found');
        });

        it('should include agent descriptions when available', async () => {
            const mockConfig: A2AConfig = {
                allowedAgents: [
                    {
                        name: 'Agent With Description',
                        url: 'https://example.com/a2a/agent-1',
                        apiKey: 'test-key',
                        description: 'This is a detailed description',
                        enabled: true,
                    },
                    {
                        name: 'Agent Without Description',
                        url: 'https://example.com/a2a/agent-2',
                        apiKey: 'test-key-2',
                        enabled: true,
                    },
                ],
                taskTimeout: 300000,
                maxConcurrentTasks: 5,
            };

            vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue(mockConfig);

            const { tool } = await createA2ASdkMcpServer(testProjectId);

            expect(tool.description).toContain('This is a detailed description');
            expect(tool.description).toContain('Agent Without Description');
        });
    });

    describe('Tool execution', () => {
        beforeEach(() => {
            const mockConfig: A2AConfig = {
                allowedAgents: [
                    {
                        name: 'Test Agent',
                        url: 'https://test.example.com/a2a/agent-1',
                        apiKey: 'test-key',
                        enabled: true,
                    },
                ],
                taskTimeout: 300000,
                maxConcurrentTasks: 5,
            };

            vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue(mockConfig);
        });

        it('should pass provided sessionId to external agent', async () => {
            const mockResult = {
                success: true,
                data: 'Response',
            };

            vi.mocked(a2aClientTool.callExternalAgent).mockResolvedValue(mockResult);

            const { tool } = await createA2ASdkMcpServer(testProjectId);

            await tool.handler({
                agentUrl: 'https://test.example.com/a2a/agent-1',
                message: 'Test message',
                sessionId: 'provided-session-123',
                useTask: false,
            }, {});

            expect(a2aClientTool.callExternalAgent).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionId: 'provided-session-123',
                }),
                testProjectId
            );
        });

        it('should return sessionId in response as separate text block', async () => {
            const mockResult = {
                success: true,
                data: 'Response',
                sessionId: 'returned-session-456',
            };

            vi.mocked(a2aClientTool.callExternalAgent).mockResolvedValue(mockResult);

            const { tool } = await createA2ASdkMcpServer(testProjectId);

            const result = await tool.handler({
                agentUrl: 'https://test.example.com/a2a/agent-1',
                message: 'Test message',
                useTask: false,
            }, {});

            expect(result.content).toHaveLength(2);
            expect(result.content[0].text).toBe('Response');
            expect(result.content[1].text).toContain('Session ID: returned-session-456');
            expect(result.content[1].text).toContain('To continue this conversation');
        });

        it('should not include session info block if no sessionId returned', async () => {
            const mockResult = {
                success: true,
                data: 'Response',
                // No sessionId
            };

            vi.mocked(a2aClientTool.callExternalAgent).mockResolvedValue(mockResult);

            const { tool } = await createA2ASdkMcpServer(testProjectId);

            const result = await tool.handler({
                agentUrl: 'https://test.example.com/a2a/agent-1',
                message: 'Test message',
                useTask: false,
            }, {});

            expect(result.content).toHaveLength(1);
            expect(result.content[0].text).toBe('Response');
        });
    });
});
