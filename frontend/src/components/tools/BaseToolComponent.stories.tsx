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

// 等待状态
export const Pending: Story = {
  args: {
    execution: mockToolExecutions.pending('Bash', mockToolInputs.bash()),
    subtitle: 'ls -la',
    children: (
      <div className="p-3 bg-blue-50 text-blue-700 rounded">
        等待执行中...
      </div>
    )
  }
};

// 执行中状态
export const Executing: Story = {
  args: {
    execution: mockToolExecutions.executing('Bash', mockToolInputs.bash()),
    subtitle: 'npm install',
    children: (
      <div className="p-3 bg-yellow-50 text-yellow-700 rounded">
        正在执行...
      </div>
    )
  }
};

// 成功状态
export const Success: Story = {
  args: {
    execution: mockToolExecutions.success('Bash', mockToolInputs.bash(), '安装完成'),
    subtitle: 'npm install',
    children: (
      <div className="p-3 bg-green-50 text-green-700 rounded">
        执行成功！
      </div>
    )
  }
};

// 错误状态
export const Error: Story = {
  args: {
    execution: mockToolExecutions.error('Bash', mockToolInputs.bash(), '命令执行失败'),
    subtitle: 'invalid command',
    children: (
      <div className="p-3 bg-red-50 text-red-700 rounded">
        执行失败！
      </div>
    )
  }
};

// Bash 工具示例
export const BashTool: Story = {
  args: {
    execution: mockToolExecutions.success('Bash', mockToolInputs.bash(), 'drwxr-xr-x 12 kongjie staff 4096 Nov 19 18:50 .'),
    subtitle: 'List directory contents',
    children: (
      <div className="font-mono text-sm bg-gray-100 p-3 rounded">
        <div>total 96</div>
        <div>drwxr-xr-x  12 kongjie  staff  4096 Nov 19 18:50 .</div>
        <div>drwxr-xr-x   3 kongjie  staff    96 Nov 19 18:40 ..</div>
      </div>
    )
  }
};

// Read 工具示例
export const ReadTool: Story = {
  args: {
    execution: mockToolExecutions.success('Read', mockToolInputs.fileRead(), '{\n  "name": "test",\n  "version": "1.0.0"\n}'),
    subtitle: 'package.json',
    children: (
      <div className="font-mono text-sm bg-gray-100 p-3 rounded">
        <pre>{JSON.stringify({ name: "test", version: "1.0.0" }, null, 2)}</pre>
      </div>
    )
  }
};

// WebFetch 工具示例
export const WebFetchTool: Story = {
  args: {
    execution: mockToolExecutions.success('WebFetch', mockToolInputs.webFetch(), 'Title: Blog Post'),
    subtitle: 'https://example.com/api/posts/1',
    children: (
      <div className="text-sm bg-blue-50 p-3 rounded">
        <div className="font-medium">获取成功</div>
        <div className="text-gray-600 mt-1">从远程 URL 获取内容</div>
      </div>
    )
  }
};

// 长输出内容
export const LongOutput: Story = {
  args: {
    execution: mockToolExecutions.success('Grep', mockToolInputs.grep(), `Line 1: This is a long output
Line 2: It demonstrates how the component handles
Line 3: Multi-line content with proper scrolling
Line 4: And maintains readability
Line 5: Even with substantial amounts of text
Line 6: The layout remains clean and organized
Line 7: Users can easily scan through the results
Line 8: Important information is highlighted
Line 9: The component adapts to different content types
Line 10: Ensuring good user experience in all scenarios`),
    subtitle: 'Search results (10 matches)',
    children: (
      <div className="font-mono text-sm bg-gray-100 p-3 rounded max-h-48 overflow-y-auto">
        <pre>{`Line 1: This is a long output
Line 2: It demonstrates how the component handles
Line 3: Multi-line content with proper scrolling
Line 4: And maintains readability
Line 5: Even with substantial amounts of text
Line 6: The layout remains clean and organized
Line 7: Users can easily scan through the results
Line 8: Important information is highlighted
Line 9: The component adapts to different content types
Line 10: Ensuring good user experience in all scenarios`}</pre>
      </div>
    )
  }
};

// 长副标题
export const LongSubtitle: Story = {
  args: {
    execution: mockToolExecutions.executing('Task', mockToolInputs.agent({
      description: 'This is a very long task description that demonstrates how the component handles lengthy text in the subtitle area while maintaining good readability and proper layout'
    })),
    children: (
      <div className="text-sm bg-yellow-50 p-3 rounded">
        分析项目结构和组件组织...
      </div>
    )
  }
};

// 系统错误
export const SystemError: Story = {
  args: {
    execution: mockToolExecutions.error('Bash', mockToolInputs.bash(), 'Command failed with exit code 127: command not found'),
    subtitle: 'invalid-command',
    children: (
      <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
        <div className="font-medium text-red-700">系统错误</div>
        <div className="text-red-600 mt-1">命令未找到</div>
      </div>
    )
  }
};

// 网络错误
export const NetworkError: Story = {
  args: {
    execution: mockToolExecutions.error('WebFetch', mockToolInputs.webFetch(), 'Failed to fetch: Network timeout'),
    subtitle: 'https://example.com/timeout',
    children: (
      <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
        <div className="font-medium text-red-700">网络错误</div>
        <div className="text-red-600 mt-1">请求超时</div>
      </div>
    )
  }
};

// 文件错误
export const FileError: Story = {
  args: {
    execution: mockToolExecutions.error('Read', mockToolInputs.fileRead(), 'ENOENT: no such file or directory'),
    subtitle: 'nonexistent-file.txt',
    children: (
      <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
        <div className="font-medium text-red-700">文件错误</div>
        <div className="text-red-600 mt-1">文件不存在</div>
      </div>
    )
  }
};

// 权限错误
export const PermissionError: Story = {
  args: {
    execution: mockToolExecutions.error('Write', mockToolInputs.fileWrite(), 'EACCES: permission denied'),
    subtitle: '/protected/file.txt',
    children: (
      <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
        <div className="font-medium text-red-700">权限错误</div>
        <div className="text-red-600 mt-1">访问被拒绝</div>
      </div>
    )
  }
};

// 响应式设计
export const ResponsiveDesign: Story = {
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
  args: {
    execution: mockToolExecutions.success('Bash', mockToolInputs.bash(), 'Command executed successfully'),
    subtitle: 'Responsive test component',
    children: (
      <div className="p-3 bg-gray-50 rounded">
        这个组件会在不同屏幕尺寸下自动调整布局
      </div>
    )
  }
};