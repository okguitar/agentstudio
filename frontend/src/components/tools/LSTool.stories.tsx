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

// 等待列表状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('LS', mockToolInputs.lsTool())
  }
};

// 列表中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('LS', mockToolInputs.lsTool({
      path: '/Users/kongjie/slides/ai-editor/src'
    }))
  }
};

// 列表成功状态
export const Success: Story = {
  args: {
    execution: mockToolExecutions.success(
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
    )
  }
};

// 目录不存在
export const DirectoryNotFound: Story = {
  args: {
    execution: mockToolExecutions.error(
      'LS',
      mockToolInputs.lsTool({ path: '/nonexistent/directory' }),
      'Error: Directory not found'
    )
  }
};

export const ListOptions: Story = {
  args: {
    execution: mockToolExecutions.pending('LS', mockToolInputs.lsTool({
      path: '/Users/kongjie/slides/ai-editor',
      ignore: ['node_modules', '.git', 'dist', '.next']
    }))
  }
};

export const ComponentDirectory: Story = {
  args: {
    execution: mockToolExecutions.pending('LS', mockToolInputs.lsTool({
      path: '/Users/kongjie/slides/ai-editor/frontend/src/components',
      ignore: ['*.test.tsx', '*.stories.tsx']
    }))
  }
};

export const ToolsDirectory: Story = {
  args: {
    execution: mockToolExecutions.pending('LS', mockToolInputs.lsTool({
      path: '/Users/kongjie/slides/ai-editor/frontend/src/components/tools'
    }))
  }
};

export const IgnoreFileTypes: Story = {
  args: {
    execution: mockToolExecutions.pending('LS', mockToolInputs.lsTool({
      path: '/Users/kongjie/slides/ai-editor/frontend/src',
      ignore: ['*.js', '*.css', '*.md', 'package.json']
    }))
  }
};
