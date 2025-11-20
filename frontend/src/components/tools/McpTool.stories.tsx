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
  }
};

export const McpStates1: Story = {
  args: {
    execution: mockToolExecutions.success(
              'Mcp',
              mockToolInputs.mcp(),
              'MCP tool executed successfully'
            )
  }
};

export const McpOperations: Story = {
  args: {
    execution: mockToolExecutions.pending('Mcp', mockToolInputs.mcp())
  }
};
