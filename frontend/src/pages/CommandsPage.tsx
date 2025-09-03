import React, { useState } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Globe,
  User,
  Folder,
  AlertCircle,
  Clock,
  Tag,
  Code
} from 'lucide-react';
import { SlashCommand, SlashCommandFilter, COMMAND_SCOPES } from '../types/commands';
import { useCommands, useDeleteCommand } from '../hooks/useCommands';
import { CommandForm } from '../components/CommandForm';
import { formatRelativeTime } from '../utils';

export const CommandsPage: React.FC = () => {
  const [filter, setFilter] = useState<SlashCommandFilter>({ scope: 'user' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCommand, setEditingCommand] = useState<SlashCommand | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<SlashCommand | null>(null);

  const { data: commands = [], isLoading, error, refetch } = useCommands({
    ...filter,
    search: searchTerm.trim() || undefined
  });
  
  const deleteCommand = useDeleteCommand();

  const handleDelete = async (command: SlashCommand) => {
    try {
      await deleteCommand.mutateAsync(command.id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete command:', error);
    }
  };

  const filteredCommands = commands.filter(cmd => {
    if (filter.scope && filter.scope !== 'all' && cmd.scope !== filter.scope) return false;
    if (filter.namespace && cmd.namespace !== filter.namespace) return false;
    return true;
  });

  const getScopeIcon = (scope: 'project' | 'user') => {
    return scope === 'project' ? Globe : User;
  };



  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载命令中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg mb-2">加载失败</p>
          <p className="text-gray-600 mb-4">无法加载自定义命令</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
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
            <h1 className="text-3xl font-bold text-gray-900">自定义命令</h1>
            <p className="text-gray-600 mt-2">管理 Slash Commands</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="搜索命令..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filter.scope || 'all'}
                  onChange={(e) => setFilter({ ...filter, scope: e.target.value as any })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部</option>
                  {COMMAND_SCOPES.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingCommand(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>新建命令</span>
          </button>
        </div>
      </div>

      {/* Commands Table */}
      {filteredCommands.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchTerm ? '未找到匹配的命令' : '还没有自定义命令'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? '尝试调整搜索条件或筛选器'
              : '创建你的第一个自定义 Slash Command'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setEditingCommand(null);
                setShowForm(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              新建命令
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
                    命令
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作用域
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    模型/工具
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    命名空间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    更新时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCommands.map((command, index) => {
                  const ScopeIcon = getScopeIcon(command.scope);
                  return (
                    <tr 
                      key={command.id + '-' + index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-xl mr-3">⚡</div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              /{command.name}
                              {command.argumentHint && (
                                <code className="ml-2 bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs">
                                  {command.argumentHint}
                                </code>
                              )}
                            </div>
                            {command.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {command.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            command.scope === 'project' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          <ScopeIcon className="w-3 h-3 mr-1" />
                          {COMMAND_SCOPES.find(s => s.value === command.scope)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {command.model && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Code className="w-3 h-3" />
                              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                                {command.model}
                              </span>
                            </div>
                          )}
                          {command.allowedTools && command.allowedTools.length > 0 && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Tag className="w-3 h-3" />
                              <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs">
                                {command.allowedTools.length} 工具
                              </span>
                            </div>
                          )}
                          {!command.model && (!command.allowedTools || command.allowedTools.length === 0) && (
                            <span className="text-sm text-gray-400">无限制</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {command.namespace ? (
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Folder className="w-4 h-4" />
                            <span>{command.namespace}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">根目录</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatRelativeTime(command.updatedAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setEditingCommand(command);
                              setShowForm(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                            title="编辑命令"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            编辑
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(command)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除命令"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Command Form Modal */}
      {showForm && (
        <CommandForm
          command={editingCommand}
          onClose={() => {
            setShowForm(false);
            setEditingCommand(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingCommand(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">删除命令</h3>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              确定要删除命令 "/{showDeleteConfirm.name}" 吗？此操作无法撤销。
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleteCommand.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteCommand.isPending ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};