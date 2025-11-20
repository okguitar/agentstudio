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
export const DifferentAgentTypes: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同代理类型</h3>

      <div className="space-y-4">
        <TaskTool
          execution={mockToolExecutions.executing(
            'Task',
            mockToolInputs.agent({
              subagent_type: 'general-purpose',
              description: '分析项目结构',
              prompt: '请分析这个项目的整体架构和组件组织',
              model: 'sonnet'
            })
          )}
        />

        <TaskTool
          execution={mockToolExecutions.executing(
            'Task',
            mockToolInputs.agent({
              subagent_type: 'code-reviewer',
              description: '代码审查',
              prompt: '请审查这段代码的质量和安全性',
              model: 'opus'
            })
          )}
        />

        <TaskTool
          execution={mockToolExecutions.executing(
            'Task',
            mockToolInputs.agent({
              subagent_type: 'unit-test-writer',
              description: '编写单元测试',
              prompt: '请为这个组件编写全面的单元测试',
              model: 'sonnet'
            })
          )}
        />
      </div>
    </div>
  )
};

// 不同模型选择
export const DifferentModels: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同模型选择</h3>

      <div className="space-y-4">
        <TaskTool
          execution={mockToolExecutions.success(
            'Task',
            mockToolInputs.agent({
              subagent_type: 'general-purpose',
              description: '快速分析',
              prompt: '快速分析这个组件的功能',
              model: 'haiku'
            }),
            '分析完成：这是一个用于展示工具执行状态的组件'
          )}
        />

        <TaskTool
          execution={mockToolExecutions.success(
            'Task',
            mockToolInputs.agent({
              subagent_type: 'general-purpose',
              description: '深度分析',
              prompt: '深入分析这个项目的架构和最佳实践',
              model: 'sonnet'
            }),
            '深度分析完成：项目采用了现代的 React 架构，使用 TypeScript 和 TailwindCSS'
          )}
        />

        <TaskTool
          execution={mockToolExecutions.success(
            'Task',
            mockToolInputs.agent({
              subagent_type: 'general-purpose',
              description: '复杂问题解决',
              prompt: '解决这个复杂的架构问题',
              model: 'opus'
            }),
            '问题解决完成：建议采用微服务架构以提高系统可扩展性'
          )}
        />
      </div>
    </div>
  )
};

// 恢复功能
export const ResumeFunctionality: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">恢复功能</h3>

      <div className="space-y-4">
        <TaskTool
          execution={mockToolExecutions.executing(
            'Task',
            mockToolInputs.agent({
              subagent_type: 'general-purpose',
              description: '继续之前的分析',
              prompt: '继续分析用户权限系统',
              model: 'sonnet',
              resume: 'agent-abc-123'
            })
          )}
        />

        <TaskTool
          execution={mockToolExecutions.success(
            'Task',
            mockToolInputs.agent({
              subagent_type: 'general-purpose',
              description: '恢复的分析任务',
              prompt: '完成权限系统的剩余分析',
              model: 'sonnet',
              resume: 'agent-def-456'
            }),
            '分析任务已成功完成，恢复了之前的进度并生成了完整的报告'
          )}
        />
      </div>
    </div>
  )
};

// 不同执行状态
export const ExecutionStates: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">执行状态</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待状态</h4>
          <TaskTool
            execution={mockToolExecutions.pending(
              'Task',
              mockToolInputs.agent({
                subagent_type: 'general-purpose',
                description: '待执行的分析任务',
                prompt: '准备开始项目分析',
                model: 'sonnet'
              })
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行中</h4>
          <TaskTool
            execution={mockToolExecutions.executing(
              'Task',
              mockToolInputs.agent({
                subagent_type: 'code-reviewer',
                description: '正在审查代码',
                prompt: '检查代码质量和安全性',
                model: 'opus'
              })
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">成功完成</h4>
          <TaskTool
            execution={mockToolExecutions.success(
              'Task',
              mockToolInputs.agent({
                subagent_type: 'unit-test-writer',
                description: '测试编写完成',
                prompt: '为组件编写单元测试',
                model: 'sonnet'
              }),
              '成功编写了 15 个单元测试，覆盖率达到 95%'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行失败</h4>
          <TaskTool
            execution={mockToolExecutions.error(
              'Task',
              mockToolInputs.agent({
                subagent_type: 'general-purpose',
                description: '失败的任务',
                prompt: '执行复杂分析',
                model: 'sonnet'
              }),
              '分析超时，请尝试简化任务要求'
            )}
          />
        </div>
      </div>
    </div>
  )
};