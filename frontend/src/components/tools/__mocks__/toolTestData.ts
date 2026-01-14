/**
 * 工具组件的测试数据
 */

import type { BaseToolExecution } from '../sdk-types';
import type {
  AgentInput, BashInput, FileEditInput, FileReadInput, FileWriteInput,
  GlobInput, GrepInput, KillShellInput, ListMcpResourcesInput,
  McpInput, NotebookEditInput, ReadMcpResourceInput, TimeMachineInput,
  TodoWriteInput, WebFetchInput, WebSearchInput, AskUserQuestionInput
} from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import type {
  MultiEditInput, LSToolInput, NotebookReadToolInput, BashOutputToolResult,
  EditToolResult
} from '../sdk-types';
import type { SubAgentMessage, SubAgentToolCall, TaskToolResult } from '../types';

// 基础工具执行工厂
export function createToolExecution(overrides: Partial<BaseToolExecution>): BaseToolExecution {
  return {
    id: 'test-execution-123',
    toolName: '',
    toolInput: {} as any,
    isExecuting: false,
    timestamp: new Date(),
    ...overrides
  };
}

// 测试数据生成函数
export const mockToolInputs = {
  // Bash 工具
  bash: (overrides?: Partial<BashInput>): BashInput => ({
    command: 'ls -la /Users/kongjie/slides/ai-editor',
    description: 'List project directory contents',
    timeout: 30000,
    run_in_background: false,
    ...overrides
  }),

  // Agent 工具
  agent: (overrides?: Partial<AgentInput>): AgentInput => ({
    description: 'Analyze project structure',
    prompt: 'Please analyze the project structure and provide insights about the codebase organization.',
    subagent_type: 'general',
    model: 'sonnet' as const,
    ...overrides
  }),

  // 文件编辑工具
  fileEdit: (overrides?: Partial<FileEditInput>): FileEditInput => ({
    file_path: '/Users/kongjie/slides/ai-editor/README.md',
    old_string: '# AgentStudio',
    new_string: '# AgentStudio\n\nA powerful AI-powered slide editing platform',
    ...overrides
  }),

  // 文件读取工具
  fileRead: (overrides?: Partial<FileReadInput>): FileReadInput => ({
    file_path: '/Users/kongjie/slides/ai-editor/package.json',
    limit: 50,
    ...overrides
  }),

  // 文件写入工具
  fileWrite: (overrides?: Partial<FileWriteInput>): FileWriteInput => ({
    file_path: '/Users/kongjie/slides/ai-editor/test.txt',
    content: 'This is a test file created by Storybook.',
    ...overrides
  }),

  // Glob 工具
  glob: (overrides?: Partial<GlobInput>): GlobInput => ({
    pattern: 'src/**/*.tsx',
    path: '/Users/kongjie/slides/ai-editor',
    ...overrides
  }),

  // Grep 工具
  grep: (overrides?: Partial<GrepInput>): GrepInput => ({
    pattern: 'import.*React',
    path: '/Users/kongjie/slides/ai-editor/src',
    output_mode: 'files_with_matches',
    '-n': true,
    ...overrides
  }),

  // Kill Shell 工具
  killShell: (overrides?: Partial<KillShellInput>): KillShellInput => ({
    shell_id: 'bash-12345',
    ...overrides
  }),

  // MCP 资源列表工具
  listMcpResources: (overrides?: Partial<ListMcpResourcesInput>): ListMcpResourcesInput => ({
    server: 'test-server',
    ...overrides
  }),

  // MCP 工具
  mcp: (overrides?: Partial<McpInput>): McpInput => ({
    // MCP 工具输入比较灵活，只需要基础类型
    tool_name: 'test_mcp_tool',
    input_data: { test: 'data' },
    ...overrides
  }),

  // Notebook 编辑工具
  notebookEdit: (overrides?: Partial<NotebookEditInput>): NotebookEditInput => ({
    notebook_path: '/Users/kongjie/slides/ai-editor/notebooks/test.ipynb',
    new_source: 'print("Hello from Storybook!")',
    cell_id: 'cell-1',
    cell_type: 'code',
    edit_mode: 'replace',
    ...overrides
  }),

  // MCP 资源读取工具
  readMcpResource: (overrides?: Partial<ReadMcpResourceInput>): ReadMcpResourceInput => ({
    server: 'test-server',
    uri: 'resource://test/path/data.json',
    ...overrides
  }),

  // 时间机器工具
  timeMachine: (overrides?: Partial<TimeMachineInput>): TimeMachineInput => ({
    message_prefix: 'Let me try a different approach',
    course_correction: 'Use the more efficient algorithm we discussed',
    restore_code: true,
    ...overrides
  }),

  // TODO 工具
  todoWrite: (overrides?: Partial<TodoWriteInput>): TodoWriteInput => ({
    todos: [
      {
        content: 'Set up development environment',
        status: 'completed' as const,
        activeForm: 'Development environment is ready'
      },
      {
        content: 'Write documentation',
        status: 'in_progress' as const,
        activeForm: 'Currently writing API documentation'
      },
      {
        content: 'Run tests',
        status: 'pending' as const,
        activeForm: 'Will run unit and integration tests'
      }
    ],
    ...overrides
  }),

  // Web Fetch 工具
  webFetch: (overrides?: Partial<WebFetchInput>): WebFetchInput => ({
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    prompt: 'Extract the title and body from this blog post.',
    ...overrides
  }),

  // Web Search 工具
  webSearch: (overrides?: Partial<WebSearchInput>): WebSearchInput => ({
    query: 'React hooks best practices 2024',
    allowed_domains: ['react.dev', 'reactjs.org', 'stackoverflow.com'],
    ...overrides
  }),

  // Ask User Question 工具
  askUserQuestion: (overrides?: Partial<AskUserQuestionInput>): AskUserQuestionInput => ({
    questions: [
      {
        question: 'Which approach would you prefer for state management?',
        header: 'State Management',
        options: [
          {
            label: 'Redux',
            description: 'Predictable state container with middleware support'
          },
          {
            label: 'Zustand',
            description: 'Simple and fast state management'
          },
          {
            label: 'Context API',
            description: 'Built-in React solution for component state'
          }
        ],
        multiSelect: false
      }
    ],
    ...overrides
  }),

  // 项目特有工具类型
  multiEdit: (overrides?: Partial<MultiEditInput>): MultiEditInput => ({
    file_path: '/Users/kongjie/slides/ai-editor/src/App.tsx',
    edits: [
      {
        old_string: 'className="App"',
        new_string: 'className="App bg-blue-50"',
        replace_all: false
      },
      {
        old_string: 'const [count, setCount] = useState(0)',
        new_string: 'const [count, setCount] = useState(0)',
        replace_all: true
      }
    ],
    ...overrides
  }),

  lsTool: (overrides?: Partial<LSToolInput>): LSToolInput => ({
    path: '/Users/kongjie/slides/ai-editor/src',
    ignore: ['node_modules', '.git', 'dist'],
    ...overrides
  }),

  notebookReadTool: (overrides?: Partial<NotebookReadToolInput>): NotebookReadToolInput => ({
    notebook_path: '/Users/kongjie/slides/ai-editor/notebooks/analysis.ipynb',
    cell_id: 'cell-abc123',
    ...overrides
  })
};

