import type { Meta, StoryObj } from '@storybook/react';
import { TaskTool } from './TaskTool';
import { mockToolExecutions, mockToolInputs, mockTaskToolResults, mockSubAgentMessageFlow } from './__mocks__/toolTestData';
import type { BaseToolExecution } from './sdk-types';

const meta = {
  title: 'Tools/TaskTool',
  component: TaskTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'TaskTool (Agent Tool) 用于启动和管理 AI 子代理，支持不同的代理类型和模型。支持显示完整的子代理消息流，包括文本、思考过程和工具调用。'
      }
    }
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TaskTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 创建带有子Agent消息流的执行结果
const createTaskWithSubAgentFlow = (
  input: any,
  result: any,
  isExecuting = false
): BaseToolExecution => ({
  id: 'task-with-subagent-' + Date.now(),
  toolName: 'Task',
  toolInput: input,
  toolResult: result?.content?.[0]?.text || '',
  toolUseResult: result,
  isExecuting,
  isError: result?.status === 'failed',
  timestamp: new Date()
});

// 基础用例：不同代理类型
export const DifferentAgentTypes: Story = {
  args: {
    execution: mockToolExecutions.pending('Task', mockToolInputs.agent())
  },
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
  args: {
    execution: mockToolExecutions.pending('Task', mockToolInputs.agent())
  },
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

// 执行状态
export const ExecutionStates: Story = {
  args: {
    execution: mockToolExecutions.pending('Task', mockToolInputs.agent())
  },
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

// ==================== 子Agent消息流场景 ====================

// 带有完整消息流的任务
export const WithSubAgentMessageFlow: Story = {
  name: '子Agent消息流（完整）',
  args: {
    execution: createTaskWithSubAgentFlow(
      mockToolInputs.agent({
        subagent_type: 'code-reviewer',
        description: 'Perform code review',
        prompt: 'Please perform a comprehensive code review of the current codebase. Check for code quality, security issues, and best practices.',
        model: 'sonnet'
      }),
      mockTaskToolResults.completed()
    )
  },
  parameters: {
    docs: {
      description: {
        story: '展示完成的Task任务，包含完整的子Agent消息流：任务输入、文本响应、思考过程和工具调用。点击展开可查看详细内容。'
      }
    }
  }
};

// 无工具调用的任务
export const NoSubAgentTools: Story = {
  name: '无工具调用的任务',
  args: {
    execution: createTaskWithSubAgentFlow(
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '简单问答任务',
        prompt: '回答一个简单的问题',
        model: 'haiku'
      }),
      mockTaskToolResults.noTools()
    )
  },
  parameters: {
    docs: {
      description: {
        story: '展示没有工具调用的Task任务。这种情况下不会显示子Agent消息流。'
      }
    }
  }
};

// 失败的任务
export const FailedTask: Story = {
  name: '失败的任务',
  args: {
    execution: createTaskWithSubAgentFlow(
      mockToolInputs.agent({
        subagent_type: 'general-purpose',
        description: '执行复杂分析',
        prompt: '执行一个非常复杂的分析任务',
        model: 'sonnet'
      }),
      mockTaskToolResults.failed()
    )
  },
  parameters: {
    docs: {
      description: {
        story: '展示失败的Task任务，显示错误状态和统计信息。'
      }
    }
  }
};

// 取消的任务
export const CancelledTask: Story = {
  name: '取消的任务',
  args: {
    execution: createTaskWithSubAgentFlow(
      mockToolInputs.agent({
        subagent_type: 'code-reviewer',
        description: '代码审查（已取消）',
        prompt: '审查代码',
        model: 'sonnet'
      }),
      mockTaskToolResults.cancelled()
    )
  },
  parameters: {
    docs: {
      description: {
        story: '展示被用户取消的Task任务。'
      }
    }
  }
};

// 包含错误的子Agent消息流
export const SubAgentWithErrors: Story = {
  name: '子Agent消息流（含错误）',
  args: {
    execution: createTaskWithSubAgentFlow(
      mockToolInputs.agent({
        subagent_type: 'code-reviewer',
        description: '代码审查（部分错误）',
        prompt: '审查代码库中的文件',
        model: 'sonnet'
      }),
      mockTaskToolResults.withErrors()
    )
  },
  parameters: {
    docs: {
      description: {
        story: '展示包含部分失败工具调用的Task任务消息流。某些工具调用可能因为文件不存在等原因失败。'
      }
    }
  }
};

