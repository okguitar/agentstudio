import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSkills, useDeleteSkill } from '../../hooks/useSkills';
import type { SkillListItem } from '../../types/skills';
import { CreateSkillModal } from './CreateSkillModal';
import { ToolsList } from '../ToolsList';

export const SkillsPage: React.FC = () => {
  const { t } = useTranslation('skills');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<SkillListItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  // Only get user skills for this page
  const { data: skills = [], isLoading, error } = useSkills({
    scope: 'user',
    includeDisabled: false,
  });

  const deleteSkillMutation = useDeleteSkill();

  // Filter skills based on search term
  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditSkill = (skill: SkillListItem) => {
    setSelectedSkill(skill);
    setShowCreateModal(true);
  };

  const handleDeleteSkill = async (skill: SkillListItem) => {
    if (window.confirm(t('deleteConfirm', { name: skill.name }))) {
      try {
        await deleteSkillMutation.mutateAsync({ 
          skillId: skill.id, 
          scope: 'user' // Always user scope for this page
        });
      } catch (error) {
        console.error('Failed to delete skill:', error);
        alert(t('errors.deleteFailed'));
      }
    }
  };

  const handleCreateSkill = () => {
    setSelectedSkill(null); // 确保创建模式
    setShowCreateModal(true);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <h3 className="text-red-800 font-medium dark:text-red-400">{t('errors.loadFailed')}</h3>
          <p className="text-red-600 text-sm mt-1 dark:text-red-300">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{t('subtitle')}</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={handleCreateSkill}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>{t('createButton')}</span>
          </button>
        </div>
      </div>


      {/* Skills Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm ? t('noSkillsSearch') : t('noSkills')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm ? t('adjustSearch') : t('createFirst')}
          </p>
          {!searchTerm && (
            <button
              onClick={handleCreateSkill}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('createButton')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  {t('table.skill')}
                </TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-96">
                  {t('table.tools')}
                </TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  {t('table.updated')}
                </TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  {t('table.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSkills.map((skill) => (
                <TableRow key={skill.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* Skill */}
                  <TableCell className="px-6 py-4 whitespace-nowrap w-48">
                    <div className="flex items-center">
                      <div className="text-2xl mr-4">⚡</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-medium ${
                            skill.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                          } truncate`}>
                            {skill.name}
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">
                            {t('scope.user')}
                          </span>
                        </div>
                        <div className={`text-sm ${
                          skill.enabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                        } truncate`}>
                          {skill.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Tools */}
                  <TableCell className="px-6 py-4 w-96">
                    <ToolsList
                      tools={skill.allowedTools || []}
                      id={skill.id}
                      expandedTools={expandedTools}
                      setExpandedTools={setExpandedTools}
                      isMobile={false}
                      emptyMessage="无工具限制"
                    />
                  </TableCell>

                  {/* Updated */}
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 w-40">
                    {new Date(skill.updatedAt).toLocaleDateString()}
                    {skill.usageCount !== undefined && skill.usageCount > 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {t('preview.usage', { count: skill.usageCount })}
                      </div>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-32">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditSkill(skill)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded transition-colors"
                        title={t('preview.actions.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSkill(skill)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded transition-colors"
                        title={t('preview.actions.delete')}
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

      {/* Modals */}
      {showCreateModal && (
        <CreateSkillModal
          onClose={() => {
            setShowCreateModal(false);
            setSelectedSkill(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedSkill(null);
            // Refresh data will be handled by React Query invalidation
          }}
          editSkill={selectedSkill || undefined}
        />
      )}
    </div>
  );
};