import type { Meta, StoryObj } from '@storybook/react';
import { MultiEditTool } from './MultiEditTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/MultiEditTool',
  component: MultiEditTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'MultiEditTool 用于批量编辑文件，支持一次性进行多个编辑操作。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof MultiEditTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MultiEditStates: Story = {
  args: {
    execution: mockToolExecutions.executing('MultiEditTool', mockToolInputs.fileEdit())
  }
};
