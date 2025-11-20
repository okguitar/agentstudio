import type { Meta, StoryObj } from '@storybook/react';
import { WebFetchTool } from './WebFetchTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

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
    execution: mockToolExecutions.executing('WebFetchTool', mockToolInputs.webFetch())
  }
};
