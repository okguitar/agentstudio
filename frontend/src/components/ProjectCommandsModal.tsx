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
import { getToolDisplayName } from '@agentstudio/shared/utils/toolMapping';

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
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-600">{t('projectCommandsModal.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('projectCommandsModal.error.title')}</h3>
            <p className="text-gray-600 mb-4">{t('projectCommandsModal.error.message')}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('projectCommandsModal.error.retry')}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Terminal className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('projectCommandsModal.title')}</h2>
              <p className="text-sm text-gray-600">{project.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Add Button */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('projectCommandsModal.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                setEditingCommand(null);
                setShowForm(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t('projectCommandsModal.createButton')}</span>
            </button>
          </div>
        </div>

        {/* Commands Table */}
        <div className="flex-1 overflow-auto">
          {commands.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchTerm ? t('projectCommandsModal.emptyState.noMatchTitle') : t('projectCommandsModal.emptyState.noCommandsTitle')}
              </h3>
              <p className="text-gray-600 mb-6">
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
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('projectCommandsModal.createButton')}
                </button>
              )}
            </div>
          ) : (
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
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-xl mr-3">⚡</div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {command.namespace ? `/${command.namespace}:${command.name}` : `/${command.name}`}
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
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {command.model ? (
                        <div className="text-sm text-gray-900">
                          <Code className="w-3 h-3 inline mr-1" />
                          {command.model}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">{t('projectCommandsModal.table.inheritSettings')}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {command.allowedTools && command.allowedTools.length > 0 ? (
                        <div>
                          <div className="flex items-center space-x-1 text-sm text-gray-500 mb-1">
                            <Tag className="w-3 h-3" />
                            <span>{t('projectCommandsModal.table.toolsCount', { count: command.allowedTools.length })}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {command.allowedTools.map((tool, idx) => (
                              <code key={idx} className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs">
                                {getToolDisplayName(tool)}
                              </code>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">{t('projectCommandsModal.table.inheritSettings')}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{t('projectCommandsModal.deleteConfirm.title')}</h3>
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                {t('projectCommandsModal.deleteConfirm.message', { name: showDeleteConfirm.name })}
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  {t('projectCommandsModal.deleteConfirm.cancel')}
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deleteCommand.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
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