import type { Meta, StoryObj } from '@storybook/react';
import { TimeMachineTool } from './TimeMachineTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/TimeMachineTool',
  component: TimeMachineTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'TimeMachineTool 用于时间回溯功能，允许回到之前的对话状态并进行修正。'
      }
    }
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TimeMachineTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础时间机器示例
export const BasicTimeMachine: Story = {
  args: {
    execution: mockToolExecutions.executing('TimeMachineTool', mockToolInputs.timeMachine())
  }
};

// 不同的消息前缀
export const DifferentMessagePrefixes: Story = {
  args: {
    execution: mockToolExecutions.executing('TimeMachineTool', mockToolInputs.timeMachine())
  }
};

// 不同状态
export const DifferentStates: Story = {
  args: {
    execution: mockToolExecutions.executing('TimeMachineTool', mockToolInputs.timeMachine())
  }
};

// 代码恢复选项
export const CodeRestoreOptions: Story = {
  args: {
    execution: mockToolExecutions.executing('TimeMachineTool', mockToolInputs.timeMachine())
  }
};

// 长消息示例
export const LongMessages: Story = {
  args: {
    execution: mockToolExecutions.executing('TimeMachineTool', mockToolInputs.timeMachine())
  }
};