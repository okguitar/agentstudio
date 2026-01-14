import type { Meta, StoryObj } from '@storybook/react';
import { MultiEditTool } from './MultiEditTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/MultiEditTool',
  component: MultiEditTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'MultiEditTool 用于批量编辑文件，支持一次性进行多个编辑操作。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof MultiEditTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MultiEditStates: Story = {
  args: {
    execution: mockToolExecutions.pending('MultiEdit', mockToolInputs.multiEdit())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">批量编辑状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待编辑</h4>
          <MultiEditTool
            execution={mockToolExecutions.pending('MultiEdit', mockToolInputs.multiEdit())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">编辑中</h4>
          <MultiEditTool
            execution={mockToolExecutions.executing('MultiEdit', mockToolInputs.multiEdit({
              file_path: '/Users/kongjie/slides/ai-editor/src/App.tsx',
              edits: [
                { old_string: 'className="App"', new_string: 'className="App bg-blue-50"' },
                { old_string: 'const [count, setCount]', new_string: 'const [count, setCount]' }
              ]
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">编辑成功</h4>
          <MultiEditTool
            execution={mockToolExecutions.success(
              'MultiEdit',
              mockToolInputs.multiEdit(),
              'Applied 2 edits successfully'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">编辑失败</h4>
          <MultiEditTool
            execution={mockToolExecutions.error(
              'MultiEdit',
              mockToolInputs.multiEdit(),
              'Error: Some edits could not be applied'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const EditScenarios: Story = {
  args: {
    execution: mockToolExecutions.pending('MultiEdit', mockToolInputs.multiEdit())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同编辑场景</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">样式更新</h4>
          <MultiEditTool
            execution={mockToolExecutions.pending('MultiEdit', mockToolInputs.multiEdit({
              file_path: 'src/styles.css',
              edits: [
                { old_string: 'color: black', new_string: 'color: #1f2937', replace_all: true },
                { old_string: 'background: white', new_string: 'background: #ffffff', replace_all: true }
              ]
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">导入语句更新</h4>
          <MultiEditTool
            execution={mockToolExecutions.pending('MultiEdit', mockToolInputs.multiEdit({
              file_path: 'src/utils/api.ts',
              edits: [
                { old_string: 'import axios from \'axios\';', new_string: 'import fetch from \'node-fetch\';' },
                { old_string: 'axios.get', new_string: 'fetch', replace_all: true }
              ]
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">配置文件更新</h4>
          <MultiEditTool
            execution={mockToolExecutions.pending('MultiEdit', mockToolInputs.multiEdit({
              file_path: 'vite.config.ts',
              edits: [
                { old_string: 'port: 3000', new_string: 'port: 5173' },
                { old_string: 'host: true', new_string: 'host: "localhost"' }
              ]
            }))}
          />
        </div>
      </div>
    </div>
  )
};
