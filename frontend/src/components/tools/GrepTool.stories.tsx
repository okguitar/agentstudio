import type { Meta, StoryObj } from '@storybook/react';
import { GrepTool } from './GrepTool';
import { mockToolExecutions, mockToolInputs, mockResults } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/GrepTool',
  component: GrepTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'GrepTool 用于文本内容搜索，支持正则表达式和各种搜索选项。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof GrepTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GrepStates: Story = {
  args: {
    execution: mockToolExecutions.pending('Grep', mockToolInputs.grep())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">文本搜索状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待搜索</h4>
          <GrepTool
            execution={mockToolExecutions.pending('Grep', mockToolInputs.grep())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">搜索中</h4>
          <GrepTool
            execution={mockToolExecutions.executing('Grep', mockToolInputs.grep({
              pattern: 'useState'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">搜索成功</h4>
          <GrepTool
            execution={mockToolExecutions.success(
              'Grep',
              mockToolInputs.grep(),
              mockResults.grep.results
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">无匹配结果</h4>
          <GrepTool
            execution={mockToolExecutions.success(
              'Grep',
              mockToolInputs.grep({ pattern: 'nonexistent_keyword' }),
              'No matches found'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const SearchOptions: Story = {
  args: {
    execution: mockToolExecutions.pending('Grep', mockToolInputs.grep())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同搜索选项</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">显示文件路径</h4>
          <GrepTool
            execution={mockToolExecutions.pending('Grep', mockToolInputs.grep({
              pattern: 'className',
              path: 'src/components',
              output_mode: 'files_with_matches'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">显示行号</h4>
          <GrepTool
            execution={mockToolExecutions.pending('Grep', mockToolInputs.grep({
              pattern: 'import.*React',
              '-n': true
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">忽略大小写</h4>
          <GrepTool
            execution={mockToolExecutions.pending('Grep', mockToolInputs.grep({
              pattern: 'error',
              '-i': true
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">多行匹配</h4>
          <GrepTool
            execution={mockToolExecutions.pending('Grep', mockToolInputs.grep({
              pattern: 'interface.*\\{',
              multiline: true
            }))}
          />
        </div>
      </div>
    </div>
  )
};
