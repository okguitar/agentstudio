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

// 等待读取状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('Read', mockToolInputs.fileRead())
  }
};

// 读取中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('Read', mockToolInputs.fileRead({
      file_path: '/Users/kongjie/slides/ai-editor/src/App.tsx',
      limit: 100
    }))
  }
};

// 读取成功状态
export const Success: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Read',
      mockToolInputs.fileRead(),
      '{\n  "name": "@agentstudio/frontend",\n  "version": "0.1.0",\n  "type": "module"\n}'
    )
  }
};

// 读取失败状态
export const Error: Story = {
  args: {
    execution: mockToolExecutions.error(
      'Read',
      mockToolInputs.fileRead({ file_path: '/nonexistent/file.txt' }),
      'Error: File not found'
    )
  }
};

// 读取全文件
export const FullFile: Story = {
  args: {
    execution: mockToolExecutions.pending('Read', mockToolInputs.fileRead({
      file_path: 'README.md'
    }))
  }
};

// 限制读取行数
export const LimitedLines: Story = {
  args: {
    execution: mockToolExecutions.pending('Read', mockToolInputs.fileRead({
      file_path: 'src/index.tsx',
      limit: 50,
      offset: 0
    }))
  }
};

// 从指定行开始读取
export const OffsetRead: Story = {
  args: {
    execution: mockToolExecutions.pending('Read', mockToolInputs.fileRead({
      file_path: 'src/App.tsx',
      limit: 20,
      offset: 100
    }))
  }
};
