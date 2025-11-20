import type { Meta, StoryObj } from '@storybook/react';
import { ToolRenderer } from './ToolRenderer';
import { mockToolInputs, mockToolExecutions, mockResults } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/ToolRenderer',
  component: ToolRenderer,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ToolRenderer 组件负责根据工具类型渲染对应的工具组件，支持 19 种不同的工具类型。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    execution: {
      description: '工具执行对象，包含工具类型、输入、执行状态和结果',
      control: 'object'
    }
  }
} satisfies Meta<typeof ToolRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础故事 - 不同状态
export const States: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash())
  },
  parameters: {
    docs: {
      description: {
        story: '展示工具在不同执行状态下的外观'
      }
    }
  },
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">等待状态</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ToolRenderer
            execution={mockToolExecutions.pending('Bash', mockToolInputs.bash())}
          />
          <ToolRenderer
            execution={mockToolExecutions.pending('Read', mockToolInputs.fileRead())}
          />
          <ToolRenderer
            execution={mockToolExecutions.pending('Task', mockToolInputs.agent())}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">执行中状态</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ToolRenderer
            execution={mockToolExecutions.executing('Bash', mockToolInputs.bash())}
          />
          <ToolRenderer
            execution={mockToolExecutions.executing('WebFetch', mockToolInputs.webFetch())}
          />
          <ToolRenderer
            execution={mockToolExecutions.executing('Task', mockToolInputs.agent())}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">成功状态</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ToolRenderer
            execution={mockToolExecutions.bashWithOutput(
              mockToolInputs.bash(),
              mockResults.bash.success
            )}
          />
          <ToolRenderer
            execution={mockToolExecutions.editWithPatch(
              mockToolInputs.fileEdit(),
              mockResults.edit.patch
            )}
          />
          <ToolRenderer
            execution={mockToolExecutions.success('Glob', mockToolInputs.glob(), 'src/components/*.tsx')}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">错误状态</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ToolRenderer
            execution={mockToolExecutions.error('Bash', mockToolInputs.bash(), mockResults.bash.error)}
          />
          <ToolRenderer
            execution={mockToolExecutions.error('WebFetch', mockToolInputs.webFetch(), mockResults.webFetch.error)}
          />
        </div>
      </div>
    </div>
  )
};

// 文件操作工具
export const FileTools: Story = {
  args: {
    execution: mockToolExecutions.pending('Read', mockToolInputs.fileRead())
  },
  parameters: {
    docs: {
      description: {
        story: '文件相关的工具：Read, Write, Edit, Glob'
      }
    }
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">文件操作工具</h3>
      <div className="grid gap-6 md:grid-cols-2">
        <ToolRenderer
          execution={mockToolExecutions.success('Read', mockToolInputs.fileRead(), JSON.stringify({ name: 'test' }, null, 2))}
        />
        <ToolRenderer
          execution={mockToolExecutions.success('Write', mockToolInputs.fileWrite(), 'File written successfully')}
        />
        <ToolRenderer
          execution={mockToolExecutions.editWithPatch(
            mockToolInputs.fileEdit(),
            mockResults.edit.patch
          )}
        />
        <ToolRenderer
          execution={mockToolExecutions.success('Glob', mockToolInputs.glob(), 'src/components/*.tsx\nsrc/hooks/*.ts')}
        />
      </div>
    </div>
  )
};

// 搜索和导航工具
export const SearchTools: Story = {
  args: {
    execution: mockToolExecutions.pending('Grep', mockToolInputs.grep())
  },
  parameters: {
    docs: {
      description: {
        story: '搜索和导航工具：Grep, LS, WebFetch, WebSearch'
      }
    }
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">搜索和导航工具</h3>
      <div className="grid gap-6 md:grid-cols-2">
        <ToolRenderer
          execution={mockToolExecutions.success('Grep', mockToolInputs.grep(), mockResults.grep.results)}
        />
        <ToolRenderer
          execution={mockToolExecutions.success('LS', mockToolInputs.lsTool(), 'src/\ncomponents/\nutils/')}
        />
        <ToolRenderer
          execution={mockToolExecutions.success('WebFetch', mockToolInputs.webFetch(), mockResults.webFetch.success)}
        />
        <ToolRenderer
          execution={mockToolExecutions.success('WebSearch', mockToolInputs.webSearch(), mockResults.webSearch.results)}
        />
      </div>
    </div>
  )
};

