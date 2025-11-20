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
  args: {
    execution: mockToolExecutions.pending('WebSearch', mockToolInputs.webSearch())
  }
};

export const WebSearchStates1: Story = {
  args: {
    execution: mockToolExecutions.success(
              'WebSearch',
              mockToolInputs.webSearch(),
              mockResults.webSearch.results
            )
  }
};

export const SearchOptions: Story = {
  args: {
    execution: mockToolExecutions.pending('WebSearch', mockToolInputs.webSearch({
      query: 'React hooks documentation',
      allowed_domains: ['react.dev', 'reactjs.org']
    }))
  }
};
