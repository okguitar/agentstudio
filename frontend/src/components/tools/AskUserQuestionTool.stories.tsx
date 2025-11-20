import type { Meta, StoryObj } from '@storybook/react';
import { AskUserQuestionTool } from './AskUserQuestionTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/AskUserQuestionTool',
  component: AskUserQuestionTool,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AskUserQuestionTool>;

export default meta;
type Story = StoryObj<typeof meta>;

// 单选问题示例
export const SingleChoice: Story = {
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
      })
    )
  },
};

// 多选问题示例
export const MultiChoice: Story = {
  args: {
    execution: mockToolExecutions.executing(
      'AskUserQuestion',
      mockToolInputs.askUserQuestion({
        questions: [
          {
            question: '请选择您需要的功能特性',
            header: '功能需求',
            options: [
              {
                label: '实时协作',
                description: '支持多用户同时编辑'
              },
              {
                label: '版本控制',
                description: 'Git 集成和历史记录'
              },
              {
                label: '插件系统',
                description: '可扩展的插件架构'
              },
              {
                label: 'API 集成',
                description: '第三方服务集成'
              }
            ],
            multiSelect: true
          }
        ]
      })
    )
  },
};