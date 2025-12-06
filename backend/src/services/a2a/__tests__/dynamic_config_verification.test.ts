
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createA2ASdkMcpServer } from '../a2aSdkMcp.js';
import { saveA2AConfig } from '../a2aConfigService.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('A2A Dynamic Config Loading Verification', () => {
    let tempDir: string;

    beforeEach(async () => {
        // Create a temporary directory for the "project"
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'a2a-dynamic-test-'));
    });

    afterEach(async () => {
        // Cleanup
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should update tool description when config changes', async () => {
        // 1. Create initial config
        const initialConfig = {
            allowedAgents: [
                {
                    name: 'Agent A',
                    url: 'https://agent-a.com',
                    apiKey: 'key-a',
                    enabled: true
                }
            ],
            taskTimeout: 30000,
            maxConcurrentTasks: 5
        };

        await saveA2AConfig(tempDir, initialConfig);

        // 2. Create server and check description
        const { tool: tool1 } = await createA2ASdkMcpServer(tempDir);
        expect(tool1.description).toContain('Agent A');
        expect(tool1.description).not.toContain('Agent B');

        // 3. Update config (simulate user changing config.json)
        const updatedConfig = {
            allowedAgents: [
                {
                    name: 'Agent A',
                    url: 'https://agent-a.com',
                    apiKey: 'key-a',
                    enabled: true
                },
                {
                    name: 'Agent B',
                    url: 'https://agent-b.com',
                    apiKey: 'key-b',
                    enabled: true
                }
            ],
            taskTimeout: 30000,
            maxConcurrentTasks: 5
        };

        await saveA2AConfig(tempDir, updatedConfig);

        // 4. Create server again (simulate new request) and check description
        const { tool: tool2 } = await createA2ASdkMcpServer(tempDir);
        expect(tool2.description).toContain('Agent A');
        expect(tool2.description).toContain('Agent B');
    });
});
