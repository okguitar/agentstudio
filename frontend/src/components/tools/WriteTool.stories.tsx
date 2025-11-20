import type { Meta, StoryObj } from '@storybook/react';
import { WriteTool } from './WriteTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/WriteTool',
  component: WriteTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'WriteTool 用于显示文件写入操作，可以创建新文件或覆盖现有文件。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof WriteTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WriteStates: Story = {
  args: {
    execution: mockToolExecutions.pending('Write', mockToolInputs.fileWrite())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">文件写入状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待写入</h4>
          <WriteTool
            execution={mockToolExecutions.pending('Write', mockToolInputs.fileWrite())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">写入中</h4>
          <WriteTool
            execution={mockToolExecutions.executing('Write', mockToolInputs.fileWrite({
              file_path: '/Users/kongjie/slides/ai-editor/README.md',
              content: '# AgentStudio\n\nA powerful AI-powered slide editing platform.'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">写入成功</h4>
          <WriteTool
            execution={mockToolExecutions.success(
              'Write',
              mockToolInputs.fileWrite(),
              'File written successfully'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">写入失败</h4>
          <WriteTool
            execution={mockToolExecutions.error(
              'Write',
              mockToolInputs.fileWrite(),
              'Error: Permission denied'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const DifferentFiles: Story = {
  args: {
    execution: mockToolExecutions.pending('Write', mockToolInputs.fileWrite())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同类型的文件写入</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">创建配置文件</h4>
          <WriteTool
            execution={mockToolExecutions.pending('Write', mockToolInputs.fileWrite({
              file_path: '.env.local',
              content: 'VITE_API_URL=http://localhost:4936\nVITE_ENV=development'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">创建 TypeScript 文件</h4>
          <WriteTool
            execution={mockToolExecutions.pending('Write', mockToolInputs.fileWrite({
              file_path: 'src/types/index.ts',
              content: 'export interface User {\n  id: string;\n  name: string;\n  email: string;\n}'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">创建 JSON 文件</h4>
          <WriteTool
            execution={mockToolExecutions.pending('Write', mockToolInputs.fileWrite({
              file_path: 'data/config.json',
              content: '{\n  "theme": "dark",\n  "language": "en-US",\n  "features": ["editor", "preview"]\n}'
            }))}
          />
        </div>
      </div>
    </div>
  )
};
