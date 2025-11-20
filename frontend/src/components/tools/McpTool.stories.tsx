import type { Meta, StoryObj } from '@storybook/react';
import { McpTool } from './McpTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/McpTool',
  component: McpTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'McpTool 用于调用 MCP (Model Context Protocol) 服务器的工具。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof McpTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const McpStates: Story = {
  args: {
    execution: mockToolExecutions.pending('Mcp', mockToolInputs.mcp())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">MCP 工具状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待执行</h4>
          <McpTool
            execution={mockToolExecutions.pending('Mcp', mockToolInputs.mcp())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行中</h4>
          <McpTool
            execution={mockToolExecutions.executing('Mcp', mockToolInputs.mcp({
              tool_name: 'read_file',
              input_data: { path: '/tmp/test.txt' }
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行成功</h4>
          <McpTool
            execution={mockToolExecutions.success(
              'Mcp',
              mockToolInputs.mcp(),
              'MCP tool executed successfully'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行失败</h4>
          <McpTool
            execution={mockToolExecutions.error(
              'Mcp',
              mockToolInputs.mcp({ tool_name: 'nonexistent_tool' }),
              'Error: MCP tool not found'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const McpOperations: Story = {
  args: {
    execution: mockToolExecutions.pending('Mcp', mockToolInputs.mcp())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同 MCP 操作</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">文件操作</h4>
          <McpTool
            execution={mockToolExecutions.pending('Mcp', mockToolInputs.mcp({
              tool_name: 'file_system_read',
              input_data: {
                path: '/Users/kongjie/slides/ai-editor/README.md',
                encoding: 'utf-8'
              }
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">数据库查询</h4>
          <McpTool
            execution={mockToolExecutions.pending('Mcp', mockToolInputs.mcp({
              tool_name: 'database_query',
              input_data: {
                query: 'SELECT * FROM users WHERE active = 1',
                limit: 100
              }
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">API 调用</h4>
          <McpTool
            execution={mockToolExecutions.pending('Mcp', mockToolInputs.mcp({
              tool_name: 'external_api_call',
              input_data: {
                endpoint: 'https://api.github.com/repos/owner/repo',
                method: 'GET',
                headers: { 'Accept': 'application/vnd.github.v3+json' }
              }
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">计算任务</h4>
          <McpTool
            execution={mockToolExecutions.pending('Mcp', mockToolInputs.mcp({
              tool_name: 'data_processing',
              input_data: {
                operation: 'aggregate',
                dataset: 'sales_data',
                group_by: 'region',
                metric: 'revenue'
              }
            }))}
          />
        </div>
      </div>
    </div>
  )
};
