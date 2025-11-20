import type { Meta, StoryObj } from '@storybook/react';
import { TodoWriteTool } from './TodoWriteTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/TodoWriteTool',
  component: TodoWriteTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'TodoWriteTool 用于创建和管理任务列表，支持不同的任务状态和进度跟踪。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof TodoWriteTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TodoStates: Story = {
  args: {
    execution: mockToolExecutions.executing('TodoWriteTool', mockToolInputs.fileEdit())
  }
};
