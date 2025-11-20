import type { Meta, StoryObj } from '@storybook/react';
import { BashTool } from './BashTool';
import { mockToolExecutions, mockToolInputs, mockResults } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/BashTool',
  component: BashTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'BashTool 用于显示 Bash 命令的执行情况，包含终端样式的命令显示和执行结果。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    execution: {
      description: '工具执行对象',
      control: 'object'
    }
  }
} satisfies Meta<typeof BashTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 等待执行状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash())
  }
};

// 执行中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('Bash', mockToolInputs.bash({
      command: 'npm install',
      description: 'Installing dependencies'
    }))
  }
};

// 执行成功状态
export const Success: Story = {
  args: {
    execution: mockToolExecutions.bashWithOutput(
      mockToolInputs.bash(),
      mockResults.bash.success
    )
  }
};

// 执行失败状态
export const Error: Story = {
  args: {
    execution: mockToolExecutions.error(
      'Bash',
      mockToolInputs.bash({ command: 'invalid-command' }),
      mockResults.bash.error
    )
  }
};

// 文件操作命令
export const FileOperation: Story = {
  args: {
    execution: mockToolExecutions.bashWithOutput(
      mockToolInputs.bash({
        command: 'cat package.json | grep "name"',
        description: 'Extract package name'
      }),
      '"name": "@agentstudio/frontend"'
    )
  }
};

// Git 命令
export const GitCommand: Story = {
  args: {
    execution: mockToolExecutions.bashWithOutput(
      mockToolInputs.bash({
        command: 'git status --short',
        description: 'Check git status'
      }),
      'M frontend/src/components/tools/BashTool.tsx\n?? frontend/src/components/tools/BashTool.stories.tsx'
    )
  }
};

// 系统命令
export const SystemCommand: Story = {
  args: {
    execution: mockToolExecutions.bashWithOutput(
      mockToolInputs.bash({
        command: 'ps aux | grep node',
        description: 'Find Node.js processes'
      }),
      'kongjie  12345  0.5  2.1 node /usr/local/bin/npm run dev\nkongjie  12346  1.2  3.5 node frontend/node_modules/.bin/vite'
    )
  }
};

// 长输出内容
export const LongOutput: Story = {
  args: {
    execution: mockToolExecutions.bashWithOutput(
      mockToolInputs.bash({
        command: 'npm list --depth=0',
        description: 'List installed packages'
      }),
      `@agentstudio/frontend@0.1.0
├── @anthropic-ai/claude-agent-sdk@0.1.46
├── @monaco-editor/react@4.7.0
├── @radix-ui/react-toast@1.2.15
├── @tanstack/react-query@5.85.5
├── ai@5.0.22
├── clsx@2.1.1
├── lucide-react@0.541.0
├── react@19.1.1
├── react-dom@19.1.1
├── react-router-dom@7.8.2
└── zustand@5.0.8`
    )
  }
};
