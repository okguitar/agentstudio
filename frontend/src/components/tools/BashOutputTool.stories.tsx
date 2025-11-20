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

export const BasicOutput: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Bash 输出显示</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">成功输出</h4>
          <BashOutputTool
            execution={mockToolExecutions.bashOutput(
              { bash_id: 'shell-123' },
              {
                status: 'completed',
                exit_code: 0,
                stdout: 'Build completed successfully!\nAll tests passed.',
                stderr: '',
                timestamp: new Date().toISOString()
              }
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">错误输出</h4>
          <BashOutputTool
            execution={mockToolExecutions.bashOutput(
              { bash_id: 'shell-456' },
              {
                status: 'completed',
                exit_code: 1,
                stdout: '',
                stderr: 'Error: Module not found\n  at require (internal/modules/cjs/loader.js:892:15)',
                timestamp: new Date().toISOString()
              }
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">运行中</h4>
          <BashOutputTool
            execution={mockToolExecutions.bashOutput(
              { bash_id: 'shell-789' },
              {
                status: 'running',
                exit_code: null,
                stdout: 'Starting development server...\nCompiling...',
                stderr: '',
                timestamp: new Date().toISOString()
              }
            )}
          />
        </div>
      </div>
    </div>
  )
};
