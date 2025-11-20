import type { Meta, StoryObj } from '@storybook/react';
import { EditTool } from './EditTool';
import { mockToolExecutions, mockToolInputs, mockResults } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/EditTool',
  component: EditTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'EditTool 用于显示文件编辑操作，支持查看编辑前后的差异（diff）。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof EditTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EditStates: Story = {
  args: {
    execution: mockToolExecutions.pending('Edit', mockToolInputs.fileEdit())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">文件编辑状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待编辑</h4>
          <EditTool
            execution={mockToolExecutions.pending('Edit', mockToolInputs.fileEdit())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">编辑中</h4>
          <EditTool
            execution={mockToolExecutions.executing('Edit', mockToolInputs.fileEdit({
              file_path: '/Users/kongjie/slides/ai-editor/src/App.tsx',
              old_string: 'const App = () => {',
              new_string: 'const App: React.FC = () => {'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">编辑成功（显示 diff）</h4>
          <EditTool
            execution={mockToolExecutions.editWithPatch(
              mockToolInputs.fileEdit(),
              mockResults.edit.patch
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">编辑失败</h4>
          <EditTool
            execution={mockToolExecutions.error(
              'Edit',
              mockToolInputs.fileEdit(),
              'Error: Could not find old_string in file'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const DifferentEdits: Story = {
  args: {
    execution: mockToolExecutions.pending('Edit', mockToolInputs.fileEdit())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同类型的编辑</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">单行替换</h4>
          <EditTool
            execution={mockToolExecutions.pending('Edit', mockToolInputs.fileEdit({
              file_path: 'config.ts',
              old_string: 'port: 3000',
              new_string: 'port: 4936',
              replace_all: false
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">全局替换</h4>
          <EditTool
            execution={mockToolExecutions.pending('Edit', mockToolInputs.fileEdit({
              file_path: 'src/utils/api.ts',
              old_string: 'http://localhost',
              new_string: 'https://api.example.com',
              replace_all: true
            }))}
          />
        </div>
      </div>
    </div>
  )
};
