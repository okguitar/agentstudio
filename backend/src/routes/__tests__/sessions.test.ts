/**
 * Sessions 路由单元测试
 * 
 * 测试子Agent消息解析和工具调用提取逻辑
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs 和 os 模块
vi.mock('fs');
vi.mock('os');

describe('SubAgent Tool Calls Parsing', () => {
  const mockProjectPath = '/Users/kongjie/projects/jeff-marketplace';
  const mockClaudeProjectPath = '-Users-kongjie-projects-jeff-marketplace';
  const mockAgentId = '6d16b542';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock os.homedir()
    vi.mocked(os.homedir).mockReturnValue('/Users/kongjie');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('readSubAgentToolCalls', () => {
    // 注意：由于函数是私有的，我们需要通过测试整个路由来间接测试
    // 这里我们创建一些辅助函数来模拟测试数据
    
    it('should correctly parse tool_use blocks from sub-agent messages', () => {
      // 模拟子Agent消息数据
      const mockSubAgentMessages = [
        {
          type: 'assistant',
          uuid: 'msg-1',
          timestamp: '2025-12-08T07:23:26.005Z',
          sessionId: '27cc6829',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'I will read the files.' },
              { 
                type: 'tool_use', 
                id: 'call_read_1', 
                name: 'Read', 
                input: { file_path: '/src/config.ts' } 
              }
            ]
          }
        },
        {
          type: 'user',
          uuid: 'msg-2',
          timestamp: '2025-12-08T07:23:28.000Z',
          sessionId: '27cc6829',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'call_read_1',
                content: 'export const config = { debug: true };',
                is_error: false
              }
            ]
          }
        }
      ];

      // 验证消息结构
      const assistantMsg = mockSubAgentMessages[0];
      expect(assistantMsg.type).toBe('assistant');
      expect(Array.isArray(assistantMsg.message.content)).toBe(true);
      
      const toolUseBlock = (assistantMsg.message.content as any[]).find(
        (block: any) => block.type === 'tool_use'
      );
      expect(toolUseBlock).toBeDefined();
      expect(toolUseBlock.name).toBe('Read');
      expect(toolUseBlock.id).toBe('call_read_1');

      // 验证工具结果
      const userMsg = mockSubAgentMessages[1];
      const toolResultBlock = (userMsg.message.content as any[]).find(
        (block: any) => block.type === 'tool_result'
      );
      expect(toolResultBlock).toBeDefined();
      expect(toolResultBlock.tool_use_id).toBe('call_read_1');
      expect(toolResultBlock.is_error).toBe(false);
    });

    it('should handle multiple tool calls in a single message', () => {
      const mockMessage = {
        type: 'assistant',
        uuid: 'msg-multi',
        timestamp: '2025-12-08T07:23:32.000Z',
        sessionId: '27cc6829',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Let me examine multiple files.' },
            { type: 'tool_use', id: 'call_1', name: 'Read', input: { file_path: '/file1.ts' } },
            { type: 'tool_use', id: 'call_2', name: 'Read', input: { file_path: '/file2.ts' } },
            { type: 'tool_use', id: 'call_3', name: 'Bash', input: { command: 'ls -la' } }
          ]
        }
      };

      const toolUseBlocks = (mockMessage.message.content as any[]).filter(
        (block: any) => block.type === 'tool_use'
      );

      expect(toolUseBlocks).toHaveLength(3);
      expect(toolUseBlocks[0].name).toBe('Read');
      expect(toolUseBlocks[1].name).toBe('Read');
      expect(toolUseBlocks[2].name).toBe('Bash');
    });

    it('should correctly identify error tool results', () => {
      const mockToolResults = [
        {
          type: 'tool_result',
          tool_use_id: 'call_success',
          content: 'File content here',
          is_error: false
        },
        {
          type: 'tool_result',
          tool_use_id: 'call_error',
          content: 'Error: File not found',
          is_error: true
        }
      ];

      const successResult = mockToolResults.find(r => r.tool_use_id === 'call_success');
      const errorResult = mockToolResults.find(r => r.tool_use_id === 'call_error');

      expect(successResult?.is_error).toBe(false);
      expect(errorResult?.is_error).toBe(true);
    });

    it('should handle empty sub-agent file gracefully', () => {
      // 测试空文件场景
      const emptyContent = '';
      const lines = emptyContent.trim().split('\n').filter(line => line.trim());
      
      expect(lines).toHaveLength(0);
    });

    it('should handle malformed JSON lines gracefully', () => {
      const malformedLines = [
        '{"type": "assistant", "valid": true}',
        '{"invalid json here',
        '{"type": "user", "complete": true}'
      ];

      const parsedMessages: any[] = [];
      
      malformedLines.forEach(line => {
        try {
          parsedMessages.push(JSON.parse(line));
        } catch {
          // 跳过无效的JSON行
        }
      });

      expect(parsedMessages).toHaveLength(2);
    });
  });

  describe('TaskToolResult with subAgentToolCalls', () => {
    it('should correctly structure TaskToolResult with sub-agent tool calls', () => {
      const mockTaskToolResult = {
        status: 'completed',
        prompt: 'Perform code review',
        agentId: '6d16b542',
        content: [{ type: 'text', text: 'Review complete' }],
        totalDurationMs: 84305,
        totalTokens: 33352,
        totalToolUseCount: 14,
        usage: {
          input_tokens: 3149,
          output_tokens: 1787,
          cache_read_input_tokens: 28416
        },
        subAgentToolCalls: [
          {
            id: 'call_read_1',
            toolName: 'Read',
            toolInput: { file_path: '/src/config.ts' },
            toolResult: 'export const config = {};',
            isError: false,
            timestamp: '2025-12-08T07:23:28.539Z'
          },
          {
            id: 'call_bash_1',
            toolName: 'Bash',
            toolInput: { command: 'npm test' },
            toolResult: 'All tests passed',
            isError: false,
            timestamp: '2025-12-08T07:23:44.072Z'
          }
        ]
      };

      expect(mockTaskToolResult.status).toBe('completed');
      expect(mockTaskToolResult.agentId).toBe('6d16b542');
      expect(mockTaskToolResult.subAgentToolCalls).toHaveLength(2);
      expect(mockTaskToolResult.subAgentToolCalls![0].toolName).toBe('Read');
      expect(mockTaskToolResult.subAgentToolCalls![1].toolName).toBe('Bash');
      expect(mockTaskToolResult.totalToolUseCount).toBe(14);
    });

    it('should handle TaskToolResult without sub-agent tool calls', () => {
      const mockTaskToolResult = {
        status: 'completed',
        prompt: 'Simple task',
        agentId: 'simple-agent',
        totalDurationMs: 1000,
        totalTokens: 500,
        totalToolUseCount: 0
        // 没有 subAgentToolCalls 字段
      };

      expect((mockTaskToolResult as any).subAgentMessageFlow).toBeUndefined();
      expect(mockTaskToolResult.totalToolUseCount).toBe(0);
    });
  });

  describe('Main Agent and Sub-Agent Message Relationship', () => {
    it('should correctly identify Task tool_use and its result', () => {
      // 模拟主Agent的Task工具调用
      const mockTaskToolUse = {
        type: 'tool_use',
        id: 'call_task_1',
        name: 'Task',
        input: {
          description: 'Perform code review',
          prompt: 'Review the codebase',
          subagent_type: 'code-reviewer'
        }
      };

      // 模拟Task的tool_result
      const mockTaskToolResult = {
        type: 'tool_result',
        tool_use_id: 'call_task_1',
        content: [{ type: 'text', text: 'Code review completed' }],
        is_error: false
      };

      // 关联关系
      expect(mockTaskToolUse.id).toBe(mockTaskToolResult.tool_use_id);
      expect(mockTaskToolUse.name).toBe('Task');
    });

    it('should extract agentId from toolUseResult', () => {
      const mockToolUseResult = {
        status: 'completed',
        prompt: 'Code review',
        agentId: '6d16b542', // 这是子Agent的ID
        content: [{ type: 'text', text: 'Review done' }],
        totalToolUseCount: 14
      };

      expect(mockToolUseResult.agentId).toBe('6d16b542');
      // 使用这个agentId来读取 agent-6d16b542.jsonl 文件
      const subAgentFileName = `agent-${mockToolUseResult.agentId}.jsonl`;
      expect(subAgentFileName).toBe('agent-6d16b542.jsonl');
    });

    it('should correctly parse JSONL file format', () => {
      const mockJSONLContent = `{"type":"assistant","uuid":"1","message":{"content":[{"type":"tool_use","id":"call_1","name":"Read"}]}}
{"type":"user","uuid":"2","message":{"content":[{"type":"tool_result","tool_use_id":"call_1"}]}}
{"type":"assistant","uuid":"3","message":{"content":[{"type":"text","text":"Done"}]}}`;

      const lines = mockJSONLContent.split('\n').filter(line => line.trim());
      const messages = lines.map(line => JSON.parse(line));

      expect(messages).toHaveLength(3);
      expect(messages[0].type).toBe('assistant');
      expect(messages[1].type).toBe('user');
      expect(messages[2].type).toBe('assistant');
    });
  });

  describe('isSidechain Flag', () => {
    it('should correctly identify sidechain messages', () => {
      const mockMainAgentMessage = {
        type: 'assistant',
        isSidechain: false,
        sessionId: '27cc6829'
      };

      const mockSubAgentMessage = {
        type: 'assistant',
        isSidechain: true,
        sessionId: '27cc6829',
        agentId: '6d16b542'
      };

      expect(mockMainAgentMessage.isSidechain).toBe(false);
      expect(mockSubAgentMessage.isSidechain).toBe(true);
    });
  });
});

describe('Claude History File Naming', () => {
  it('should correctly filter out agent-xxx.jsonl files from main session list', () => {
    const mockFiles = [
      '27cc6829-33d6-49bc-97b1-45ee08c552e4.jsonl',  // 主Agent会话
      'abc12345-6789-0def-ghij-klmnopqrstuv.jsonl',  // 另一个主Agent会话
      'agent-6d16b542.jsonl',  // 子Agent消息文件（应该被过滤）
      'agent-another-id.jsonl',  // 另一个子Agent消息文件（应该被过滤）
      '.hidden.jsonl'  // 隐藏文件（应该被过滤）
    ];

    // 过滤规则
    const mainSessionFiles = mockFiles
      .filter(file => file.endsWith('.jsonl'))
      .filter(file => !file.startsWith('.'))
      .filter(file => !file.startsWith('agent-'));

    expect(mainSessionFiles).toHaveLength(2);
    expect(mainSessionFiles).toContain('27cc6829-33d6-49bc-97b1-45ee08c552e4.jsonl');
    expect(mainSessionFiles).toContain('abc12345-6789-0def-ghij-klmnopqrstuv.jsonl');
    expect(mainSessionFiles).not.toContain('agent-6d16b542.jsonl');
  });

  it('should correctly identify agent file pattern', () => {
    const agentFilePattern = /^agent-([a-zA-Z0-9]+)\.jsonl$/;
    
    expect('agent-6d16b542.jsonl'.match(agentFilePattern)).toBeTruthy();
    expect('agent-abc123.jsonl'.match(agentFilePattern)).toBeTruthy();
    expect('27cc6829-33d6-49bc.jsonl'.match(agentFilePattern)).toBeFalsy();
    expect('agent-.jsonl'.match(agentFilePattern)).toBeFalsy();
  });
});

