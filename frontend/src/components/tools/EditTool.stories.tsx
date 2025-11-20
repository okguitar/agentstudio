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

// 等待编辑状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('Edit', mockToolInputs.fileEdit())
  }
};

// 编辑中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileEdit({
      file_path: '/Users/kongjie/slides/ai-editor/src/App.tsx',
      old_string: 'const App = () => {',
      new_string: 'const App: React.FC = () => {'
    }))
  }
};

// 编辑成功状态（显示 diff）
export const Success: Story = {
  args: {
    execution: mockToolExecutions.editWithPatch(
      mockToolInputs.fileEdit(),
      mockResults.edit.patch
    )
  }
};

// 编辑失败状态
export const Error: Story = {
  args: {
    execution: mockToolExecutions.error(
      'Edit',
      mockToolInputs.fileEdit(),
      'Error: Could not find old_string in file'
    )
  }
};

// 单行替换
export const SingleReplacement: Story = {
  args: {
    execution: mockToolExecutions.pending('Edit', mockToolInputs.fileEdit({
      file_path: 'config.ts',
      old_string: 'port: 3000',
      new_string: 'port: 4936',
      replace_all: false
    }))
  }
};

// 全局替换
export const GlobalReplacement: Story = {
  args: {
    execution: mockToolExecutions.pending('Edit', mockToolInputs.fileEdit({
      file_path: 'src/utils/api.ts',
      old_string: 'http://localhost',
      new_string: 'https://api.example.com',
      replace_all: true
    }))
  }
};