// 不同状态的工具执行示例
export const mockToolExecutions = {
  // 不同执行状态
  pending: (toolName: string, input: any): BaseToolExecution =>
    createToolExecution({ toolName, toolInput: input, isExecuting: false }),

  executing: (toolName: string, input: any): BaseToolExecution =>
    createToolExecution({ toolName, toolInput: input, isExecuting: true }),

  success: (toolName: string, input: any, result?: string): BaseToolExecution =>
    createToolExecution({ toolName, toolInput: input, toolResult: result, isExecuting: false }),

  error: (toolName: string, input: any, error?: string): BaseToolExecution =>
    createToolExecution({ toolName, toolInput: input, toolResult: error, isExecuting: false, isError: true }),

  interrupted: (toolName: string, input: any): BaseToolExecution =>
    createToolExecution({ toolName, toolInput: input, isExecuting: false, isInterrupted: true }),

  // 特定结果类型
  bashWithOutput: (input: BashInput, output: string): BaseToolExecution =>
    createToolExecution({ toolName: 'Bash', toolInput: input, toolResult: output, isExecuting: false }),

  editWithPatch: (input: FileEditInput, patch: EditToolResult): BaseToolExecution =>
    createToolExecution({ toolName: 'Edit', toolInput: input, toolUseResult: patch, isExecuting: false }),

  bashOutput: (input: any, output: BashOutputToolResult): BaseToolExecution =>
    createToolExecution({ toolName: 'BashOutput', toolInput: input, toolUseResult: output, isExecuting: false })
};

