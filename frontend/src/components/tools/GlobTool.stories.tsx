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

export const GlobStates: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">文件模式匹配状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待搜索</h4>
          <GlobTool
            execution={mockToolExecutions.pending('Glob', mockToolInputs.glob())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">搜索中</h4>
          <GlobTool
            execution={mockToolExecutions.executing('Glob', mockToolInputs.glob({
              pattern: 'src/**/*.tsx'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">搜索成功</h4>
          <GlobTool
            execution={mockToolExecutions.success(
              'Glob',
              mockToolInputs.glob(),
              'src/App.tsx\nsrc/components/Button.tsx\nsrc/hooks/useAuth.ts'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">无匹配结果</h4>
          <GlobTool
            execution={mockToolExecutions.success(
              'Glob',
              mockToolInputs.glob({ pattern: 'src/**/*.pdf' }),
              'No matches found'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const DifferentPatterns: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同搜索模式</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">TypeScript 文件</h4>
          <GlobTool
            execution={mockToolExecutions.pending('Glob', mockToolInputs.glob({
              pattern: 'src/**/*.{ts,tsx}',
              path: '/Users/kongjie/slides/ai-editor'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">配置文件</h4>
          <GlobTool
            execution={mockToolExecutions.pending('Glob', mockToolInputs.glob({
              pattern: '{*.json,*.yaml,*.yml,*.toml}'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">忽略特定目录</h4>
          <GlobTool
            execution={mockToolExecutions.pending('Glob', mockToolInputs.glob({
              pattern: '**/*.{js,ts}',
              path: '/Users/kongjie/slides/ai-editor'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">测试文件</h4>
          <GlobTool
            execution={mockToolExecutions.pending('Glob', mockToolInputs.glob({
              pattern: '**/*.test.{ts,tsx,js,jsx}'
            }))}
          />
        </div>
      </div>
    </div>
  )
};
