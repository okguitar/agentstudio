import type { Meta, StoryObj } from '@storybook/react';
import { NotebookReadTool } from './NotebookReadTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/NotebookReadTool',
  component: NotebookReadTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'NotebookReadTool 用于读取 Jupyter Notebook 单元格内容，支持代码和 Markdown 的显示。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof NotebookReadTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotebookReadStates: Story = {
  args: {
    execution: mockToolExecutions.executing('NotebookReadTool', mockToolInputs.fileRead())
  }
};
