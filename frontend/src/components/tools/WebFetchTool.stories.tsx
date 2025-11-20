import type { Meta, StoryObj } from '@storybook/react';
import { WebFetchTool } from './WebFetchTool';
import { mockToolExecutions, mockToolInputs, mockResults } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/WebFetchTool',
  component: WebFetchTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'WebFetchTool 用于获取和分析网页内容，支持提取特定信息。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof WebFetchTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WebFetchStates: Story = {
  args: {
    execution: mockToolExecutions.pending('WebFetch', mockToolInputs.webFetch())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">网页获取状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待获取</h4>
          <WebFetchTool
            execution={mockToolExecutions.pending('WebFetch', mockToolInputs.webFetch())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">获取中</h4>
          <WebFetchTool
            execution={mockToolExecutions.executing('WebFetch', mockToolInputs.webFetch({
              url: 'https://jsonplaceholder.typicode.com/posts/1'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">获取成功</h4>
          <WebFetchTool
            execution={mockToolExecutions.success(
              'WebFetch',
              mockToolInputs.webFetch(),
              mockResults.webFetch.success
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">获取失败</h4>
          <WebFetchTool
            execution={mockToolExecutions.error(
              'WebFetch',
              mockToolInputs.webFetch({ url: 'https://example.com/not-found' }),
              mockResults.webFetch.error
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const FetchScenarios: Story = {
  args: {
    execution: mockToolExecutions.pending('WebFetch', mockToolInputs.webFetch())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同获取场景</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">获取 API 数据</h4>
          <WebFetchTool
            execution={mockToolExecutions.pending('WebFetch', mockToolInputs.webFetch({
              url: 'https://api.github.com/users/jeffkit',
              prompt: 'Extract the user name, bio, and followers count'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">分析网页内容</h4>
          <WebFetchTool
            execution={mockToolExecutions.pending('WebFetch', mockToolInputs.webFetch({
              url: 'https://react.dev/learn',
              prompt: 'Summarize the main concepts and key takeaways'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">提取文档信息</h4>
          <WebFetchTool
            execution={mockToolExecutions.pending('WebFetch', mockToolInputs.webFetch({
              url: 'https://tailwindcss.com/docs/background-color',
              prompt: 'List all background color classes with their descriptions'
            }))}
          />
        </div>
      </div>
    </div>
  )
};
