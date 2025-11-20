import type { Meta, StoryObj } from '@storybook/react';
import { ToolRenderer } from './ToolRenderer';
import { mockToolInputs, mockToolExecutions } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/ToolRenderer',
  component: ToolRenderer,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ToolRenderer 组件负责根据工具类型渲染对应的工具组件，支持 19 种不同的工具类型。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    execution: {
      description: '工具执行对象，包含工具类型、输入、执行状态和结果',
      control: 'object'
    }
  }
} satisfies Meta<typeof ToolRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础故事 - 不同状态
export const States: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileRead())
  }
};

// 文件操作工具
export const FileTools: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileRead())
  }
};

// 搜索和导航工具
export const SearchTools: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileRead())
  }
};

// 开发者工具
export const DeveloperTools: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileRead())
  }
};

// MCP (Model Context Protocol) 工具
export const McpTools: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileRead())
  }
};

// 高级工具
export const AdvancedTools: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileRead())
  }
};

// 系统工具
export const SystemTools: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileRead())
  }
};

// 交互式示例
export const InteractiveExample: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileRead())
  }
};

// 所有工具概览
export const AllToolsOverview: Story = {
  args: {
    execution: mockToolExecutions.executing('Edit', mockToolInputs.fileRead())
  }
};