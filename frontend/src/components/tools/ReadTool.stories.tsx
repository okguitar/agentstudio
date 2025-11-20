import type { Meta, StoryObj } from '@storybook/react';
import { ReadTool } from './ReadTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/ReadTool',
  component: ReadTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ReadTool 用于显示文件读取操作，支持查看读取的内容和行号限制。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof ReadTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadStates: Story = {
  args: {
    execution: mockToolExecutions.pending('Read', mockToolInputs.fileRead())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">文件读取状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待读取</h4>
          <ReadTool
            execution={mockToolExecutions.pending('Read', mockToolInputs.fileRead())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">读取中</h4>
          <ReadTool
            execution={mockToolExecutions.executing('Read', mockToolInputs.fileRead({
              file_path: '/Users/kongjie/slides/ai-editor/src/App.tsx',
              limit: 100
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">读取成功</h4>
          <ReadTool
            execution={mockToolExecutions.success(
              'Read',
              mockToolInputs.fileRead(),
              '{\n  "name": "@agentstudio/frontend",\n  "version": "0.1.0",\n  "type": "module"\n}'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">读取失败</h4>
          <ReadTool
            execution={mockToolExecutions.error(
              'Read',
              mockToolInputs.fileRead({ file_path: '/nonexistent/file.txt' }),
              'Error: File not found'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const DifferentReadOptions: Story = {
  args: {
    execution: mockToolExecutions.pending('Read', mockToolInputs.fileRead())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同读取选项</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">读取全文件</h4>
          <ReadTool
            execution={mockToolExecutions.pending('Read', mockToolInputs.fileRead({
              file_path: 'README.md'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">限制读取行数</h4>
          <ReadTool
            execution={mockToolExecutions.pending('Read', mockToolInputs.fileRead({
              file_path: 'src/index.tsx',
              limit: 50,
              offset: 0
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">从指定行开始读取</h4>
          <ReadTool
            execution={mockToolExecutions.pending('Read', mockToolInputs.fileRead({
              file_path: 'src/App.tsx',
              limit: 20,
              offset: 100
            }))}
          />
        </div>
      </div>
    </div>
  )
};
