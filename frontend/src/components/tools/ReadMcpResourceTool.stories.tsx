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
    execution: mockToolExecutions.executing('ReadMcpResourceTool', mockToolInputs.fileRead())
  }
};
