import type { Meta, StoryObj } from '@storybook/react';
import { BashTool } from './BashTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/BashTool',
  component: BashTool,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BashTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础示例
export const Default: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Bash',
      mockToolInputs.bash({
        command: 'ls -la',
        description: 'List directory contents'
      })
    )
  },
};

// 执行中示例
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing(
      'Bash',
      mockToolInputs.bash({
        command: 'npm install',
        description: 'Installing dependencies'
      })
    )
  },
};

// 错误示例
export const Error: Story = {
  args: {
    execution: mockToolExecutions.error(
      'Bash',
      mockToolInputs.bash({
        command: 'invalid-command',
        description: 'This will fail'
      }),
      'Command not found: invalid-command'
    )
  },
};