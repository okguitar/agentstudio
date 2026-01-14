import type { Meta, StoryObj } from '@storybook/react';
import { ExitPlanModeTool } from './ExitPlanModeTool';
import { mockToolExecutions } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/ExitPlanModeTool',
  component: ExitPlanModeTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ExitPlanModeTool 用于退出规划模式并进入执行阶段。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof ExitPlanModeTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExitStates: Story = {
  args: {
    execution: mockToolExecutions.pending('ExitPlanMode', {})
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">退出规划模式状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待退出</h4>
          <ExitPlanModeTool
            execution={mockToolExecutions.pending('ExitPlanMode', {})}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">退出中</h4>
          <ExitPlanModeTool
            execution={mockToolExecutions.executing('ExitPlanMode', {})}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">退出成功</h4>
          <ExitPlanModeTool
            execution={mockToolExecutions.success(
              'ExitPlanMode',
              {},
              'Successfully exited planning mode. Ready to execute!'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">退出失败</h4>
          <ExitPlanModeTool
            execution={mockToolExecutions.error(
              'ExitPlanMode',
              {},
              'Error: Failed to exit planning mode'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const ExitScenarios: Story = {
  args: {
    execution: mockToolExecutions.pending('ExitPlanMode', {})
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同退出场景</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">项目开发规划完成</h4>
          <ExitPlanModeTool
            execution={mockToolExecutions.pending('ExitPlanMode', {
              plan_summary: '完成项目架构设计和开发计划制定'
            })}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">重构方案确定</h4>
          <ExitPlanModeTool
            execution={mockToolExecutions.pending('ExitPlanMode', {
              plan_summary: '确定代码重构策略和实施步骤'
            })}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">功能设计完成</h4>
          <ExitPlanModeTool
            execution={mockToolExecutions.pending('ExitPlanMode', {
              plan_summary: '新功能的技术方案和实现计划已制定'
            })}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">Bug 修复策略</h4>
          <ExitPlanModeTool
            execution={mockToolExecutions.pending('ExitPlanMode', {
              plan_summary: '问题诊断和修复方案已确定'
            })}
          />
        </div>
      </div>
    </div>
  )
};
