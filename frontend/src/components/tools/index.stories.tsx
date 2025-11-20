import type { Meta, StoryObj } from '@storybook/react';
import { ToolRenderer } from './ToolRenderer';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/Overview',
  component: ToolRenderer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        story: '工具组件渲染器 - 支持所有类型的工具执行可视化'
      }
    }
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ToolRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Bash 工具示例
export const BashExample: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Bash',
      mockToolInputs.bash({
        command: 'echo "Hello World"',
        description: '输出 Hello World'
      }),
      'Hello World\n'
    )
  },
};

// Read 工具示例
export const ReadExample: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Read',
      mockToolInputs.fileRead({
        file_path: '/path/to/file.txt'
      }),
      'File content here...'
    )
  },
};

// AskUserQuestion 工具示例
export const QuestionExample: Story = {
  args: {
    execution: mockToolExecutions.success(
      'AskUserQuestion',
      mockToolInputs.askUserQuestion({
        questions: [
          {
            question: '您想继续吗？',
            header: '确认操作',
            options: [
              { label: '是', description: '继续执行' },
              { label: '否', description: '停止执行' }
            ],
            multiSelect: false
          }
        ]
      })
    )
  },
};