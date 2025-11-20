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
    execution: mockToolExecutions.executing('ListMcpResourcesTool', mockToolInputs.mcp())
  }
};
