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

// 等待退出状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('ExitPlanMode', {})
  }
};

// 退出中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('ExitPlanMode', {})
  }
};

// 退出成功状态
export const Success: Story = {
  args: {
    execution: mockToolExecutions.success(
      'ExitPlanMode',
      {},
      'Successfully exited planning mode. Ready to execute!'
    )
  }
};

// 退出失败状态
export const Error: Story = {
  args: {
    execution: mockToolExecutions.error(
      'ExitPlanMode',
      {},
      'Error: Failed to exit planning mode'
    )
  }
};

// 项目开发规划完成
export const ProjectPlanning: Story = {
  args: {
    execution: mockToolExecutions.pending('ExitPlanMode', {
      plan_summary: '完成项目架构设计和开发计划制定'
    })
  }
};

// 重构方案确定
export const RefactoringPlan: Story = {
  args: {
    execution: mockToolExecutions.pending('ExitPlanMode', {
      plan_summary: '确定代码重构策略和实施步骤'
    })
  }
};

// 功能设计完成
export const FeatureDesign: Story = {
  args: {
    execution: mockToolExecutions.pending('ExitPlanMode', {
      plan_summary: '新功能的技术方案和实现计划已制定'
    })
  }
};

// Bug 修复策略
export const BugFixStrategy: Story = {
  args: {
    execution: mockToolExecutions.pending('ExitPlanMode', {
      plan_summary: '问题诊断和修复方案已确定'
    })
  }
};
