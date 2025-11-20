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

// 等待搜索状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('Grep', mockToolInputs.grep())
  }
};

// 搜索中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('Grep', mockToolInputs.grep({
      pattern: 'useState'
    }))
  }
};

// 搜索成功状态
export const Success: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Grep',
      mockToolInputs.grep(),
      mockResults.grep.results
    )
  }
};

// 无匹配结果
export const NoMatches: Story = {
  args: {
    execution: mockToolExecutions.success(
      'Grep',
      mockToolInputs.grep({ pattern: 'nonexistent_keyword' }),
      'No matches found'
    )
  }
};

export const FilePathSearch: Story = {
  args: {
    execution: mockToolExecutions.pending('Grep', mockToolInputs.grep({
      pattern: 'className',
      path: 'src/components',
      output_mode: 'files_with_matches'
    }))
  }
};

export const LineNumberSearch: Story = {
  args: {
    execution: mockToolExecutions.pending('Grep', mockToolInputs.grep({
      pattern: 'import.*React',
      '-n': true
    }))
  }
};

export const CaseInsensitiveSearch: Story = {
  args: {
    execution: mockToolExecutions.pending('Grep', mockToolInputs.grep({
      pattern: 'error',
      '-i': true
    }))
  }
};

export const MultilineSearch: Story = {
  args: {
    execution: mockToolExecutions.pending('Grep', mockToolInputs.grep({
      pattern: 'interface.*\\{',
      multiline: true
    }))
  }
};
