import type { Meta, StoryObj } from '@storybook/react';
import { ReadMcpResourceTool } from './ReadMcpResourceTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/ReadMcpResourceTool',
  component: ReadMcpResourceTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ReadMcpResourceTool 用于读取 MCP 服务器的资源，支持不同类型的资源访问。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof ReadMcpResourceTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadMcpStates: Story = {
  args: {
    execution: mockToolExecutions.pending('ReadMcpResource', mockToolInputs.readMcpResource())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">MCP 资源读取状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待读取</h4>
          <ReadMcpResourceTool
            execution={mockToolExecutions.pending('ReadMcpResource', mockToolInputs.readMcpResource())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">读取中</h4>
          <ReadMcpResourceTool
            execution={mockToolExecutions.executing('ReadMcpResource', mockToolInputs.readMcpResource({
              server: 'filesystem-server',
              uri: 'file://project/config.json'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">读取成功</h4>
          <ReadMcpResourceTool
            execution={mockToolExecutions.success(
              'ReadMcpResource',
              mockToolInputs.readMcpResource(),
              '{\n  "name": "MyProject",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.0.0",\n    "typescript": "^5.0.0"\n  }\n}'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">资源不存在</h4>
          <ReadMcpResourceTool
            execution={mockToolExecutions.error(
              'ReadMcpResource',
              mockToolInputs.readMcpResource({ uri: 'resource://nonexistent/data.json' }),
              'Error: Resource not found or access denied'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const ResourceTypes: Story = {
  args: {
    execution: mockToolExecutions.pending('ReadMcpResource', mockToolInputs.readMcpResource())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同资源类型</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">配置文件</h4>
          <ReadMcpResourceTool
            execution={mockToolExecutions.pending('ReadMcpResource', mockToolInputs.readMcpResource({
              server: 'config-server',
              uri: 'config://application/production'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">数据库记录</h4>
          <ReadMcpResourceTool
            execution={mockToolExecutions.pending('ReadMcpResource', mockToolInputs.readMcpResource({
              server: 'database-server',
              uri: 'db://users/12345'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">缓存数据</h4>
          <ReadMcpResourceTool
            execution={mockToolExecutions.pending('ReadMcpResource', mockToolInputs.readMcpResource({
              server: 'cache-server',
              uri: 'cache://session/abc123'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">日志文件</h4>
          <ReadMcpResourceTool
            execution={mockToolExecutions.pending('ReadMcpResource', mockToolInputs.readMcpResource({
              server: 'log-server',
              uri: 'log://application/2024-01-19/error'
            }))}
          />
        </div>
      </div>
    </div>
  )
};
