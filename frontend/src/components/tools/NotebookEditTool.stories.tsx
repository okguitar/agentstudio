import type { Meta, StoryObj } from '@storybook/react';
import { NotebookEditTool } from './NotebookEditTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/NotebookEditTool',
  component: NotebookEditTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'NotebookEditTool 用于编辑 Jupyter Notebook 单元格，支持代码和 Markdown 内容。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof NotebookEditTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotebookEditStates: Story = {
  args: {
    execution: mockToolExecutions.executing('NotebookEditTool', mockToolInputs.fileEdit())
  }
};