// 所有状态对比
export const AllStatesComparison: Story = {
  name: '所有状态对比',
  args: {
    execution: mockToolExecutions.pending('Task', mockToolInputs.agent())
  },
  render: () => (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold mb-4">Task工具所有状态对比</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">✅ 成功完成（有消息流）</h4>
          <TaskTool
            execution={createTaskWithSubAgentFlow(
              mockToolInputs.agent({
                subagent_type: 'code-reviewer',
                description: '代码审查完成',
                prompt: '执行代码审查',
                model: 'sonnet'
              }),
              mockTaskToolResults.completed()
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">✅ 成功完成（无消息流）</h4>
          <TaskTool
            execution={createTaskWithSubAgentFlow(
              mockToolInputs.agent({
                subagent_type: 'general-purpose',
                description: '简单任务',
                prompt: '回答问题',
                model: 'haiku'
              }),
              mockTaskToolResults.noTools()
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">❌ 执行失败</h4>
          <TaskTool
            execution={createTaskWithSubAgentFlow(
              mockToolInputs.agent({
                subagent_type: 'general-purpose',
                description: '失败的任务',
                prompt: '复杂分析',
                model: 'sonnet'
              }),
              mockTaskToolResults.failed()
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">⚠️ 已取消</h4>
          <TaskTool
            execution={createTaskWithSubAgentFlow(
              mockToolInputs.agent({
                subagent_type: 'code-reviewer',
                description: '取消的任务',
                prompt: '代码审查',
                model: 'sonnet'
              }),
              mockTaskToolResults.cancelled()
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">⚠️ 部分错误</h4>
          <TaskTool
            execution={createTaskWithSubAgentFlow(
              mockToolInputs.agent({
                subagent_type: 'code-reviewer',
                description: '部分错误的任务',
                prompt: '审查代码',
                model: 'sonnet'
              }),
              mockTaskToolResults.withErrors()
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">🔄 执行中</h4>
          <TaskTool
            execution={mockToolExecutions.executing(
              'Task',
              mockToolInputs.agent({
                subagent_type: 'code-reviewer',
                description: '正在执行',
                prompt: '代码审查中...',
                model: 'opus'
              })
            )}
          />
        </div>
      </div>
    </div>
  )
};

// 真实场景模拟
export const RealWorldScenario: Story = {
  name: '真实场景：代码审查完整流程',
  args: {
    execution: createTaskWithSubAgentFlow(
      mockToolInputs.agent({
        subagent_type: 'code-reviewer',
        description: 'Perform code review',
        prompt: `Please perform a comprehensive code review of the current codebase. Analyze the code for:

1. **Code Quality**: Check for clean code principles, readability, maintainability
2. **Security**: Identify potential security vulnerabilities, OWASP top 10 issues
3. **Best Practices**: Verify adherence to language-specific best practices
4. **Architecture**: Assess overall code structure, separation of concerns
5. **Performance**: Identify potential performance bottlenecks

Please provide specific issues with file locations and severity levels.`,
        model: 'opus'
      }),
      {
        status: 'completed',
        prompt: 'Code review prompt...',
        agentId: '6d16b542',
        content: [{ type: 'text', text: '# Comprehensive Code Review - Jeff Marketplace\n\n**Overall Grade: A- (85/100)**\n\n## Key Findings:\n- Exceptional architecture\n- Strong security practices\n- Outstanding documentation\n\n## Issues:\n- Missing input validation\n- Generic exception handling\n- No unit tests' }],
        totalDurationMs: 84305,
        totalTokens: 33352,
        totalToolUseCount: 14,
        usage: {
          input_tokens: 3149,
          output_tokens: 1787,
          cache_read_input_tokens: 28416
        },
        subAgentMessageFlow: mockSubAgentMessageFlow
      }
    )
  },
  parameters: {
    docs: {
      description: {
        story: '模拟真实的代码审查场景，展示完整的任务描述、统计信息和子Agent消息流（含任务输入、文本响应、思考过程、工具调用）。'
      }
    }
  }
};
