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

export const KillStates: Story = {
  args: {
    execution: mockToolExecutions.pending('KillBash', mockToolInputs.killShell())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">进程终止状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待终止</h4>
          <KillBashTool
            execution={mockToolExecutions.pending('KillBash', mockToolInputs.killShell())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">终止中</h4>
          <KillBashTool
            execution={mockToolExecutions.executing('KillBash', mockToolInputs.killShell({
              shell_id: 'bash-12345'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">终止成功</h4>
          <KillBashTool
            execution={mockToolExecutions.success(
              'KillBash',
              mockToolInputs.killShell(),
              'Successfully terminated process bash-12345'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">进程不存在</h4>
          <KillBashTool
            execution={mockToolExecutions.error(
              'KillBash',
              mockToolInputs.killShell({ shell_id: 'nonexistent-process' }),
              'Error: Process not found or already terminated'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const TerminationScenarios: Story = {
  args: {
    execution: mockToolExecutions.pending('KillBash', mockToolInputs.killShell())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同终止场景</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">终止开发服务器</h4>
          <KillBashTool
            execution={mockToolExecutions.pending('KillBash', mockToolInputs.killShell({
              shell_id: 'dev-server-abc123'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">终止后台任务</h4>
          <KillBashTool
            execution={mockToolExecutions.pending('KillBash', mockToolInputs.killShell({
              shell_id: 'background-task-def456'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">终止构建进程</h4>
          <KillBashTool
            execution={mockToolExecutions.pending('KillBash', mockToolInputs.killShell({
              shell_id: 'build-process-ghi789'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">终止测试进程</h4>
          <KillBashTool
            execution={mockToolExecutions.pending('KillBash', mockToolInputs.killShell({
              shell_id: 'test-runner-jkl012'
            }))}
          />
        </div>
      </div>
    </div>
  )
};
