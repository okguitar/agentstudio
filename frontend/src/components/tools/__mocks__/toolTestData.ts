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

// 基础工具执行工厂
export function createToolExecution<T>(overrides: Partial<BaseToolExecution>): BaseToolExecution {
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