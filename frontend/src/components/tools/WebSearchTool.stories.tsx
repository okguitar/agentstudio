import type { Meta, StoryObj } from '@storybook/react';
import { WebSearchTool } from './WebSearchTool';
import { mockToolExecutions, mockToolInputs, mockResults } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/WebSearchTool',
  component: WebSearchTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'WebSearchTool 用于进行网络搜索，支持域名过滤和限制搜索结果。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof WebSearchTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WebSearchStates: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">网络搜索状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待搜索</h4>
          <WebSearchTool
            execution={mockToolExecutions.pending('WebSearch', mockToolInputs.webSearch())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">搜索中</h4>
          <WebSearchTool
            execution={mockToolExecutions.executing('WebSearch', mockToolInputs.webSearch({
              query: 'React hooks best practices'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">搜索成功</h4>
          <WebSearchTool
            execution={mockToolExecutions.success(
              'WebSearch',
              mockToolInputs.webSearch(),
              mockResults.webSearch.results
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">搜索无结果</h4>
          <WebSearchTool
            execution={mockToolExecutions.success(
              'WebSearch',
              mockToolInputs.webSearch({ query: 'xyz123 nonexistent query' }),
              'No search results found'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const SearchOptions: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同搜索选项</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">域名过滤搜索</h4>
          <WebSearchTool
            execution={mockToolExecutions.pending('WebSearch', mockToolInputs.webSearch({
              query: 'TypeScript documentation',
              allowed_domains: ['typescriptlang.org', 'microsoft.com']
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">技术问题搜索</h4>
          <WebSearchTool
            execution={mockToolExecutions.pending('WebSearch', mockToolInputs.webSearch({
              query: 'Vite build optimization 2024',
              allowed_domains: ['stackoverflow.com', 'dev.to', 'medium.com']
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">文档搜索</h4>
          <WebSearchTool
            execution={mockToolExecutions.pending('WebSearch', mockToolInputs.webSearch({
              query: 'TailwindCSS responsive design',
              allowed_domains: ['tailwindcss.com']
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">排除特定域名</h4>
          <WebSearchTool
            execution={mockToolExecutions.pending('WebSearch', mockToolInputs.webSearch({
              query: 'React performance optimization',
              blocked_domains: ['ads.google.com', 'facebook.com']
            }))}
          />
        </div>
      </div>
    </div>
  )
};
