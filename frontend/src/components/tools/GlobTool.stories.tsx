import type { Meta, StoryObj } from '@storybook/react';
import { GlobTool } from './GlobTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/GlobTool',
  component: GlobTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'GlobTool 用于文件模式匹配搜索，支持 glob 表达式查找文件。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof GlobTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 等待搜索状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('Glob', mockToolInputs.glob())
  }
};

// 搜索中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('Glob', mockToolInputs.glob({
      pattern: 'src/**/*.tsx'
    }))
  }
};

// 搜索成功状态
export const Success: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Glob',
      mockToolInputs.glob(),
      'src/App.tsx\nsrc/components/Button.tsx\nsrc/hooks/useAuth.ts'
    )
  }
};

// 无匹配结果
export const NoMatches: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Glob',
      mockToolInputs.glob({ pattern: 'src/**/*.pdf' }),
      'No matches found'
    )
  }
};

// TypeScript 文件
export const TypeScriptFiles: Story = {
  args: {
    execution: mockToolExecutions.pending('Glob', mockToolInputs.glob({
      pattern: 'src/**/*.{ts,tsx}',
      path: '/Users/kongjie/slides/ai-editor'
    }))
  }
};

// 配置文件
export const ConfigFiles: Story = {
  args: {
    execution: mockToolExecutions.pending('Glob', mockToolInputs.glob({
      pattern: '{*.json,*.yaml,*.yml,*.toml}'
    }))
  }
};

// 忽略特定目录
export const ExcludingDirs: Story = {
  args: {
    execution: mockToolExecutions.pending('Glob', mockToolInputs.glob({
      pattern: '**/*.{js,ts}',
      path: '/Users/kongjie/slides/ai-editor'
    }))
  }
};

// 测试文件
export const TestFiles: Story = {
  args: {
    execution: mockToolExecutions.pending('Glob', mockToolInputs.glob({
      pattern: '**/*.test.{ts,tsx,js,jsx}'
    }))
  }
};
