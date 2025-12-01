import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as a2aSdkMcp from '../a2aSdkMcp.js';
import * as a2aIntegration from '../a2aIntegration.js';
import { buildQueryOptions } from '../../../utils/claudeUtils.js';

// Mock createA2ASdkMcpServer
vi.mock('../a2aSdkMcp.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../a2aSdkMcp.js')>();
    return {
        ...actual,
        createA2ASdkMcpServer: vi.fn(),
    };
});

// Mock a2aIntegration to verify it's called
vi.mock('../a2aIntegration.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../a2aIntegration.js')>();
    return {
        ...actual,
        integrateA2AMcpServer: vi.fn(),
    };
});

describe('buildQueryOptions with A2A Integration', () => {
    const mockAgent = {
        workingDirectory: '/test/dir',
        allowedTools: [],
        permissionMode: 'default',
        model: 'sonnet'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call integrateA2AMcpServer', async () => {
        await buildQueryOptions(mockAgent, '/test/project');

        expect(a2aIntegration.integrateA2AMcpServer).toHaveBeenCalled();
    });
});
