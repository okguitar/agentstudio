import type { Meta, StoryObj } from '@storybook/react';
import { TimeMachineTool } from './TimeMachineTool';
import { mockToolExecutions, mockToolInputs, mockResults } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/TimeMachineTool',
  component: TimeMachineTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'TimeMachineTool 用于时间回溯功能，允许回到之前的对话状态并进行修正。'
      }
    }
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TimeMachineTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础时间机器示例
export const BasicTimeMachine: Story = {
  args: {
    execution: mockToolExecutions.pending('TimeMachine', mockToolInputs.timeMachine())
  },
  render: () => (
    <TimeMachineTool
      execution={mockToolExecutions.success(
        'TimeMachine',
        mockToolInputs.timeMachine({
          message_prefix: '让我尝试一个不同的方法',
          course_correction: '使用我们讨论过的更高效的算法',
          restore_code: true
        }),
        mockResults.timeMachine.result
      )}
    />
  )
};

// 不同的消息前缀
export const DifferentMessagePrefixes: Story = {
  args: {
    execution: mockToolExecutions.pending('TimeMachine', mockToolInputs.timeMachine())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同的消息前缀</h3>

      <div className="space-y-4">
        <TimeMachineTool
          execution={mockToolExecutions.executing(
            'TimeMachine',
            mockToolInputs.timeMachine({
              message_prefix: '让我重新思考这个问题',
              course_correction: '从另一个角度分析需求',
              restore_code: false
            })
          )}
        />

        <TimeMachineTool
          execution={mockToolExecutions.executing(
            'TimeMachine',
            mockToolInputs.timeMachine({
              message_prefix: '我注意到之前的方案有问题',
              course_correction: '修正之前的架构设计错误',
              restore_code: true
            })
          )}
        />

        <TimeMachineTool
          execution={mockToolExecutions.executing(
            'TimeMachine',
            mockToolInputs.timeMachine({
              message_prefix: '基于新的理解，让我们重新开始',
              course_correction: '采用模块化设计来提高可维护性',
              restore_code: true
            })
          )}
        />
      </div>
    </div>
  )
};

// 不同状态
export const DifferentStates: Story = {
  args: {
    execution: mockToolExecutions.pending('TimeMachine', mockToolInputs.timeMachine())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同执行状态</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待执行</h4>
          <TimeMachineTool
            execution={mockToolExecutions.pending(
              'TimeMachine',
              mockToolInputs.timeMachine({
                message_prefix: '准备回溯到之前的状态',
                course_correction: '修正实现方案',
                restore_code: true
              })
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">正在回溯</h4>
          <TimeMachineTool
            execution={mockToolExecutions.executing(
              'TimeMachine',
              mockToolInputs.timeMachine({
                message_prefix: '正在返回到之前的对话点',
                course_correction: '应用修正建议',
                restore_code: false
              })
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">回溯成功</h4>
          <TimeMachineTool
            execution={mockToolExecutions.success(
              'TimeMachine',
              mockToolInputs.timeMachine({
                message_prefix: '成功回到之前的状态',
                course_correction: '应用了优化的算法实现',
                restore_code: true
              }),
              '时间机器成功回溯到指定消息，修正已应用'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">回溯失败</h4>
          <TimeMachineTool
            execution={mockToolExecutions.error(
              'TimeMachine',
              mockToolInputs.timeMachine({
                message_prefix: '尝试回溯',
                course_correction: '修正错误',
                restore_code: true
              }),
              '无法找到指定的回溯点'
            )}
          />
        </div>
      </div>
    </div>
  )
};

// 代码恢复选项
export const CodeRestoreOptions: Story = {
  args: {
    execution: mockToolExecutions.pending('TimeMachine', mockToolInputs.timeMachine())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">代码恢复选项</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">启用代码恢复</h4>
          <TimeMachineTool
            execution={mockToolExecutions.success(
              'TimeMachine',
              mockToolInputs.timeMachine({
                message_prefix: '回到之前的实现版本',
                course_correction: '恢复原始代码并应用改进',
                restore_code: true
              }),
              '代码已恢复到之前版本，改进已应用'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">禁用代码恢复</h4>
          <TimeMachineTool
            execution={mockToolExecutions.success(
              'TimeMachine',
              mockToolInputs.timeMachine({
                message_prefix: '重新开始设计',
                course_correction: '采用新的架构方法',
                restore_code: false
              }),
              '已重新开始设计，未恢复代码'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">未指定恢复选项</h4>
          <TimeMachineTool
            execution={mockToolExecutions.success(
              'TimeMachine',
              mockToolInputs.timeMachine({
                message_prefix: '回到讨论起点',
                course_correction: '重新评估需求',
                // restore_code 未指定
              }),
              '已回到讨论起点，代码状态保持不变'
            )}
          />
        </div>
      </div>
    </div>
  )
};

// 长消息示例
export const LongMessages: Story = {
  args: {
    execution: mockToolExecutions.pending('TimeMachine', mockToolInputs.timeMachine())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">长消息处理</h3>

      <div className="space-y-4">
        <TimeMachineTool
          execution={mockToolExecutions.executing(
            'TimeMachine',
            mockToolInputs.timeMachine({
              message_prefix: '我意识到之前的实现方案存在严重的性能问题，特别是在处理大规模数据时会出现内存泄漏和响应时间过长的情况。让我重新设计一个更高效的解决方案。',
              course_correction: '采用流式处理和分页加载来优化内存使用，同时实现异步处理来提高响应速度',
              restore_code: true
            })
          )}
        />

        <TimeMachineTool
          execution={mockToolExecutions.executing(
            'TimeMachine',
            mockToolInputs.timeMachine({
              message_prefix: '在重新审视需求文档后，我发现我们对用户需求的理解有偏差。需要重新考虑整个用户体验流程',
              course_correction: '重新设计用户界面流程，确保符合实际使用场景和用户习惯',
              restore_code: false
            })
          )}
        />
      </div>
    </div>
  )
};