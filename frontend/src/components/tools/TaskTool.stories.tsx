import type { Meta, StoryObj } from '@storybook/react';
import { TaskTool } from './TaskTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/TaskTool',
  component: TaskTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'TaskTool (Agent Tool) 用于启动和管理 AI 子代理，支持不同的代理类型和模型。'
      }
    }
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TaskTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 不同代理类型
export const GeneralPurposeAgent: Story = {
  args: {
    execution: mockToolExecutions.executing(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '分析项目结构',
        prompt: '请分析这个项目的整体架构和组件组织',
        model: 'sonnet'
      })
    )
  }
};

export const CodeReviewerAgent: Story = {
  args: {
    execution: mockToolExecutions.executing(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'code-reviewer',
        description: '代码审查',
        prompt: '请审查这段代码的质量和安全性',
        model: 'opus'
      })
    )
  }
};

export const UnitTestWriterAgent: Story = {
  args: {
    execution: mockToolExecutions.executing(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'unit-test-writer',
        description: '编写单元测试',
        prompt: '请为这个组件编写全面的单元测试',
        model: 'sonnet'
      })
    )
  }
};

// 不同模型选择
export const HaikuModel: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '快速分析',
        prompt: '快速分析这个组件的功能',
        model: 'haiku'
      }),
      '分析完成：这是一个用于展示工具执行状态的组件'
    )
  }
};

export const SonnetModel: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '深度分析',
        prompt: '深入分析这个项目的架构和最佳实践',
        model: 'sonnet'
      }),
      '深度分析完成：项目采用了现代的 React 架构，使用 TypeScript 和 TailwindCSS'
    )
  }
};

export const OpusModel: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '复杂问题解决',
        prompt: '解决这个复杂的架构问题',
        model: 'opus'
      }),
      '问题解决完成：建议采用微服务架构以提高系统可扩展性'
    )
  }
};

// 恢复功能
export const ResumeExecuting: Story = {
  args: {
    execution: mockToolExecutions.executing(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '继续之前的分析',
        prompt: '继续分析用户权限系统',
        model: 'sonnet',
        resume: 'agent-abc-123'
      })
    )
  }
};

export const ResumeCompleted: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '恢复的分析任务',
        prompt: '完成权限系统的剩余分析',
        model: 'sonnet',
        resume: 'agent-def-456'
      }),
      '分析任务已成功完成，恢复了之前的进度并生成了完整的报告'
    )
  }
};

// 不同执行状态
export const PendingState: Story = {
  args: {
    execution: mockToolExecutions.pending(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '待执行的分析任务',
        prompt: '准备开始项目分析',
        model: 'sonnet'
      })
    )
  }
};

export const ExecutingState: Story = {
  args: {
    execution: mockToolExecutions.executing(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'code-reviewer',
        description: '正在审查代码',
        prompt: '检查代码质量和安全性',
        model: 'opus'
      })
    )
  }
};

export const CompletedState: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'unit-test-writer',
        description: '测试编写完成',
        prompt: '为组件编写单元测试',
        model: 'sonnet'
      }),
      '成功编写了 15 个单元测试，覆盖率达到 95%'
    )
  }
};

export const FailedState: Story = {
  args: {
    execution: mockToolExecutions.error(
      'Task',
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '失败的任务',
        prompt: '执行复杂分析',
        model: 'sonnet'
      }),
      '分析超时，请尝试简化任务要求'
    )
  }
};