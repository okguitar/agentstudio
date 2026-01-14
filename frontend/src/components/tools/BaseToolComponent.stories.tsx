import type { Meta, StoryObj } from '@storybook/react';
import { BaseToolComponent } from './BaseToolComponent';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/BaseToolComponent',
  component: BaseToolComponent,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'BaseToolComponent 是所有工具组件的基础组件，提供统一的布局和状态显示。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    execution: {
      description: '工具执行对象',
      control: 'object'
    },
    subtitle: {
      description: '副标题，用于显示额外的工具信息',
      control: 'text'
    },
    children: {
      description: '子组件内容',
      control: 'text'
    }
  }
} satisfies Meta<typeof BaseToolComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础状态展示
export const BasicStates: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">基础状态</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待状态</h4>
          <BaseToolComponent
            execution={mockToolExecutions.pending('Bash', mockToolInputs.bash())}
            subtitle="ls -la"
          >
            <div className="p-3 bg-blue-50 text-blue-700 rounded">
              等待执行中...
            </div>
          </BaseToolComponent>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">执行中状态</h4>
          <BaseToolComponent
            execution={mockToolExecutions.executing('Bash', mockToolInputs.bash())}
            subtitle="npm install"
          >
            <div className="p-3 bg-yellow-50 text-yellow-700 rounded">
              正在执行...
            </div>
          </BaseToolComponent>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">成功状态</h4>
          <BaseToolComponent
            execution={mockToolExecutions.success('Bash', mockToolInputs.bash(), '安装完成')}
            subtitle="npm install"
          >
            <div className="p-3 bg-green-50 text-green-700 rounded">
              执行成功！
            </div>
          </BaseToolComponent>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">错误状态</h4>
          <BaseToolComponent
            execution={mockToolExecutions.error('Bash', mockToolInputs.bash(), '命令执行失败')}
            subtitle="invalid command"
          >
            <div className="p-3 bg-red-50 text-red-700 rounded">
              执行失败！
            </div>
          </BaseToolComponent>
        </div>
      </div>
    </div>
  )
};

// 不同工具类型展示
export const DifferentToolTypes: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同工具类型</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Bash 工具</h4>
          <BaseToolComponent
            execution={mockToolExecutions.success('Bash', mockToolInputs.bash(), 'drwxr-xr-x 12 kongjie staff 4096 Nov 19 18:50 .')}
            subtitle="List directory contents"
          >
            <div className="font-mono text-sm bg-gray-100 p-3 rounded">
              <div>total 96</div>
              <div>drwxr-xr-x  12 kongjie  staff  4096 Nov 19 18:50 .</div>
              <div>drwxr-xr-x   3 kongjie  staff    96 Nov 19 18:40 ..</div>
            </div>
          </BaseToolComponent>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">Read 工具</h4>
          <BaseToolComponent
            execution={mockToolExecutions.success('Read', mockToolInputs.fileRead(), '{\n  "name": "test",\n  "version": "1.0.0"\n}')}
            subtitle="package.json"
          >
            <div className="font-mono text-sm bg-gray-100 p-3 rounded">
              <pre>{JSON.stringify({ name: "test", version: "1.0.0" }, null, 2)}</pre>
            </div>
          </BaseToolComponent>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">WebFetch 工具</h4>
          <BaseToolComponent
            execution={mockToolExecutions.success('WebFetch', mockToolInputs.webFetch(), 'Title: Blog Post')}
            subtitle="https://example.com/api/posts/1"
          >
            <div className="text-sm bg-blue-50 p-3 rounded">
              <div className="font-medium">获取成功</div>
              <div className="text-gray-600 mt-1">从远程 URL 获取内容</div>
            </div>
          </BaseToolComponent>
        </div>
      </div>
    </div>
  )
};

// 长内容展示
export const LongContent: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash())
  },
  render: () => {
    const longOutput = `Line 1: This is a long output
Line 2: It demonstrates how the component handles
Line 3: Multi-line content with proper scrolling
Line 4: And maintains readability
Line 5: Even with substantial amounts of text
Line 6: The layout remains clean and organized
Line 7: Users can easily scan through the results
Line 8: Important information is highlighted
Line 9: The component adapts to different content types
Line 10: Ensuring good user experience in all scenarios`;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold mb-4">长内容展示</h3>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">长输出内容</h4>
          <BaseToolComponent
            execution={mockToolExecutions.success('Grep', mockToolInputs.grep(), longOutput)}
            subtitle="Search results (10 matches)"
          >
            <div className="font-mono text-sm bg-gray-100 p-3 rounded max-h-48 overflow-y-auto">
              <pre>{longOutput}</pre>
            </div>
          </BaseToolComponent>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">长副标题</h4>
          <BaseToolComponent
            execution={mockToolExecutions.executing('Task', mockToolInputs.agent({
              description: 'This is a very long task description that demonstrates how the component handles lengthy text in the subtitle area while maintaining good readability and proper layout'
            }))}
          >
            <div className="text-sm bg-yellow-50 p-3 rounded">
              分析项目结构和组件组织...
            </div>
          </BaseToolComponent>
        </div>
      </div>
    );
  }
};

// 错误处理展示
export const ErrorHandling: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">错误处理</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">系统错误</h4>
          <BaseToolComponent
            execution={mockToolExecutions.error('Bash', mockToolInputs.bash(), 'Command failed with exit code 127: command not found')}
            subtitle="invalid-command"
          >
            <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
              <div className="font-medium text-red-700">系统错误</div>
              <div className="text-red-600 mt-1">命令未找到</div>
            </div>
          </BaseToolComponent>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">网络错误</h4>
          <BaseToolComponent
            execution={mockToolExecutions.error('WebFetch', mockToolInputs.webFetch(), 'Failed to fetch: Network timeout')}
            subtitle="https://example.com/timeout"
          >
            <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
              <div className="font-medium text-red-700">网络错误</div>
              <div className="text-red-600 mt-1">请求超时</div>
            </div>
          </BaseToolComponent>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">文件错误</h4>
          <BaseToolComponent
            execution={mockToolExecutions.error('Read', mockToolInputs.fileRead(), 'ENOENT: no such file or directory')}
            subtitle="nonexistent-file.txt"
          >
            <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
              <div className="font-medium text-red-700">文件错误</div>
              <div className="text-red-600 mt-1">文件不存在</div>
            </div>
          </BaseToolComponent>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">权限错误</h4>
          <BaseToolComponent
            execution={mockToolExecutions.error('Write', mockToolInputs.fileWrite(), 'EACCES: permission denied')}
            subtitle="/protected/file.txt"
          >
            <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
              <div className="font-medium text-red-700">权限错误</div>
              <div className="text-red-600 mt-1">访问被拒绝</div>
            </div>
          </BaseToolComponent>
        </div>
      </div>
    </div>
  )
};

// 响应式设计
export const ResponsiveDesign: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash())
  },
  parameters: {
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
      },
    },
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">响应式设计</h3>
      <p className="text-gray-600">组件在不同屏幕尺寸下的表现</p>

      <div className="space-y-4">
        <BaseToolComponent
          execution={mockToolExecutions.success('Bash', mockToolInputs.bash(), 'Command executed successfully')}
          subtitle="Responsive test component"
        >
          <div className="p-3 bg-gray-50 rounded">
            这个组件会在不同屏幕尺寸下自动调整布局
          </div>
        </BaseToolComponent>
      </div>
    </div>
  )
};