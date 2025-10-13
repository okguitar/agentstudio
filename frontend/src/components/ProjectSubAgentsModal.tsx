import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  Calendar,
  Tag,
  X,
  Bot
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Subagent } from '../types/subagents';
import { useProjectSubagents, useDeleteProjectSubagent } from '../hooks/useSubagents';
import { SubagentForm } from '../components/SubagentForm';
import { formatRelativeTime } from '../utils';
import { getToolDisplayName } from 'agentstudio-shared/utils/toolMapping';
import { useMobileContext } from '../contexts/MobileContext';

interface Project {
  id: string;
  name: string;
  path: string;
}

interface ProjectSubAgentsModalProps {
  project: Project;
  onClose: () => void;
}

export const ProjectSubAgentsModal: React.FC<ProjectSubAgentsModalProps> = ({
  project,
  onClose
}) => {
  const { t } = useTranslation('components');
  const { isMobile } = useMobileContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubagent, setEditingSubagent] = useState<Subagent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Subagent | null>(null);

  const { data: subagents = [], isLoading, error, refetch } = useProjectSubagents({
    projectId: project.id,
    search: searchTerm.trim() || undefined
  });
  
  const deleteSubagent = useDeleteProjectSubagent(project.id);

  const handleDelete = async (subagent: Subagent) => {
    try {
      await deleteSubagent.mutateAsync(subagent.id);
      setShowDeleteConfirm(null);
      refetch();
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
    setShowForm(false);
    setEditingSubagent(null);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${isMobile ? 'max-w-full h-[95vh]' : 'max-w-6xl h-[80vh]'} flex items-center justify-center`}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-600 dark:text-gray-400">{t('projectSubAgentsModal.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${isMobile ? 'max-w-full h-[95vh]' : 'max-w-6xl h-[80vh]'} flex items-center justify-center`}>
          <div className={`text-center ${isMobile ? 'px-6' : ''}`}>
            <AlertCircle className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-red-500 mx-auto mb-4`} />
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white mb-2`}>{t('projectSubAgentsModal.error.loadFailed')}</h3>
            <p className={`${isMobile ? 'text-sm' : ''} text-gray-600 dark:text-gray-400 mb-4`}>{t('projectSubAgentsModal.error.loadFailedMessage')}</p>
            <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex justify-center space-x-3'}`}>
              <button
                onClick={() => refetch()}
                className={`${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
              >
                {t('projectSubAgentsModal.actions.retry')}
              </button>
              <button
                onClick={onClose}
                className={`${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-2'} text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
              >
                {t('projectSubAgentsModal.actions.close')}
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
            <Bot className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-purple-600`} />
            <div className="flex-1 min-w-0">
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 dark:text-white truncate`}>{t('projectSubAgentsModal.title')}</h2>
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
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <input
                type="text"
                placeholder={t('projectSubAgentsModal.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isMobile ? 'pl-10' : 'pl-10'} pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${isMobile ? 'text-sm' : ''}`}
              />
            </div>
            <button
              onClick={() => {
                setEditingSubagent(null);
                setShowForm(true);
              }}
              className={`${isMobile ? 'w-full py-2.5 px-4 flex items-center justify-center space-x-2' : 'flex items-center space-x-2 px-4 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap ${isMobile ? 'text-sm' : ''}`}
            >
              <Plus className={isMobile ? 'w-4 h-4' : 'w-4 h-4'} />
              <span>{t('projectSubAgentsModal.actions.create')}</span>
            </button>
          </div>
        </div>

        {/* Subagents Table */}
        <div className="flex-1 overflow-auto">
          {subagents.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-8' : 'py-16'}`}>
              <div className={`${isMobile ? 'text-4xl' : 'text-6xl'} mb-4`}>🤖</div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-medium text-gray-900 dark:text-white mb-2`}>
                {searchTerm ? t('projectSubAgentsModal.emptyState.noResults') : t('projectSubAgentsModal.emptyState.noSubagents')}
              </h3>
              <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'mb-4' : 'mb-6'}`}>
                {searchTerm
                  ? t('projectSubAgentsModal.emptyState.tryAdjust')
                  : t('projectSubAgentsModal.emptyState.description')
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={() => {
                    setEditingSubagent(null);
                    setShowForm(true);
                  }}
                  className={`${isMobile ? 'w-full py-3 px-4' : 'px-6 py-3'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
                >
                  {t('projectSubAgentsModal.actions.create')}
                </button>
              )}
            </div>
          ) : (
            <>
              {isMobile ? (
                /* Mobile Card View */
                <div className="p-4 space-y-4">
                  {subagents.map((subagent, index) => (
                    <div
                      key={subagent.id + '-' + index}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      {/* Subagent Header */}
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="text-xl mr-3">🤖</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-medium text-gray-900 dark:text-white mb-1">
                            {subagent.name}
                          </div>
                          {subagent.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {subagent.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subagent Details */}
                      <div className="space-y-2 mb-4">
                        {/* Tools */}
                        <div className="flex items-start text-sm">
                          <span className="text-gray-500 dark:text-gray-400 mr-2 mt-1">{t('projectSubAgentsModal.table.tools')}:</span>
                          {subagent.tools && subagent.tools.length > 0 ? (
                            <div className="flex-1">
                              <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 mb-1">
                                <Tag className="w-3 h-3" />
                                <span className="text-xs">{t('projectSubAgentsModal.table.toolsCount', { count: subagent.tools.length })}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {subagent.tools.map((tool, toolIndex) => (
                                  <code key={toolIndex} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs">
                                    {getToolDisplayName(tool)}
                                  </code>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('projectSubAgentsModal.table.inheritSettings')}</span>
                          )}
                        </div>

                        {/* Created At */}
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 dark:text-gray-400 mr-2">{t('projectSubAgentsModal.table.createdAt')}:</span>
                          <div className="flex items-center text-gray-500 dark:text-gray-400">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{formatRelativeTime(subagent.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => handleEdit(subagent)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/50 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          {t('projectSubAgentsModal.actions.edit')}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(subagent)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                          title={t('projectSubAgentsModal.actions.deleteTooltip')}
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
                        {t('projectSubAgentsModal.table.subagent')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('projectSubAgentsModal.table.tools')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('projectSubAgentsModal.table.createdAt')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('projectSubAgentsModal.table.actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subagents.map((subagent, index) => (
                      <TableRow
                        key={subagent.id + '-' + index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-xl mr-3">🤖</div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {subagent.name}
                              </div>
                              {subagent.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {subagent.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {subagent.tools && subagent.tools.length > 0 ? (
                            <div>
                              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <Tag className="w-3 h-3" />
                                <span>{t('projectSubAgentsModal.table.toolsCount', { count: subagent.tools.length })}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {subagent.tools.map((tool, toolIndex) => (
                                  <code key={toolIndex} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs">
                                    {getToolDisplayName(tool)}
                                  </code>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('projectSubAgentsModal.table.inheritSettings')}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatRelativeTime(subagent.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(subagent)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                              title={t('projectSubAgentsModal.actions.editTooltip')}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              {t('projectSubAgentsModal.actions.edit')}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(subagent)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('projectSubAgentsModal.actions.deleteTooltip')}
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

        {/* Form Modal */}
        {showForm && (
          <SubagentForm
            subagent={editingSubagent}
            projectId={project.id}
            onClose={handleFormClose}
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
                  <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white`}>{t('projectSubAgentsModal.deleteConfirm.title')}</h3>
                </div>
              </div>

              <p className={`${isMobile ? 'text-sm mb-4' : 'mb-6'} text-gray-600 dark:text-gray-400`}>
                {t('projectSubAgentsModal.deleteConfirm.message', { name: showDeleteConfirm.name })}
              </p>

              <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex justify-end space-x-3'}`}>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className={`${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-2'} text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors`}
                >
                  {t('projectSubAgentsModal.actions.cancel')}
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deleteSubagent.isPending}
                  className={`${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-2'} bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50`}
                >
                  {deleteSubagent.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    t('projectSubAgentsModal.actions.delete')
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};