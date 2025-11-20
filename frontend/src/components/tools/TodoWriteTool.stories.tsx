import type { Meta, StoryObj } from '@storybook/react';
import { TodoWriteTool } from './TodoWriteTool';
import { mockToolExecutions, mockToolInputs, mockResults } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/TodoWriteTool',
  component: TodoWriteTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'TodoWriteTool 用于创建和管理任务列表，支持不同的任务状态和进度跟踪。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof TodoWriteTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TodoStates: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">任务管理状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待执行</h4>
          <TodoWriteTool
            execution={mockToolExecutions.pending('TodoWrite', mockToolInputs.todoWrite())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行中</h4>
          <TodoWriteTool
            execution={mockToolExecutions.executing('TodoWrite', mockToolInputs.todoWrite({
              todos: [
                { content: 'Setting up development environment', status: 'pending', activeForm: 'Will set up environment' },
                { content: 'Writing tests', status: 'in_progress', activeForm: 'Currently writing unit tests' }
              ]
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行成功</h4>
          <TodoWriteTool
            execution={mockToolExecutions.success(
              'TodoWrite',
              mockToolInputs.todoWrite(),
              mockResults.todoWrite.result
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行失败</h4>
          <TodoWriteTool
            execution={mockToolExecutions.error(
              'TodoWrite',
              mockToolInputs.todoWrite(),
              'Error: Invalid task format'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const TaskScenarios: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同任务场景</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">开发流程任务</h4>
          <TodoWriteTool
            execution={mockToolExecutions.pending('TodoWrite', mockToolInputs.todoWrite({
              todos: [
                { content: 'Set up project structure', status: 'completed', activeForm: 'Project structure set up' },
                { content: 'Install dependencies', status: 'completed', activeForm: 'Dependencies installed' },
                { content: 'Write initial code', status: 'in_progress', activeForm: 'Currently writing the main component' },
                { content: 'Run tests', status: 'pending', activeForm: 'Will run unit tests' },
                { content: 'Deploy application', status: 'pending', activeForm: 'Will deploy to staging' }
              ]
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">分析任务</h4>
          <TodoWriteTool
            execution={mockToolExecutions.pending('TodoWrite', mockToolInputs.todoWrite({
              todos: [
                { content: 'Analyze project structure', status: 'pending', activeForm: 'Will analyze codebase' },
                { content: 'Review component architecture', status: 'pending', activeForm: 'Will review component patterns' },
                { content: 'Identify optimization opportunities', status: 'pending', activeForm: 'Will find performance improvements' }
              ]
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">文档编写任务</h4>
          <TodoWriteTool
            execution={mockToolExecutions.pending('TodoWrite', mockToolInputs.todoWrite({
              todos: [
                { content: 'Write API documentation', status: 'in_progress', activeForm: 'Currently documenting endpoints' },
                { content: 'Create user guide', status: 'pending', activeForm: 'Will create user manual' },
                { content: 'Add code examples', status: 'pending', activeForm: 'Will add usage examples' }
              ]
            }))}
          />
        </div>
      </div>
    </div>
  )
};
