import React, { useState } from 'react';
import { 
  Plus,
  Search,
  Edit,
  Trash2,
  Bot,
  User,
  AlertCircle,
  Calendar,
  Wrench
} from 'lucide-react';
import { Subagent } from '../../types/subagents';
import { useSubagents, useDeleteSubagent } from '../../hooks/useSubagents';
import { SubagentForm } from '../../components/SubagentForm';

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
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
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
    <div className="space-y-6">
      {/* Header */}
      <div>
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

      {/* Subagents List */}
      <div className="space-y-4">
        {subagents.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? '未找到匹配的 Subagents' : '还没有 Subagents'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? '请尝试使用不同的关键词搜索'
                : '创建你的第一个专门的 AI 子代理来处理特定任务'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => {
                  setEditingSubagent(null);
                  setShowForm(true);
                }}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>创建 Subagent</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {subagents.map((subagent) => (
              <div
                key={subagent.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {subagent.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            <User className="h-3 w-3 mr-1" />
                            个人
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">
                        {subagent.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            创建于 {new Date(subagent.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        {subagent.tools && subagent.tools.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Wrench className="h-4 w-4" />
                            <span>{subagent.tools.length} 个工具</span>
                          </div>
                        )}
                      </div>

                      {subagent.tools && subagent.tools.length > 0 && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1">
                            {subagent.tools.slice(0, 5).map((tool, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                              >
                                {tool}
                              </span>
                            ))}
                            {subagent.tools.length > 5 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                                +{subagent.tools.length - 5} 更多
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(subagent)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(subagent)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* System prompt preview */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {subagent.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
