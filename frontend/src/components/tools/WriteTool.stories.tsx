import type { Meta, StoryObj } from '@storybook/react';
import { WriteTool } from './WriteTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/WriteTool',
  component: WriteTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'WriteTool 用于显示文件写入操作，可以创建新文件或覆盖现有文件。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof WriteTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 等待写入状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('Write', mockToolInputs.fileWrite())
  }
};

// 写入中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('Write', mockToolInputs.fileWrite({
      file_path: '/Users/kongjie/slides/ai-editor/README.md',
      content: '# AgentStudio\n\nA powerful AI-powered slide editing platform.'
    }))
  }
};

// 写入成功状态
export const Success: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Write',
      mockToolInputs.fileWrite(),
      'File written successfully'
    )
  }
};

// 写入失败状态
export const Error: Story = {
  args: {
    execution: mockToolExecutions.error(
      'Write',
      mockToolInputs.fileWrite(),
      'Error: Permission denied'
    )
  }
};

// 创建配置文件
export const ConfigFile: Story = {
  args: {
    execution: mockToolExecutions.pending('Write', mockToolInputs.fileWrite({
      file_path: '.env.local',
      content: 'VITE_API_URL=http://localhost:4936\nVITE_ENV=development'
    }))
  }
};

// 创建 TypeScript 文件
export const TypeScriptFile: Story = {
  args: {
    execution: mockToolExecutions.pending('Write', mockToolInputs.fileWrite({
      file_path: 'src/types/index.ts',
      content: 'export interface User {\n  id: string;\n  name: string;\n  email: string;\n}'
    }))
  }
};

// 创建 JSON 文件
export const JsonFile: Story = {
  args: {
    execution: mockToolExecutions.pending('Write', mockToolInputs.fileWrite({
      file_path: 'data/config.json',
      content: '{\n  "theme": "dark",\n  "language": "en-US",\n  "features": ["editor", "preview"]\n}'
    }))
  }
};