// 子Agent工具调用测试数据
export const mockSubAgentToolCalls: SubAgentToolCall[] = [
  {
    id: 'call_read_1',
    toolName: 'Read',
    toolInput: { file_path: '/Users/kongjie/projects/jeff-marketplace/assistant/plugin.json' },
    toolResult: '{\n  "name": "assistant",\n  "version": "2.2.0"\n}',
    isError: false,
    timestamp: '2025-12-08T07:23:28.539Z'
  },
  {
    id: 'call_read_2',
    toolName: 'Read',
    toolInput: { file_path: '/Users/kongjie/projects/jeff-marketplace/todo_manager.py' },
    toolResult: '#!/usr/bin/env python3\n\nclass TodoManager:\n    def __init__(self):\n        pass\n',
    isError: false,
    timestamp: '2025-12-08T07:23:32.523Z'
  },
  {
    id: 'call_read_3',
    toolName: 'Read',
    toolInput: { file_path: '/Users/kongjie/projects/jeff-marketplace/slide_generator.py' },
    toolResult: '#!/usr/bin/env python3\n\nimport os\nfrom google import genai\n',
    isError: false,
    timestamp: '2025-12-08T07:23:32.779Z'
  },
  {
    id: 'call_bash_1',
    toolName: 'Bash',
    toolInput: { command: 'ls -la', description: 'List project files' },
    toolResult: 'total 16\ndrwxr-xr-x  5 user staff 160 Dec 8 07:20 .\n-rw-r--r--  1 user staff 512 Dec 8 07:20 plugin.json',
    isError: false,
    timestamp: '2025-12-08T07:23:44.072Z'
  },
  {
    id: 'call_grep_1',
    toolName: 'Grep',
    toolInput: { pattern: 'def .*\\(', path: 'src/', '-n': true },
    toolResult: 'src/utils.py:10:def parse_config():\nsrc/main.py:5:def main():',
    isError: false,
    timestamp: '2025-12-08T07:23:46.065Z'
  }
];

// 模拟子Agent消息流数据
export const mockSubAgentMessageFlow: SubAgentMessage[] = [
  {
    id: 'msg_sub_1',
    role: 'assistant',
    timestamp: '2025-12-08T07:23:26.005Z',
    messageParts: [
      {
        id: 'part_sub_1_0',
        type: 'text',
        content: 'I\'ll perform a comprehensive code review of the codebase. Let me start by examining the project structure.',
        order: 0
      }
    ]
  },
  {
    id: 'msg_sub_2',
    role: 'assistant',
    timestamp: '2025-12-08T07:23:30.000Z',
    messageParts: [
      {
        id: 'part_sub_2_0',
        type: 'tool',
        toolData: {
          id: 'call_read_1',
          toolName: 'Read',
          toolInput: { file_path: '/Users/kongjie/projects/example/plugin.json' },
          toolResult: '{\n  "name": "example-plugin",\n  "version": "1.0.0"\n}',
          isError: false
        },
        order: 0
      }
    ]
  },
  {
    id: 'msg_sub_3',
    role: 'assistant',
    timestamp: '2025-12-08T07:23:35.000Z',
    messageParts: [
      {
        id: 'part_sub_3_0',
        type: 'thinking',
        content: 'The plugin.json looks well-structured. Now I should check the main source files for any code quality issues or potential bugs.',
        order: 0
      },
      {
        id: 'part_sub_3_1',
        type: 'tool',
        toolData: {
          id: 'call_grep_1',
          toolName: 'Grep',
          toolInput: { pattern: 'TODO|FIXME', path: 'src/', '-n': true },
          toolResult: 'src/utils.ts:45:// TODO: Add error handling\nsrc/main.ts:23:// FIXME: Memory leak issue',
          isError: false
        },
        order: 1
      }
    ]
  },
  {
    id: 'msg_sub_4',
    role: 'assistant',
    timestamp: '2025-12-08T07:23:50.000Z',
    messageParts: [
      {
        id: 'part_sub_4_0',
        type: 'text',
        content: '## Code Review Summary\n\n**Overall Grade: A- (85/100)**\n\n### Findings:\n\n1. **Code Quality**: Generally good structure with some minor issues\n2. **TODO Items**: Found 2 pending tasks that need attention\n3. **Documentation**: Well documented\n\n### Recommendations:\n\n- Address the FIXME in `src/main.ts` for the memory leak\n- Add proper error handling in `src/utils.ts`',
        order: 0
      }
    ]
  }
];

