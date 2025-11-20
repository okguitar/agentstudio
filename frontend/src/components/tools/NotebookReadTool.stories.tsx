import type { Meta, StoryObj } from '@storybook/react';
import { NotebookReadTool } from './NotebookReadTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/NotebookReadTool',
  component: NotebookReadTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'NotebookReadTool 用于读取 Jupyter Notebook 单元格内容，支持代码和 Markdown 的显示。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof NotebookReadTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotebookReadStates: Story = {
  args: {
    execution: mockToolExecutions.pending('NotebookRead', mockToolInputs.notebookReadTool())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Notebook 读取状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待读取</h4>
          <NotebookReadTool
            execution={mockToolExecutions.pending('NotebookRead', mockToolInputs.notebookReadTool())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">读取中</h4>
          <NotebookReadTool
            execution={mockToolExecutions.executing('NotebookRead', mockToolInputs.notebookReadTool({
              notebook_path: '/Users/kongjie/slides/ai-editor/notebooks/analysis.ipynb',
              cell_id: 'cell-python-001'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">读取成功 - 代码单元格</h4>
          <NotebookReadTool
            execution={mockToolExecutions.success(
              'NotebookRead',
              mockToolInputs.notebookReadTool(),
              `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# 数据加载
data = pd.read_csv('dataset.csv')
print(f"Dataset shape: {data.shape}")

# 基础统计
print(data.describe())`
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">读取失败</h4>
          <NotebookReadTool
            execution={mockToolExecutions.error(
              'NotebookRead',
              mockToolInputs.notebookReadTool({ cell_id: 'nonexistent-cell' }),
              'Error: Cell not found in notebook'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const ReadContentTypes: Story = {
  args: {
    execution: mockToolExecutions.pending('NotebookRead', mockToolInputs.notebookReadTool())
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同内容类型</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">数据分析代码</h4>
          <NotebookReadTool
            execution={mockToolExecutions.pending('NotebookRead', mockToolInputs.notebookReadTool({
              notebook_path: 'notebooks/data_science.ipynb',
              cell_id: 'cell-analysis-001'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">Markdown 文档</h4>
          <NotebookReadTool
            execution={mockToolExecutions.pending('NotebookRead', mockToolInputs.notebookReadTool({
              notebook_path: 'notebooks/documentation.ipynb',
              cell_id: 'cell-docs-intro'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">机器学习模型</h4>
          <NotebookReadTool
            execution={mockToolExecutions.pending('NotebookRead', mockToolInputs.notebookReadTool({
              notebook_path: 'notebooks/ml_experiment.ipynb',
              cell_id: 'cell-ml-model'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">可视化代码</h4>
          <NotebookReadTool
            execution={mockToolExecutions.pending('NotebookRead', mockToolInputs.notebookReadTool({
              notebook_path: 'notebooks/visualization.ipynb',
              cell_id: 'cell-plot-001'
            }))}
          />
        </div>
      </div>
    </div>
  )
};
