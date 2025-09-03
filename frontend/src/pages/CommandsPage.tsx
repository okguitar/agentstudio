import React, { useState } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Command,
  Globe,
  User,
  Folder,
  AlertCircle
} from 'lucide-react';
import { SlashCommand, SlashCommandFilter, COMMAND_SCOPES } from '../types/commands';
import { useCommands, useDeleteCommand } from '../hooks/useCommands';
import { CommandForm } from '../components/CommandForm';

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

  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const key = command.namespace || '__root__';
    if (!groups[key]) groups[key] = [];
    groups[key].push(command);
    return groups;
  }, {} as Record<string, SlashCommand[]>);

  const getScopeIcon = (scope: 'project' | 'user') => {
    return scope === 'project' ? Globe : User;
  };

  const getScopeColor = (scope: 'project' | 'user') => {
    return scope === 'project' ? 'text-blue-600' : 'text-green-600';
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
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Command className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">自定义命令</h1>
                <p className="text-gray-600">管理 Slash Commands</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingCommand(null);
                setShowForm(true);
              }}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>新建命令</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="搜索命令..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Scope Filter */}
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="text-center py-12">
              <Command className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无自定义命令</h3>
              <p className="text-gray-600 mb-6">创建你的第一个自定义 Slash Command</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                创建命令
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedCommands).map(([namespace, commands]) => (
                <div key={namespace} className="bg-white rounded-lg shadow">
                  {/* Group Header */}
                  {namespace !== '__root__' && (
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                      <div className="flex items-center space-x-2">
                        <Folder className="h-5 w-5 text-gray-600" />
                        <h3 className="font-medium text-gray-900">{namespace}</h3>
                        <span className="text-sm text-gray-500">({commands.length})</span>
                      </div>
                    </div>
                  )}

                  {/* Commands List */}
                  <div className="divide-y divide-gray-200">
                    {commands.map((command) => {
                      const ScopeIcon = getScopeIcon(command.scope);
                      return (
                        <div key={command.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-medium text-gray-900">
                                  /{command.name}
                                </h4>
                                <div className={`flex items-center space-x-1 ${getScopeColor(command.scope)}`}>
                                  <ScopeIcon className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {COMMAND_SCOPES.find(s => s.value === command.scope)?.label}
                                  </span>
                                </div>
                                {command.argumentHint && (
                                  <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                                    {command.argumentHint}
                                  </code>
                                )}
                              </div>
                              
                              <p className="text-gray-600 mb-3 line-clamp-2">
                                {command.description}
                              </p>
                              
                              <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                                {command.model && (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {command.model}
                                  </span>
                                )}
                                {command.allowedTools && command.allowedTools.length > 0 && (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                    {command.allowedTools.length} 工具
                                  </span>
                                )}
                                <span className="text-gray-400">
                                  更新于 {new Date(command.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => {
                                  setEditingCommand(command);
                                  setShowForm(true);
                                }}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="编辑"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(command)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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