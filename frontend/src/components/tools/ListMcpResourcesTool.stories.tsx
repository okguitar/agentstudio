import type { Meta, StoryObj } from '@storybook/react';
import { ListMcpResourcesTool } from './ListMcpResourcesTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/ListMcpResourcesTool',
  component: ListMcpResourcesTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ListMcpResourcesTool 用于列出 MCP 服务器的可用资源。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof ListMcpResourcesTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ListMcpStates: Story = {
  args: {
    execution: mockToolExecutions.pending('ListMcpResources', mockToolInputs.listMcpResources())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">MCP 资源列表状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待列表</h4>
          <ListMcpResourcesTool
            execution={mockToolExecutions.pending('ListMcpResources', mockToolInputs.listMcpResources())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">列表中</h4>
          <ListMcpResourcesTool
            execution={mockToolExecutions.executing('ListMcpResources', mockToolInputs.listMcpResources({
              server: 'filesystem-server'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">列表成功</h4>
          <ListMcpResourcesTool
            execution={mockToolExecutions.success(
              'ListMcpResources',
              mockToolInputs.listMcpResources(),
              `📁 file://project/src
📁 file://project/public
📁 file://project/config
📄 file://project/package.json
📄 file://project/README.md
📄 file://project/tsconfig.json`
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">服务器不可用</h4>
          <ListMcpResourcesTool
            execution={mockToolExecutions.error(
              'ListMcpResources',
              mockToolInputs.listMcpResources({ server: 'unavailable-server' }),
              'Error: MCP server not available'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const ResourceServers: Story = {
  args: {
    execution: mockToolExecutions.pending('ListMcpResources', mockToolInputs.listMcpResources())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同资源服务器</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">文件系统服务器</h4>
          <ListMcpResourcesTool
            execution={mockToolExecutions.pending('ListMcpResources', mockToolInputs.listMcpResources({
              server: 'filesystem-server'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">数据库服务器</h4>
          <ListMcpResourcesTool
            execution={mockToolExecutions.pending('ListMcpResources', mockToolInputs.listMcpResources({
              server: 'database-server'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">缓存服务器</h4>
          <ListMcpResourcesTool
            execution={mockToolExecutions.pending('ListMcpResources', mockToolInputs.listMcpResources({
              server: 'cache-server'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">API 服务器</h4>
          <ListMcpResourcesTool
            execution={mockToolExecutions.pending('ListMcpResources', mockToolInputs.listMcpResources({
              server: 'api-server'
            }))}
          />
        </div>
      </div>
    </div>
  )
};
