import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  Clock,
  Tag,
  Code,
  X,
  Terminal
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SlashCommand } from '../types/commands';
import { useProjectCommands, useDeleteProjectCommand } from '../hooks/useCommands';
import { CommandForm } from '../components/CommandForm';
import { formatRelativeTime } from '../utils';
import { getToolDisplayName } from '../utils/toolMapping';
import { useMobileContext } from '../contexts/MobileContext';

interface Project {
  id: string;
  name: string;
  path: string;
}

interface ProjectCommandsModalProps {
  project: Project;
  onClose: () => void;
}

export const ProjectCommandsModal: React.FC<ProjectCommandsModalProps> = ({
  project,
  onClose
}) => {
  const { t } = useTranslation('components');
  const { isMobile } = useMobileContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCommand, setEditingCommand] = useState<SlashCommand | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<SlashCommand | null>(null);

  const { data: commands = [], isLoading, error, refetch } = useProjectCommands({
    projectId: project.id,
    search: searchTerm.trim() || undefined
  });

  const deleteCommand = useDeleteProjectCommand(project.id);

  const handleDelete = async (command: SlashCommand) => {
    try {
      await deleteCommand.mutateAsync(command.id);
      setShowDeleteConfirm(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete command:', error);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCommand(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-600 dark:text-gray-400">{t('projectCommandsModal.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('projectCommandsModal.error.title')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('projectCommandsModal.error.message')}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('projectCommandsModal.error.retry')}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('projectCommandsModal.error.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${isMobile ? 'max-w-full h-[95vh]' : 'max-w-6xl h-[80vh]'} flex flex-col`}>
        {/* Header */}
        <div className={`${isMobile ? 'p-4' : 'p-6'} border-b border-gray-200 dark:border-gray-700`}>
          <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
            <Terminal className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-600`} />
            <div className="flex-1 min-w-0">
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 dark:text-white truncate`}>{t('projectCommandsModal.title')}</h2>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 truncate`}>{project.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
            >
              <X className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </button>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className={`${isMobile ? 'p-4' : 'p-6'} border-b border-gray-200 dark:border-gray-700`}>
          <div className={`${isMobile ? 'space-y-3' : 'flex items-center space-x-4'}`}>
            <div className={isMobile ? '' : 'flex-1 relative'}>
              <Search className={`${isMobile ? 'absolute left-3 top-1/2 transform -translate-y-1/2' : 'absolute left-3 top-1/2 transform -translate-y-1/2'} text-gray-400 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <input
                type="text"
                placeholder={t('projectCommandsModal.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isMobile ? 'pl-10' : 'pl-10'} pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${isMobile ? 'text-sm' : ''}`}
              />
            </div>
            <button
              onClick={() => {
                setEditingCommand(null);
                setShowForm(true);
              }}
              className={`${isMobile ? 'w-full py-2.5 px-4 flex items-center justify-center space-x-2' : 'flex items-center space-x-2 px-4 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap ${isMobile ? 'text-sm' : ''}`}
            >
              <Plus className={isMobile ? 'w-4 h-4' : 'w-4 h-4'} />
              <span>{t('projectCommandsModal.createButton')}</span>
            </button>
          </div>
        </div>

        {/* Commands Display */}
        <div className="flex-1 overflow-auto">
          {commands.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-8' : 'py-16'}`}>
              <div className={`${isMobile ? 'text-4xl' : 'text-6xl'} mb-4`}>⚡</div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-medium text-gray-900 dark:text-white mb-2`}>
                {searchTerm ? t('projectCommandsModal.emptyState.noMatchTitle') : t('projectCommandsModal.emptyState.noCommandsTitle')}
              </h3>
              <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'mb-4' : 'mb-6'}`}>
                {searchTerm
                  ? t('projectCommandsModal.emptyState.noMatchDescription')
                  : t('projectCommandsModal.emptyState.noCommandsDescription')
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
                  {t('projectCommandsModal.createButton')}
                </button>
              )}
            </div>
          ) : (
            <>
              {isMobile ? (
                /* Mobile Card View */
                <div className="p-4 space-y-4">
                  {commands.map((command, index) => (
                    <div
                      key={command.id + '-' + index}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      {/* Command Header */}
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="text-xl mr-3">⚡</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-medium text-gray-900 dark:text-white mb-1">
                            {command.namespace ? `/${command.namespace}:${command.name}` : `/${command.name}`}
                            {command.argumentHint && (
                              <code className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded text-xs">
                                {command.argumentHint}
                              </code>
                            )}
                          </div>
                          {command.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {command.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Command Details */}
                      <div className="space-y-2 mb-4">
                        {/* Model */}
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 dark:text-gray-400 mr-2">{t('projectCommandsModal.table.model')}:</span>
                          {command.model ? (
                            <div className="flex items-center text-gray-900 dark:text-white">
                              <Code className="w-3 h-3 mr-1" />
                              <span className="text-sm">{command.model}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('projectCommandsModal.table.inheritSettings')}</span>
                          )}
                        </div>

                        {/* Tools */}
                        <div className="flex items-start text-sm">
                          <span className="text-gray-500 dark:text-gray-400 mr-2 mt-1">{t('projectCommandsModal.table.tools')}:</span>
                          {command.allowedTools && command.allowedTools.length > 0 ? (
                            <div className="flex-1">
                              <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 mb-1">
                                <Tag className="w-3 h-3" />
                                <span className="text-xs">{t('projectCommandsModal.table.toolsCount', { count: command.allowedTools.length })}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {command.allowedTools.map((tool, idx) => (
                                  <code key={idx} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs">
                                    {getToolDisplayName(tool)}
                                  </code>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('projectCommandsModal.table.inheritSettings')}</span>
                          )}
                        </div>

                        {/* Created At */}
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 dark:text-gray-400 mr-2">{t('projectCommandsModal.table.createdAt')}:</span>
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
                          {t('projectCommandsModal.actions.edit')}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(command)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                          title={t('projectCommandsModal.actions.deleteTooltip')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Desktop Table View */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('projectCommandsModal.table.command')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('projectCommandsModal.table.model')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('projectCommandsModal.table.tools')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('projectCommandsModal.table.createdAt')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('projectCommandsModal.table.actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commands.map((command, index) => (
                      <TableRow
                        key={command.id + '-' + index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-xl mr-3">⚡</div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {command.namespace ? `/${command.namespace}:${command.name}` : `/${command.name}`}
                                {command.argumentHint && (
                                  <code className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-xs">
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
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('projectCommandsModal.table.inheritSettings')}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {command.allowedTools && command.allowedTools.length > 0 ? (
                            <div>
                              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <Tag className="w-3 h-3" />
                                <span>{t('projectCommandsModal.table.toolsCount', { count: command.allowedTools.length })}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {command.allowedTools.map((tool, idx) => (
                                  <code key={idx} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs">
                                    {getToolDisplayName(tool)}
                                  </code>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('projectCommandsModal.table.inheritSettings')}</span>
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
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                              title={t('projectCommandsModal.actions.editTooltip')}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              {t('projectCommandsModal.actions.edit')}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(command)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('projectCommandsModal.actions.deleteTooltip')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </div>

        {/* Command Form Modal */}
        {showForm && (
          <CommandForm
            command={editingCommand}
            projectId={project.id}
            onClose={() => {
              setShowForm(false);
              setEditingCommand(null);
            }}
            onSuccess={handleFormSuccess}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'w-full max-w-sm' : 'max-w-md w-full mx-4'} p-6`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertCircle className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-red-600`} />
                </div>
                <div className="flex-1">
                  <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white`}>{t('projectCommandsModal.deleteConfirm.title')}</h3>
                </div>
              </div>

              <p className={`${isMobile ? 'text-sm mb-4' : 'mb-6'} text-gray-600 dark:text-gray-400`}>
                {t('projectCommandsModal.deleteConfirm.message', { name: showDeleteConfirm.name })}
              </p>

              <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex justify-end space-x-3'}`}>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className={`${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-2'} text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors`}
                >
                  {t('projectCommandsModal.deleteConfirm.cancel')}
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deleteCommand.isPending}
                  className={`${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-2'} bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50`}
                >
                  {deleteCommand.isPending ? t('projectCommandsModal.deleteConfirm.deleting') : t('projectCommandsModal.deleteConfirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};