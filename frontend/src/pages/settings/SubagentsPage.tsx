import React, { useState } from 'react';
import { 
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  Calendar,
  Tag
} from 'lucide-react';
import { Subagent } from '../../types/subagents';
import { useSubagents, useDeleteSubagent } from '../../hooks/useSubagents';
import { SubagentForm } from '../../components/SubagentForm';
import { formatRelativeTime } from '../../utils';
import { getToolDisplayName } from '../../../shared/utils/toolMapping';

export const SubagentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubagent, setEditingSubagent] = useState<Subagent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Subagent | null>(null);

  const { data: subagents = [], isLoading, error, refetch } = useSubagents({
    search: searchTerm.trim() || undefined
  });
  
  const deleteSubagent = useDeleteSubagent();

  const handleDelete = async (subagent: Subagent) => {
    try {
      await deleteSubagent.mutateAsync(subagent.id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete subagent:', error);
    }
  };

  const handleEdit = (subagent: Subagent) => {
    setEditingSubagent(subagent);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSubagent(null);
  };

  const handleFormSuccess = () => {
    refetch();
  };



  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">正在加载 Subagents...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">无法加载 Subagents 列表</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subagent 管理</h1>
            <p className="text-gray-600 mt-2">管理专门的 AI 子代理</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索 Subagents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setEditingSubagent(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>新建 Subagent</span>
          </button>
        </div>
      </div>

      {/* Subagents Table */}
      {subagents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchTerm ? '未找到匹配的 Subagents' : '还没有 Subagents'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? '尝试调整搜索条件'
              : '创建你的第一个专门的 AI 子代理来处理特定任务'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setEditingSubagent(null);
                setShowForm(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              新建 Subagent
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subagent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工具
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subagents.map((subagent, index) => (
                  <tr 
                    key={subagent.id + '-' + index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-xl mr-3">🤖</div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {subagent.name}
                          </div>
                          {subagent.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {subagent.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {subagent.tools && subagent.tools.length > 0 ? (
                        <div>
                          <div className="flex items-center space-x-1 text-sm text-gray-500 mb-1">
                            <Tag className="w-3 h-3" />
                            <span>{subagent.tools.length} 个工具</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {subagent.tools.map((tool, toolIndex) => (
                              <code key={toolIndex} className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs">
                                {getToolDisplayName(tool)}
                              </code>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">继承对话设置</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatRelativeTime(subagent.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(subagent)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                          title="编辑 Subagent"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          编辑
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(subagent)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除 Subagent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <SubagentForm
          subagent={editingSubagent}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-gray-600">
                确定要删除 Subagent "<strong>{showDeleteConfirm.name}</strong>" 吗？
              </p>
              <p className="text-sm text-gray-500 mt-2">
                此操作无法撤销。
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleteSubagent.isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
              >
                {deleteSubagent.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>删除</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
