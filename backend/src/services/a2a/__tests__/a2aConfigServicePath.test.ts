
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadA2AConfig } from '../a2aConfigService.js';
import fs from 'fs/promises';
import path from 'path';

// Mock fs
vi.mock('fs/promises');

describe('a2aConfigService - Path Resolution', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle absolute paths correctly', async () => {
        const absolutePath = '/absolute/path/to/project';
        const expectedConfigPath = path.join(absolutePath, '.a2a', 'config.json');

        // Mock fs.readFile to return valid config
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
            allowedAgents: [],
            taskTimeout: 30000,
            maxConcurrentTasks: 5
        }));

        await loadA2AConfig(absolutePath);

        expect(fs.readFile).toHaveBeenCalledWith(expectedConfigPath, 'utf-8');
    });

    it('should handle relative paths correctly (fallback to .claude/projects)', async () => {
        const relativePath = 'my-project';
        // This depends on the implementation detail of where .claude/projects is
        // We can just verify it doesn't treat it as absolute

        // Mock fs.readFile to return valid config
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
            allowedAgents: [],
            taskTimeout: 30000,
            maxConcurrentTasks: 5
        }));

        await loadA2AConfig(relativePath);

        // Verify it didn't try to read from /my-project/.a2a/config.json
        // It should be something like /Users/.../.claude/projects/my-project/.a2a/config.json
        const calledPath = vi.mocked(fs.readFile).mock.calls[0][0] as string;
        expect(calledPath).toContain('.claude/projects');
        expect(calledPath).toContain(relativePath);
    });
});
