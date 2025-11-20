import type { Meta, StoryObj } from '@storybook/react';
import { LSTool } from './LSTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/LSTool',
  component: LSTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'LSTool 用于列出目录内容，支持文件过滤和排除特定目录。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof LSTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LSStates: Story = {
  args: {
    execution: mockToolExecutions.pending('LS', mockToolInputs.lsTool())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">目录列表状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待列表</h4>
          <LSTool
            execution={mockToolExecutions.pending('LS', mockToolInputs.lsTool())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">列表中</h4>
          <LSTool
            execution={mockToolExecutions.executing('LS', mockToolInputs.lsTool({
              path: '/Users/kongjie/slides/ai-editor/src'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">列表成功</h4>
          <LSTool
            execution={mockToolExecutions.success(
              'LS',
              mockToolInputs.lsTool(),
              `📁 components/
📁 hooks/
📁 pages/
📁 stores/
📁 styles/
📁 utils/
📁 types/
📄 App.tsx
📄 main.tsx
📄 index.css`
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">目录不存在</h4>
          <LSTool
            execution={mockToolExecutions.error(
              'LS',
              mockToolInputs.lsTool({ path: '/nonexistent/directory' }),
              'Error: Directory not found'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const ListOptions: Story = {
  args: {
    execution: mockToolExecutions.pending('LS', mockToolInputs.lsTool())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同列表选项</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">项目根目录</h4>
          <LSTool
            execution={mockToolExecutions.pending('LS', mockToolInputs.lsTool({
              path: '/Users/kongjie/slides/ai-editor',
              ignore: ['node_modules', '.git', 'dist', '.next']
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">组件目录</h4>
          <LSTool
            execution={mockToolExecutions.pending('LS', mockToolInputs.lsTool({
              path: '/Users/kongjie/slides/ai-editor/frontend/src/components',
              ignore: ['*.test.tsx', '*.stories.tsx']
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">工具目录</h4>
          <LSTool
            execution={mockToolExecutions.pending('LS', mockToolInputs.lsTool({
              path: '/Users/kongjie/slides/ai-editor/frontend/src/components/tools'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">忽略所有文件类型</h4>
          <LSTool
            execution={mockToolExecutions.pending('LS', mockToolInputs.lsTool({
              path: '/Users/kongjie/slides/ai-editor/frontend/src',
              ignore: ['*.js', '*.css', '*.md', 'package.json']
            }))}
          />
        </div>
      </div>
    </div>
  )
};
