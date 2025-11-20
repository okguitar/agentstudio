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

// 不同执行状态
export const ExecutionStates: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Bash 命令执行状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待执行</h4>
          <BashTool
            execution={mockToolExecutions.pending('Bash', mockToolInputs.bash())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行中</h4>
          <BashTool
            execution={mockToolExecutions.executing('Bash', mockToolInputs.bash({
              command: 'npm install',
              description: 'Installing dependencies'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行成功</h4>
          <BashTool
            execution={mockToolExecutions.bashWithOutput(
              mockToolInputs.bash(),
              mockResults.bash.success
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行失败</h4>
          <BashTool
            execution={mockToolExecutions.error(
              'Bash',
              mockToolInputs.bash({ command: 'invalid-command' }),
              mockResults.bash.error
            )}
          />
        </div>
      </div>
    </div>
  )
};

// 不同类型的命令
export const DifferentCommands: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同类型的命令</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">文件操作</h4>
          <BashTool
            execution={mockToolExecutions.bashWithOutput(
              mockToolInputs.bash({
                command: 'cat package.json | grep "name"',
                description: 'Extract package name'
              }),
              '"name": "@agentstudio/frontend"'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">Git 命令</h4>
          <BashTool
            execution={mockToolExecutions.bashWithOutput(
              mockToolInputs.bash({
                command: 'git status --short',
                description: 'Check git status'
              }),
              'M frontend/src/components/tools/BashTool.tsx\n?? frontend/src/components/tools/BashTool.stories.tsx'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">系统命令</h4>
          <BashTool
            execution={mockToolExecutions.bashWithOutput(
              mockToolInputs.bash({
                command: 'ps aux | grep node',
                description: 'Find Node.js processes'
              }),
              'kongjie  12345  0.5  2.1 node /usr/local/bin/npm run dev\nkongjie  12346  1.2  3.5 node frontend/node_modules/.bin/vite'
            )}
          />
        </div>
      </div>
    </div>
  )
};

// 长输出内容
export const LongOutput: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">长输出内容</h3>
      <BashTool
        execution={mockToolExecutions.bashWithOutput(
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
        )}
      />
    </div>
  )
};
