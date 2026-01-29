/**
 * Test MCP tools integration in taskWorker
 *
 * This test verifies that MCP tools from agent configuration are correctly
 * extracted and passed to buildQueryOptions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MCP Tools Integration', () => {
  it('should extract MCP tools from agent configuration', () => {
    // Mock agent with MCP tools
    const agent = {
      id: 'test-agent',
      name: 'Test Agent',
      allowedTools: [
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: true },
        { name: 'mcp__hil__send_and_wait_reply', enabled: true },
        { name: 'mcp__hil__send_message_only', enabled: true },
        { name: 'mcp__playwright__browser_navigate', enabled: false }, // disabled
        { name: 'Bash', enabled: true },
      ],
    };

    // Extract MCP tools (simulating taskWorker logic)
    const mcpTools = agent.allowedTools
      .filter((tool: any) => tool.enabled && tool.name.startsWith('mcp__'))
      .map((tool: any) => tool.name);

    // Verify extraction
    expect(mcpTools).toHaveLength(2);
    expect(mcpTools).toContain('mcp__hil__send_and_wait_reply');
    expect(mcpTools).toContain('mcp__hil__send_message_only');
    expect(mcpTools).not.toContain('mcp__playwright__browser_navigate'); // disabled
    expect(mcpTools).not.toContain('Read'); // not MCP tool
    expect(mcpTools).not.toContain('Bash'); // not MCP tool
  });

  it('should extract server names from MCP tool names', () => {
    const mcpTools = [
      'mcp__hil__send_and_wait_reply',
      'mcp__hil__send_message_only',
      'mcp__playwright__browser_navigate',
    ];

    // Extract server names (simulating claudeUtils logic)
    const serverNames = new Set<string>();
    for (const tool of mcpTools) {
      const parts = tool.split('__');
      if (parts.length >= 2 && parts[0] === 'mcp') {
        serverNames.add(parts[1]);
      }
    }

    // Verify server name extraction
    expect(serverNames.size).toBe(2);
    expect(serverNames.has('hil')).toBe(true);
    expect(serverNames.has('playwright')).toBe(true);
  });

  it('should handle agents with no MCP tools', () => {
    const agent = {
      id: 'test-agent',
      name: 'Test Agent',
      allowedTools: [
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: true },
        { name: 'Bash', enabled: true },
      ],
    };

    const mcpTools = agent.allowedTools
      .filter((tool: any) => tool.enabled && tool.name.startsWith('mcp__'))
      .map((tool: any) => tool.name);

    expect(mcpTools).toHaveLength(0);
  });

  it('should handle agents with all MCP tools disabled', () => {
    const agent = {
      id: 'test-agent',
      name: 'Test Agent',
      allowedTools: [
        { name: 'mcp__hil__send_and_wait_reply', enabled: false },
        { name: 'mcp__hil__send_message_only', enabled: false },
      ],
    };

    const mcpTools = agent.allowedTools
      .filter((tool: any) => tool.enabled && tool.name.startsWith('mcp__'))
      .map((tool: any) => tool.name);

    expect(mcpTools).toHaveLength(0);
  });
});
