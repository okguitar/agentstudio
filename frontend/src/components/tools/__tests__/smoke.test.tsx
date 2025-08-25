import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolRenderer } from '../ToolRenderer';
import type { ToolExecution } from '../types';

/**
 * 烟雾测试 - 确保所有工具组件能正常渲染而不崩溃
 */
describe('Tool Components Smoke Tests', () => {
  const baseTimestamp = new Date('2024-01-01T10:00:00Z');

  // 测试所有工具的基本渲染
  const toolTests = [
    {
      name: 'Task',
      execution: {
        id: 'task-1',
        toolName: 'Task',
        toolInput: { description: '测试任务', prompt: '这是一个测试' },
        isExecuting: false,
        isError: false,
        timestamp: baseTimestamp,
      }
    },
    {
      name: 'Bash',
      execution: {
        id: 'bash-1',
        toolName: 'Bash',
        toolInput: { command: 'echo hello' },
        isExecuting: false,
        isError: false,
        timestamp: baseTimestamp,
      }
    },
    {
      name: 'Read',
      execution: {
        id: 'read-1',
        toolName: 'Read',
        toolInput: { file_path: '/test/file.txt' },
        isExecuting: false,
        isError: false,
        timestamp: baseTimestamp,
      }
    },
    {
      name: 'Write',
      execution: {
        id: 'write-1',
        toolName: 'Write',
        toolInput: { file_path: '/test/new.txt', content: 'test content' },
        isExecuting: false,
        isError: false,
        timestamp: baseTimestamp,
      }
    },
    {
      name: 'Edit',
      execution: {
        id: 'edit-1',
        toolName: 'Edit',
        toolInput: { file_path: '/test/edit.txt', old_string: 'old', new_string: 'new' },
        isExecuting: false,
        isError: false,
        timestamp: baseTimestamp,
      }
    },
    {
      name: 'Glob',
      execution: {
        id: 'glob-1',
        toolName: 'Glob',
        toolInput: { pattern: '**/*.js' },
        isExecuting: false,
        isError: false,
        timestamp: baseTimestamp,
      }
    },
    {
      name: 'Grep',
      execution: {
        id: 'grep-1',
        toolName: 'Grep',
        toolInput: { pattern: 'test' },
        isExecuting: false,
        isError: false,
        timestamp: baseTimestamp,
      }
    },
    {
      name: 'LS',
      execution: {
        id: 'ls-1',
        toolName: 'LS',
        toolInput: { path: '/test' },
        isExecuting: false,
        isError: false,
        timestamp: baseTimestamp,
      }
    }
  ];

  toolTests.forEach(({ name, execution }) => {
    it(`renders ${name} tool without crashing`, () => {
      render(<ToolRenderer execution={execution as ToolExecution} />);
      
      // 基本验证 - 工具名称应该显示
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('renders executing state', () => {
    const execution: ToolExecution = {
      id: 'test-executing',
      toolName: 'Bash',
      toolInput: { command: 'sleep 1' },
      isExecuting: true,
      isError: false,
      timestamp: baseTimestamp,
    };

    render(<ToolRenderer execution={execution} />);
    
    expect(screen.getByText('Bash')).toBeInTheDocument();
    expect(screen.getByText('执行中...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const execution: ToolExecution = {
      id: 'test-error',
      toolName: 'Read',
      toolInput: { file_path: '/nonexistent' },
      toolResult: 'File not found',
      isExecuting: false,
      isError: true,
      timestamp: baseTimestamp,
    };

    render(<ToolRenderer execution={execution} />);
    
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('执行错误')).toBeInTheDocument();
    expect(screen.getByText('File not found')).toBeInTheDocument();
  });

  it('renders success state with result', () => {
    const execution: ToolExecution = {
      id: 'test-success',
      toolName: 'Bash',
      toolInput: { command: 'echo success' },
      toolResult: 'success',
      isExecuting: false,
      isError: false,
      timestamp: baseTimestamp,
    };

    render(<ToolRenderer execution={execution} />);
    
    expect(screen.getByText('Bash')).toBeInTheDocument();
    expect(screen.getByText('执行结果:')).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('renders unknown tool type with fallback', () => {
    const execution: ToolExecution = {
      id: 'test-unknown',
      toolName: 'UnknownTool',
      toolInput: { param: 'value' },
      isExecuting: false,
      isError: false,
      timestamp: baseTimestamp,
    };

    render(<ToolRenderer execution={execution} />);
    
    expect(screen.getByText('UnknownTool')).toBeInTheDocument();
    expect(screen.getByText('未知工具类型')).toBeInTheDocument();
  });
});