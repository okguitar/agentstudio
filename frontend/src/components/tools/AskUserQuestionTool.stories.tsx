import type { Meta, StoryObj } from '@storybook/react';
import { AskUserQuestionTool } from './AskUserQuestionTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/AskUserQuestionTool',
  component: AskUserQuestionTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'AskUserQuestionTool 用于向用户提问并收集反馈，支持单选和多选问题。'
      }
    }
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AskUserQuestionTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 单选问题示例
export const SingleSelection: Story = {
  args: {
    execution: mockToolExecutions.success(
      'AskUserQuestion',
      mockToolInputs.askUserQuestion({
        questions: [
          {
            question: '请选择您偏好的状态管理方案',
            header: '状态管理',
            options: [
              {
                label: 'Redux',
                description: '可预测的状态容器，支持中间件'
              },
              {
                label: 'Zustand',
                description: '简单快速的状态管理解决方案'
              },
              {
                label: 'Context API',
                description: 'React 内置的状态管理解决方案'
              }
            ],
            multiSelect: false
          }
        ]
      }),
      '用户选择了: Zustand - 简单快速的状态管理解决方案'
    )
  }
};

// 多选问题示例
export const MultipleSelection: Story = {
  args: {
    execution: mockToolExecutions.success(
      'AskUserQuestion',
      mockToolInputs.askUserQuestion({
        questions: [
          {
            question: '请选择需要安装的依赖包',
            header: '依赖管理',
            options: [
              {
                label: 'React Query',
                description: '用于服务器状态管理'
              },
              {
                label: 'React Hook Form',
                description: '表单处理和验证'
              },
              {
                label: 'React Router',
                description: '路由管理'
              },
              {
                label: 'Axios',
                description: 'HTTP 客户端'
              }
            ],
            multiSelect: true
          }
        ]
      }),
      '用户选择了: React Query, React Hook Form, React Router'
    )
  }
};

// 多个问题示例
export const MultipleQuestions: Story = {
  args: {
    execution: mockToolExecutions.success(
      'AskUserQuestion',
      mockToolInputs.askUserQuestion({
        questions: [
          {
            question: '您希望使用哪种样式方案？',
            header: '样式系统',
            options: [
              {
                label: 'TailwindCSS',
                description: '实用优先的 CSS 框架'
              },
              {
                label: 'Styled Components',
                description: 'CSS-in-JS 解决方案'
              },
              {
                label: 'CSS Modules',
                description: '局部作用域的 CSS'
              }
            ],
            multiSelect: false
          },
          {
            question: '选择您需要的功能模块',
            header: '功能模块',
            options: [
              {
                label: '用户认证',
                description: '登录注册和权限管理'
              },
              {
                label: '数据可视化',
                description: '图表和仪表板'
              },
              {
                label: '文件上传',
                description: '支持多种文件格式上传'
              }
            ],
            multiSelect: true
          }
        ]
      }),
      '用户回答: 1. TailwindCSS, 2. 用户认证 + 数据可视化'
    )
  }
};

// 等待状态
export const PendingState: Story = {
  args: {
    execution: mockToolExecutions.pending(
      'AskUserQuestion',
      mockToolInputs.askUserQuestion({
        questions: [
          {
            question: '请确认您的选择',
            header: '确认操作',
            options: [
              {
                label: '继续',
                description: '执行当前操作'
              },
              {
                label: '取消',
                description: '取消当前操作'
              }
            ],
            multiSelect: false
          }
        ]
      })
    )
  }
};

// 执行中状态
export const ExecutingState: Story = {
  args: {
    execution: mockToolExecutions.executing(
      'AskUserQuestion',
      mockToolInputs.askUserQuestion({
        questions: [
          {
            question: '请选择部署环境',
            header: '部署配置',
            options: [
              {
                label: '开发环境',
                description: '用于开发和测试'
              },
              {
                label: '生产环境',
                description: '正式运行环境'
              }
            ],
            multiSelect: false
          }
        ]
      })
    )
  }
};