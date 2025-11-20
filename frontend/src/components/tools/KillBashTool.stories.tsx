import type { Meta, StoryObj } from '@storybook/react';
import { KillBashTool } from './KillBashTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/KillBashTool',
  component: KillBashTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'KillBashTool 用于终止后台运行的 Bash 进程，支持强制终止多个进程。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof KillBashTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 等待终止状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('KillBash', mockToolInputs.killShell())
  }
};

// 终止中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('KillBash', mockToolInputs.killShell({
      shell_id: 'bash-12345'
    }))
  }
};

// 终止成功状态
export const Success: Story = {
  args: {
    execution: mockToolExecutions.success(
      'KillBash',
      mockToolInputs.killShell(),
      'Successfully terminated process bash-12345'
    )
  }
};

// 进程不存在
export const ProcessNotFound: Story = {
  args: {
    execution: mockToolExecutions.error(
      'KillBash',
      mockToolInputs.killShell({ shell_id: 'nonexistent-process' }),
      'Error: Process not found or already terminated'
    )
  }
};

export const KillDevServer: Story = {
  args: {
    execution: mockToolExecutions.pending('KillBash', mockToolInputs.killShell({
      shell_id: 'dev-server-abc123'
    }))
  }
};

export const KillBackgroundTask: Story = {
  args: {
    execution: mockToolExecutions.pending('KillBash', mockToolInputs.killShell({
      shell_id: 'background-task-def456'
    }))
  }
};

export const KillBuildProcess: Story = {
  args: {
    execution: mockToolExecutions.pending('KillBash', mockToolInputs.killShell({
      shell_id: 'build-process-ghi789'
    }))
  }
};

export const KillTestRunner: Story = {
  args: {
    execution: mockToolExecutions.pending('KillBash', mockToolInputs.killShell({
      shell_id: 'test-runner-jkl012'
    }))
  }
};
