import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as a2aSdkMcp from '../a2aSdkMcp.js';
import * as a2aIntegration from '../a2aIntegration.js';

describe('integrateA2AMcpServer', () => {
    const mockProjectId = 'test-project-id';
    const mockServer = { name: 'mock-server' };

    // Spy on the createA2ASdkMcpServer function
    let createServerSpy: any;

    beforeEach(() => {
        createServerSpy = vi.spyOn(a2aSdkMcp, 'createA2ASdkMcpServer');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should integrate A2A MCP server into query options', async () => {
        // Setup mock
        createServerSpy.mockResolvedValue({
            server: mockServer,
            tool: {}
        });

        const queryOptions: any = {
            mcpServers: {},
            allowedTools: []
        };

        await a2aIntegration.integrateA2AMcpServer(queryOptions, mockProjectId);

        // Verify server was added
        expect(queryOptions.mcpServers['a2a-client']).toEqual(mockServer);

        // Verify tool was added
        const toolName = a2aSdkMcp.getA2AToolName();
        expect(queryOptions.allowedTools).toContain(toolName);
    });

    it('should initialize allowedTools if undefined', async () => {
        // Setup mock
        createServerSpy.mockResolvedValue({
            server: mockServer,
            tool: {}
        });

        const queryOptions: any = {
            mcpServers: {}
            // allowedTools is undefined
        };

        await a2aIntegration.integrateA2AMcpServer(queryOptions, mockProjectId);

        const toolName = a2aSdkMcp.getA2AToolName();
        expect(queryOptions.allowedTools).toEqual([toolName]);
    });

    it('should not duplicate tool if already present', async () => {
        // Setup mock
        createServerSpy.mockResolvedValue({
            server: mockServer,
            tool: {}
        });

        const toolName = a2aSdkMcp.getA2AToolName();
        const queryOptions: any = {
            mcpServers: {},
            allowedTools: ['other-tool', toolName]
        };

        await a2aIntegration.integrateA2AMcpServer(queryOptions, mockProjectId);

        expect(queryOptions.allowedTools).toHaveLength(2);
        expect(queryOptions.allowedTools).toContain(toolName);
        // Should still be there exactly once
        expect(queryOptions.allowedTools.filter((t: string) => t === toolName)).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
        // Setup mock to throw
        createServerSpy.mockRejectedValue(new Error('Failed to create server'));

        const queryOptions: any = {
            mcpServers: {},
            allowedTools: []
        };

        // Should not throw
        await a2aIntegration.integrateA2AMcpServer(queryOptions, mockProjectId);

        // Should not have modified options
        expect(queryOptions.mcpServers['a2a-client']).toBeUndefined();
        expect(queryOptions.allowedTools).toHaveLength(0);
    });
});
