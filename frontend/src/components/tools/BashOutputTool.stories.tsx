import type { Meta, StoryObj } from '@storybook/react';
import { BashOutputTool } from './BashOutputTool';
import { mockToolExecutions } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/BashOutputTool',
  component: BashOutputTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'BashOutputTool 用于显示后台 Bash 进程的输出结果。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof BashOutputTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 成功输出
export const Success: Story = {
  args: {
    execution: mockToolExecutions.bashOutput(
      { bash_id: 'shell-123' },
      {
        shellId: 'shell-123',
        command: 'npm run build',
        status: 'completed',
        exitCode: 0,
        stdout: 'Build completed successfully!\nAll tests passed.',
        stderr: '',
        stdoutLines: 2,
        stderrLines: 0,
        timestamp: new Date().toISOString()
      }
    )
  }
};

// 错误输出
export const Error: Story = {
  args: {
    execution: mockToolExecutions.bashOutput(
      { bash_id: 'shell-456' },
      {
        shellId: 'shell-456',
        command: 'npm run invalid',
        status: 'completed',
        exitCode: 1,
        stdout: '',
        stderr: 'Error: Module not found\n  at require (internal/modules/cjs/loader.js:892:15)',
        stdoutLines: 0,
        stderrLines: 2,
        timestamp: new Date().toISOString()
      }
    )
  }
};

// 运行中
export const Running: Story = {
  args: {
    execution: mockToolExecutions.bashOutput(
      { bash_id: 'shell-789' },
      {
        shellId: 'shell-789',
        command: 'npm run dev',
        status: 'running',
        exitCode: null,
        stdout: 'Starting development server...\nCompiling...',
        stderr: '',
        stdoutLines: 2,
        stderrLines: 0,
        timestamp: new Date().toISOString()
      }
    )
  }
};
