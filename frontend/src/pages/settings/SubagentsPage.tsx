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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from 'react-i18next';
import { Subagent } from '../../types/subagents';
import { useSubagents, useDeleteSubagent } from '../../hooks/useSubagents';
import { SubagentForm } from '../../components/SubagentForm';
import { formatRelativeTime } from '../../utils';
import { getToolDisplayName } from '@agentstudio/shared/utils/toolMapping';
import { useMobileContext } from '../../contexts/MobileContext';

export const SubagentsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
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
      <div className={`${isMobile ? 'p-4' : 'p-8'} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full ${isMobile ? 'h-8 w-8' : 'h-12 w-12'} border-b-2 border-blue-600 mx-auto ${isMobile ? 'mb-3' : 'mb-4'}`}></div>
          <div className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'text-sm' : ''}`}>{t('settings.subagents.loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${isMobile ? 'p-4' : 'p-8'} flex items-center justify-center`}>
        <div className="text-center">
          <AlertCircle className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} text-red-500 mx-auto ${isMobile ? 'mb-3' : 'mb-4'}`} />
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white mb-2`}>{t('settings.subagents.loadFailed')}</h3>
          <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'mb-4 text-sm' : 'mb-4'}`}>{t('settings.subagents.loadFailedMessage')}</p>
          <button
            onClick={() => refetch()}
            className={`${isMobile ? 'px-4 py-2.5 text-sm' : 'px-4 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
          >
            {t('settings.subagents.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isMobile ? 'p-4' : 'p-8'}>
      {/* Header */}
      <div className={isMobile ? 'mb-6' : 'mb-8'}>
        <div className={isMobile ? 'mb-4' : 'flex items-center justify-between mb-6'}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>{t('settings.subagents.title')}</h1>
            <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'mt-1' : 'mt-2'}`}>{t('settings.subagents.subtitle')}</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className={isMobile ? 'space-y-3' : 'flex items-center space-x-4'}>
          <div className={`${isMobile ? '' : 'flex-1'} bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4`}>
            <div className={`${isMobile ? 'flex items-center space-x-2' : 'relative'}`}>
              <Search className={`${isMobile ? 'text-gray-400 w-4 h-4' : 'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5'}`} />
              <input
                type="text"
                placeholder={t('settings.subagents.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isMobile ? 'pl-10' : 'pl-10'} pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isMobile ? 'text-sm' : ''}`}
              />
            </div>
          </div>
          <button
            onClick={() => {
              setEditingSubagent(null);
              setShowForm(true);
            }}
            className={`${isMobile ? 'w-full py-2.5 px-4 flex items-center justify-center space-x-2' : 'flex items-center space-x-2 px-6 py-3'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isMobile ? 'text-sm' : 'whitespace-nowrap'}`}
          >
            <Plus className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
            <span>{t('settings.subagents.createButton')}</span>
          </button>
        </div>
      </div>

      {/* Subagents Display */}
      {subagents.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className={`${isMobile ? 'text-4xl' : 'text-6xl'} mb-4`}>🤖</div>
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-medium text-gray-900 dark:text-white mb-2`}>
            {searchTerm ? t('settings.subagents.noSubagentsSearch') : t('settings.subagents.noSubagents')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm
              ? t('settings.subagents.adjustSearch')
              : t('settings.subagents.createFirst')
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
              {t('settings.subagents.createButton')}
            </button>
          )}
        </div>
      ) : (
        <>
          {isMobile ? (
            /* Mobile Card View */
            <div className="space-y-4">
              {subagents.map((subagent, index) => (
                <div
                  key={subagent.id + '-' + index}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  {/* Subagent Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`${isMobile ? 'text-lg' : 'text-xl'} mr-3`}>🤖</div>
                      <div>
                        <div className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 dark:text-white`}>
                          {subagent.name}
                        </div>
                        {subagent.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {subagent.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subagent Details */}
                  <div className="space-y-2 mb-4">
                    {/* Tools */}
                    <div className="flex items-start text-sm">
                      <span className="text-gray-500 dark:text-gray-400 mr-2 mt-1">{t('settings.subagents.table.tools')}:</span>
                      {subagent.tools && subagent.tools.length > 0 ? (
                        <div className="flex-1">
                          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 mb-1">
                            <Tag className="w-3 h-3" />
                            <span className="text-xs">{t('settings.subagents.table.toolsCount', { count: subagent.tools.length })}</span>
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
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('settings.subagents.table.inheritSettings')}</span>
                      )}
                    </div>

                    {/* Created At */}
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400 mr-2">{t('settings.subagents.table.createdAt')}:</span>
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
                      {t('settings.subagents.actions.edit')}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(subagent)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                      title={t('settings.subagents.actions.deleteTitle')}
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
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('settings.subagents.table.subagent')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('settings.subagents.table.tools')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('settings.subagents.table.createdAt')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('settings.subagents.table.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subagents.map((subagent, index) => (
                    <TableRow
                      key={subagent.id + '-' + index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
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
                              <span>{t('settings.subagents.table.toolsCount', { count: subagent.tools.length })}</span>
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
                          <span className="text-sm text-gray-500 dark:text-gray-400">{t('settings.subagents.table.inheritSettings')}</span>
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
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/50 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors"
                            title={t('settings.subagents.actions.editTitle')}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            {t('settings.subagents.actions.edit')}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(subagent)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                            title={t('settings.subagents.actions.deleteTitle')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
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
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'w-full max-w-sm' : 'max-w-md w-full'}`}>
            <div className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'} border-b border-gray-200 dark:border-gray-700`}>
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 dark:text-white`}>{t('settings.subagents.deleteConfirm.title')}</h3>
            </div>

            <div className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
              <p className={`${isMobile ? 'text-sm' : ''} text-gray-600 dark:text-gray-400`}>
                {t('settings.subagents.deleteConfirm.message', { name: showDeleteConfirm.name })}
              </p>
              <p className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'mt-1 text-xs' : 'mt-2'}`}>
                {t('settings.subagents.deleteConfirm.warning')}
              </p>
            </div>

            <div className={`${isMobile ? 'grid grid-cols-2 gap-2 px-4 py-3' : 'flex items-center justify-end space-x-3 px-6 py-4'} border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50`}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-2'} text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
              >
                {t('settings.subagents.deleteConfirm.cancel')}
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleteSubagent.isPending}
                className={`${isMobile ? 'flex items-center justify-center space-x-1 px-3 py-2.5 text-sm' : 'flex items-center space-x-2 px-4 py-2'} bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors`}
              >
                {deleteSubagent.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                )}
                <span>{t('settings.subagents.deleteConfirm.delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
