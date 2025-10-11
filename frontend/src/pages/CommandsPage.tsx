import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  // Globe,
  // User,
  AlertCircle,
  Clock,
  Tag,
  Code
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SlashCommand, SlashCommandFilter } from '../types/commands';
import { useCommands, useDeleteCommand } from '../hooks/useCommands';
import { CommandForm } from '../components/CommandForm';
import { formatRelativeTime } from '../utils';
import { getToolDisplayName } from '@agentstudio/shared/utils/toolMapping';
import { useMobileContext } from '../contexts/MobileContext';

export const CommandsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const [filter] = useState<SlashCommandFilter>({ scope: 'user' });
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

  // const getScopeIcon = (scope: 'project' | 'user') => {
  //   return scope === 'project' ? Globe : User;
  // };



  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('commands.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg mb-2">{t('commands.error.loadFailed')}</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('commands.error.cannotLoadCommands')}</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t('commands.error.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isMobile ? 'p-4' : 'p-8'}>
      {/* Header */}
      <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
        <div className={`${isMobile ? 'mb-4' : 'flex items-center justify-between mb-6'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>{t('commands.title')}</h1>
            <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'mt-1' : 'mt-2'}`}>{t('commands.subtitle')}</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className={`${isMobile ? 'space-y-3' : 'flex items-center space-x-4'}`}>
          {/* Search */}
          <div className={`${isMobile ? '' : 'flex-1'} bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${isMobile ? 'p-3' : 'p-4'}`}>
            <div className={`${isMobile ? 'flex items-center space-x-2' : 'flex items-center space-x-4'}`}>
              <div className="flex-1 relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <input
                  type="text"
                  placeholder={t('commands.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${isMobile ? 'text-sm' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={() => {
              setEditingCommand(null);
              setShowForm(true);
            }}
            className={`${isMobile ? 'w-full py-2.5 px-4' : 'flex items-center space-x-2 px-6 py-3'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isMobile ? 'text-sm' : ''}`}
          >
            <Plus className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            <span>{t('commands.createButton')}</span>
          </button>
        </div>
      </div>

      {/* Commands Display */}
      {filteredCommands.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className={`${isMobile ? 'text-4xl' : 'text-6xl'} mb-4`}>⚡</div>
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-medium text-gray-900 dark:text-white mb-2`}>
            {searchTerm ? t('commands.empty.noMatchingCommands') : t('commands.empty.noCommands')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm
              ? t('commands.empty.adjustSearch')
              : t('commands.empty.createFirst')
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setEditingCommand(null);
                setShowForm(true);
              }}
              className={`${isMobile ? 'w-full py-3 px-4' : 'px-6 py-3'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
            >
              {t('commands.createButton')}
            </button>
          )}
        </div>
      ) : (
        <>
          {isMobile ? (
            /* Mobile Card View */
            <div className="space-y-4">
              {filteredCommands.map((command, index) => (
                <div
                  key={command.id + '-' + index}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  {/* Command Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`${isMobile ? 'text-lg' : 'text-xl'} mr-3`}>⚡</div>
                      <div>
                        <div className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 dark:text-white`}>
                          {command.namespace ? `/${command.namespace}:${command.name}` : `/${command.name}`}
                          {command.argumentHint && (
                            <code className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded text-xs">
                              {command.argumentHint}
                            </code>
                          )}
                        </div>
                        {command.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {command.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Command Details */}
                  <div className="space-y-2 mb-4">
                    {/* Model */}
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400 mr-2">{t('commands.table.model')}:</span>
                      {command.model ? (
                        <div className="flex items-center text-gray-900 dark:text-white">
                          <Code className="w-3 h-3 mr-1" />
                          <span className="text-sm">{command.model}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('commands.table.inheritSettings')}</span>
                      )}
                    </div>

                    {/* Tools */}
                    <div className="flex items-start text-sm">
                      <span className="text-gray-500 dark:text-gray-400 mr-2 mt-1">{t('commands.table.tools')}:</span>
                      {command.allowedTools && command.allowedTools.length > 0 ? (
                        <div className="flex-1">
                          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 mb-1">
                            <Tag className="w-3 h-3" />
                            <span className="text-xs">{t('commands.table.toolsCount', { count: command.allowedTools.length })}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {command.allowedTools.map((tool, idx) => (
                              <code key={idx} className="bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs">
                                {getToolDisplayName(tool)}
                              </code>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('commands.table.inheritSettings')}</span>
                      )}
                    </div>

                    {/* Created At */}
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400 mr-2">{t('commands.table.createdAt')}:</span>
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatRelativeTime(command.createdAt || command.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setEditingCommand(command);
                        setShowForm(true);
                      }}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/50 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      {t('commands.actions.edit')}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(command)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                      title={t('commands.actions.deleteCommand')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop Table View */
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('commands.table.command')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('commands.table.model')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('commands.table.tools')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('commands.table.createdAt')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('commands.table.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommands.map((command, index) => {
                    // const ScopeIcon = getScopeIcon(command.scope);
                    return (
                      <TableRow
                        key={command.id + '-' + index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-xl mr-3">⚡</div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {command.namespace ? `/${command.namespace}:${command.name}` : `/${command.name}`}
                                {command.argumentHint && (
                                  <code className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded text-xs">
                                    {command.argumentHint}
                                  </code>
                                )}
                              </div>
                              {command.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {command.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {command.model ? (
                            <div className="text-sm text-gray-900 dark:text-white">
                              <Code className="w-3 h-3 inline mr-1" />
                              {command.model}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('commands.table.inheritSettings')}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {command.allowedTools && command.allowedTools.length > 0 ? (
                            <div>
                              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <Tag className="w-3 h-3" />
                                <span>{t('commands.table.toolsCount', { count: command.allowedTools.length })}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {command.allowedTools.map((tool, idx) => (
                                  <code key={idx} className="bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs">
                                    {getToolDisplayName(tool)}
                                  </code>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('commands.table.inheritSettings')}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatRelativeTime(command.createdAt || command.updatedAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingCommand(command);
                                setShowForm(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/50 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors"
                              title={t('commands.actions.editCommand')}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              {t('commands.actions.edit')}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(command)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                              title={t('commands.actions.deleteCommand')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'w-full max-w-sm' : 'max-w-md w-full mx-4'} p-6`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-red-600`} />
              </div>
              <div className="flex-1">
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white`}>{t('commands.delete.title')}</h3>
              </div>
            </div>

            <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'mb-4 text-sm' : 'mb-6'}`}>
              {t('commands.delete.confirmMessage', { name: showDeleteConfirm.name })}
            </p>

            <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex justify-end space-x-3'}`}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-2'} text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors`}
              >
                {t('commands.delete.cancel')}
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleteCommand.isPending}
                className={`${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-2'} bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50`}
              >
                {deleteCommand.isPending ? t('commands.delete.deleting') : t('commands.delete.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};