// 开发者工具
export const DeveloperTools: Story = {
  args: {
    execution: mockToolExecutions.pending('Task', mockToolInputs.agent())
  },
  parameters: {
    docs: {
      description: {
        story: '开发者工具：Task (Agent), Bash, Edit, MultiEdit, NotebookEdit, NotebookRead'
      }
    }
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">开发者工具</h3>
      <div className="grid gap-6 md:grid-cols-2">
        <ToolRenderer
          execution={mockToolExecutions.success('Task', mockToolInputs.agent({ model: 'sonnet' }), 'Analysis completed successfully')}
        />
        <ToolRenderer
          execution={mockToolExecutions.bashWithOutput(
            mockToolInputs.bash({ command: 'npm test' }),
            '✓ All tests passed'
          )}
        />
        <ToolRenderer
          execution={mockToolExecutions.editWithPatch(
            mockToolInputs.fileEdit(),
            mockResults.edit.patch
          )}
        />
        <ToolRenderer
          execution={mockToolExecutions.success('NotebookEdit', mockToolInputs.notebookEdit(), 'Cell updated')}
        />
        <ToolRenderer
          execution={mockToolExecutions.success('NotebookRead', mockToolInputs.notebookReadTool(), 'print("Hello")')}
        />
        <ToolRenderer
          execution={mockToolExecutions.bashOutput(
            { bash_id: 'bash-123' },
            {
              shellId: 'bash-123',
              command: 'npm run dev',
              status: 'running',
              exitCode: null,
              stdout: 'Background process output',
              stderr: '',
              stdoutLines: 1,
              stderrLines: 0,
              timestamp: new Date().toISOString()
            }
          )}
        />
      </div>
    </div>
  )
};

// MCP (Model Context Protocol) 工具
export const McpTools: Story = {
  args: {
    execution: mockToolExecutions.pending('ListMcpResources', mockToolInputs.listMcpResources())
  },
  parameters: {
    docs: {
      description: {
        story: 'MCP 相关工具：ListMcpResources, ReadMcpResource, Mcp'
      }
    }
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">MCP 工具</h3>
      <div className="grid gap-6 md:grid-cols-2">
        <ToolRenderer
          execution={mockToolExecutions.success(
            'ListMcpResources',
            mockToolInputs.listMcpResources(),
            JSON.stringify([
              { uri: 'resource://test/config.json', name: 'Configuration' },
              { uri: 'resource://test/data.json', name: 'Data' }
            ], null, 2)
          )}
        />
        <ToolRenderer
          execution={mockToolExecutions.success(
            'ReadMcpResource',
            mockToolInputs.readMcpResource(),
            JSON.stringify({ setting: 'value', enabled: true }, null, 2)
          )}
        />
        <ToolRenderer
          execution={mockToolExecutions.success('Mcp', mockToolInputs.mcp(), 'MCP tool executed successfully')}
        />
      </div>
    </div>
  )
};

// 高级工具
export const AdvancedTools: Story = {
  args: {
    execution: mockToolExecutions.pending('TimeMachine', mockToolInputs.timeMachine())
  },
  parameters: {
    docs: {
      description: {
        story: '高级工具：TimeMachine, AskUserQuestion, TodoWrite, ExitPlanMode'
      }
    }
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">高级工具</h3>
      <div className="grid gap-6 md:grid-cols-2">
        <ToolRenderer
          execution={mockToolExecutions.success(
            'TimeMachine',
            mockToolInputs.timeMachine(),
            mockResults.timeMachine.result
          )}
        />
        <ToolRenderer
          execution={mockToolExecutions.success(
            'AskUserQuestion',
            mockToolInputs.askUserQuestion(),
            mockResults.askUserQuestion.response
          )}
        />
        <ToolRenderer
          execution={mockToolExecutions.success(
            'TodoWrite',
            mockToolInputs.todoWrite(),
            mockResults.todoWrite.result
          )}
        />
        <ToolRenderer
          execution={mockToolExecutions.success('ExitPlanMode', {}, 'Exiting plan mode')}
        />
      </div>
    </div>
  )
};