// Task工具结果测试数据
export const mockTaskToolResults = {
  completed: (subAgentMessageFlow?: SubAgentMessage[]): TaskToolResult => ({
    status: 'completed',
    prompt: 'Please perform a comprehensive code review of the current codebase.',
    agentId: '6d16b542',
    content: [{ type: 'text', text: 'Code review completed successfully.' }],
    totalDurationMs: 84305,
    totalTokens: 33352,
    totalToolUseCount: 14,
    usage: {
      input_tokens: 3149,
      output_tokens: 1787,
      cache_read_input_tokens: 28416
    },
    subAgentMessageFlow: subAgentMessageFlow || mockSubAgentMessageFlow
  }),

  failed: (): TaskToolResult => ({
    status: 'failed',
    prompt: 'Execute complex analysis',
    agentId: 'failed-agent-001',
    content: [{ type: 'text', text: 'Analysis failed due to timeout.' }],
    totalDurationMs: 30000,
    totalTokens: 5000,
    totalToolUseCount: 3,
    usage: {
      input_tokens: 2000,
      output_tokens: 500
    }
  }),

  cancelled: (): TaskToolResult => ({
    status: 'cancelled',
    prompt: 'Task was cancelled by user',
    agentId: 'cancelled-agent-002',
    totalDurationMs: 5000,
    totalTokens: 1000,
    totalToolUseCount: 1
  }),

  noTools: (): TaskToolResult => ({
    status: 'completed',
    prompt: 'Simple task without tool calls',
    agentId: 'simple-agent-003',
    content: [{ type: 'text', text: 'Task completed without any tool calls.' }],
    totalDurationMs: 1500,
    totalTokens: 500,
    totalToolUseCount: 0,
    subAgentMessageFlow: []
  }),

  withErrors: (): TaskToolResult => ({
    status: 'completed',
    prompt: 'Code review with some errors',
    agentId: 'mixed-agent-004',
    totalDurationMs: 45000,
    totalTokens: 15000,
    totalToolUseCount: 5,
    subAgentMessageFlow: [
      {
        id: 'msg_err_1',
        role: 'assistant',
        timestamp: '2025-12-08T07:25:00.000Z',
        messageParts: [
          {
            id: 'part_err_1_0',
            type: 'text',
            content: 'Let me check the configuration files.',
            order: 0
          },
          {
            id: 'part_err_1_1',
            type: 'tool',
            toolData: {
              id: 'call_success_1',
              toolName: 'Read',
              toolInput: { file_path: '/src/config.ts' },
              toolResult: 'export const config = { debug: true };',
              isError: false
            },
            order: 1
          }
        ]
      },
      {
        id: 'msg_err_2',
        role: 'assistant',
        timestamp: '2025-12-08T07:25:05.000Z',
        messageParts: [
          {
            id: 'part_err_2_0',
            type: 'tool',
            toolData: {
              id: 'call_error_1',
              toolName: 'Read',
              toolInput: { file_path: '/nonexistent/file.ts' },
              toolResult: 'Error: File not found',
              isError: true
            },
            order: 0
          }
        ]
      },
      {
        id: 'msg_err_3',
        role: 'assistant',
        timestamp: '2025-12-08T07:25:10.000Z',
        messageParts: [
          {
            id: 'part_err_3_0',
            type: 'text',
            content: 'The file was not found. Let me run the tests instead.',
            order: 0
          },
          {
            id: 'part_err_3_1',
            type: 'tool',
            toolData: {
              id: 'call_success_2',
              toolName: 'Bash',
              toolInput: { command: 'npm test' },
              toolResult: 'All tests passed',
              isError: false
            },
            order: 1
          }
        ]
      }
    ]
  })
};

// 工具结果数据
export const mockResults = {
  bash: {
    success: 'drwxr-xr-x    12 kongjie  staff  4096 Nov 19 18:50 .',
    error: 'Command failed with exit code 1'
  },
  edit: {
    patch: {
      filePath: '/Users/kongjie/slides/ai-editor/README.md',
      oldString: '# AgentStudio',
      newString: '# AgentStudio\n\nA powerful AI-powered slide editing platform',
      originalFile: '# AgentStudio\n...',
      structuredPatch: [
        {
          oldStart: 1,
          oldLines: 1,
          newStart: 1,
          newLines: 3,
          lines: [
            '-# AgentStudio',
            '+# AgentStudio',
            '+',
            '+A powerful AI-powered slide editing platform'
          ]
        }
      ],
      userModified: false,
      replaceAll: false
    }
  },
  grep: {
    results: 'src/App.tsx:5:import React from \'react\';\n' +
           'src/components/Header.tsx:1:import { useState } from \'react\';\n' +
           'src/hooks/useAuth.ts:2:export const useAuth = () => {'
  },
  webFetch: {
    success: 'Blog post title: "sunt aut facere repellat provident"',
    error: 'Failed to fetch URL: 404 Not Found'
  },
  webSearch: {
    results: 'Found 5 relevant articles about React hooks best practices'
  },
  askUserQuestion: {
    response: 'User selected: "Zustand" - Simple and fast state management'
  },
  todoWrite: {
    result: 'Task list updated: 1 completed, 1 in progress, 1 pending'
  },
  timeMachine: {
    result: 'Successfully rewound to previous message and applied corrections'
  }
};