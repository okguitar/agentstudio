import type { Meta, StoryObj } from '@storybook/react';
import { NotebookEditTool } from './NotebookEditTool';
import { mockToolExecutions, mockToolInputs } from './__mocks__/toolTestData';

const meta = {
  title: 'Tools/NotebookEditTool',
  component: NotebookEditTool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'NotebookEditTool 用于编辑 Jupyter Notebook 单元格，支持代码和 Markdown 内容。'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof NotebookEditTool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotebookEditStates: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Notebook 编辑状态</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">等待编辑</h4>
          <NotebookEditTool
            execution={mockToolExecutions.pending('NotebookEdit', mockToolInputs.notebookEdit())}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">编辑中</h4>
          <NotebookEditTool
            execution={mockToolExecutions.executing('NotebookEdit', mockToolInputs.notebookEdit({
              notebook_path: '/Users/kongjie/slides/ai-editor/notebooks/data_analysis.ipynb',
              new_source: 'import pandas as pd\nimport matplotlib.pyplot as plt\ndf = pd.read_csv("data.csv")\ndf.head()',
              cell_type: 'code'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">编辑成功</h4>
          <NotebookEditTool
            execution={mockToolExecutions.success(
              'NotebookEdit',
              mockToolInputs.notebookEdit(),
              'Cell updated successfully'
            )}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">编辑失败</h4>
          <NotebookEditTool
            execution={mockToolExecutions.error(
              'NotebookEdit',
              mockToolInputs.notebookEdit({ notebook_path: '/nonexistent/notebook.ipynb' }),
              'Error: Notebook file not found'
            )}
          />
        </div>
      </div>
    </div>
  )
};

export const EditOperations: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">不同编辑操作</h3>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">代码单元格替换</h4>
          <NotebookEditTool
            execution={mockToolExecutions.pending('NotebookEdit', mockToolInputs.notebookEdit({
              notebook_path: 'notebooks/machine_learning.ipynb',
              new_source: 'from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)',
              cell_id: 'cell-abc123',
              cell_type: 'code',
              edit_mode: 'replace'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">Markdown 单元格更新</h4>
          <NotebookEditTool
            execution={mockToolExecutions.pending('NotebookEdit', mockToolInputs.notebookEdit({
              notebook_path: 'notebooks/report.ipynb',
              new_source: '# Data Analysis Report\n\n## Summary\nThis notebook contains analysis of customer data.',
              cell_id: 'cell-markdown-001',
              cell_type: 'markdown',
              edit_mode: 'replace'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">单元格插入</h4>
          <NotebookEditTool
            execution={mockToolExecutions.pending('NotebookEdit', mockToolInputs.notebookEdit({
              notebook_path: 'notebooks/experiment.ipynb',
              new_source: '# 新增实验\n\n这是新增的实验记录单元格。',
              cell_id: 'cell-new-001',
              cell_type: 'markdown',
              edit_mode: 'insert'
            }))}
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">单元格删除</h4>
          <NotebookEditTool
            execution={mockToolExecutions.pending('NotebookEdit', mockToolInputs.notebookEdit({
              notebook_path: 'notebooks/cleanup.ipynb',
              cell_id: 'cell-delete-001',
              cell_type: 'code',
              edit_mode: 'delete'
            }))}
          />
        </div>
      </div>
    </div>
  )
};