// 系统工具
export const SystemTools: Story = {
  args: {
    execution: mockToolExecutions.pending('KillBash', mockToolInputs.killShell())
  },
  parameters: {
    docs: {
      description: {
        story: '系统工具：KillBash'
      }
    }
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">系统工具</h3>
      <div className="grid gap-6 md:grid-cols-2">
        <ToolRenderer
          execution={mockToolExecutions.success('KillBash', mockToolInputs.killShell(), 'Process bash-123 killed')}
        />
      </div>
    </div>
  )
};

// 交互式示例
export const InteractiveExample: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash())
  },
  parameters: {
    docs: {
      description: {
        story: '交互式示例，展示一个完整的工具执行流程'
      }
    }
  },
  render: () => {
    const bashInput = mockToolInputs.bash({ command: 'ls -la' });
    const writeInput = mockToolInputs.fileWrite({
      file_path: '/Users/kongjie/slides/ai-editor/README.md',
      content: '# My Project\n\nThis is a test project.'
    });

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">交互式示例</h3>
        <p className="text-gray-600">展示工具从等待到执行完成的不同状态</p>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">1. Bash 命令执行流程</h4>
            <div className="space-y-3">
              <div className="text-sm text-gray-500">等待状态 → 执行中 → 成功</div>
              <ToolRenderer
                execution={mockToolExecutions.pending('Bash', bashInput)}
              />
              <ToolRenderer
                execution={mockToolExecutions.executing('Bash', bashInput)}
              />
              <ToolRenderer
                execution={mockToolExecutions.bashWithOutput(bashInput, mockResults.bash.success)}
              />
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">2. 文件写入流程</h4>
            <div className="space-y-3">
              <div className="text-sm text-gray-500">等待状态 → 成功</div>
              <ToolRenderer
                execution={mockToolExecutions.pending('Write', writeInput)}
              />
              <ToolRenderer
                execution={mockToolExecutions.success('Write', writeInput, 'File written successfully')}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
};

// 所有工具概览
export const AllToolsOverview: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash())
  },
  parameters: {
    docs: {
      description: {
        story: '展示所有 19 种工具类型的基本状态'
      }
    }
  },
  render: () => {
    const tools = [
      { name: 'Bash', input: mockToolInputs.bash() },
      { name: 'Task', input: mockToolInputs.agent() },
      { name: 'Read', input: mockToolInputs.fileRead() },
      { name: 'Write', input: mockToolInputs.fileWrite() },
      { name: 'Edit', input: mockToolInputs.fileEdit() },
      { name: 'MultiEdit', input: mockToolInputs.multiEdit() },
      { name: 'Glob', input: mockToolInputs.glob() },
      { name: 'Grep', input: mockToolInputs.grep() },
      { name: 'LS', input: mockToolInputs.lsTool() },
      { name: 'WebFetch', input: mockToolInputs.webFetch() },
      { name: 'WebSearch', input: mockToolInputs.webSearch() },
      { name: 'NotebookEdit', input: mockToolInputs.notebookEdit() },
      { name: 'NotebookRead', input: mockToolInputs.notebookReadTool() },
      { name: 'ListMcpResources', input: mockToolInputs.listMcpResources() },
      { name: 'ReadMcpResource', input: mockToolInputs.readMcpResource() },
      { name: 'Mcp', input: mockToolInputs.mcp() },
      { name: 'TimeMachine', input: mockToolInputs.timeMachine() },
      { name: 'AskUserQuestion', input: mockToolInputs.askUserQuestion() },
      { name: 'TodoWrite', input: mockToolInputs.todoWrite() },
      { name: 'KillBash', input: mockToolInputs.killShell() },
      { name: 'BashOutput', input: { shell_id: 'test-123' } },
      { name: 'ExitPlanMode', input: {} }
    ];

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">所有工具概览 (22 种工具)</h3>
        <p className="text-gray-600">展示系统中支持的所有工具类型</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <div key={tool.name} className="border rounded-lg p-3">
              <h4 className="font-medium text-sm text-gray-700 mb-2">{tool.name}</h4>
              <ToolRenderer
                execution={mockToolExecutions.pending(tool.name, tool.input)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
};