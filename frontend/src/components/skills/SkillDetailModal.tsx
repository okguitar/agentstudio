import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { SkillListItem, SkillConfig } from '../../types/skills';
import { authFetch } from '../../lib/authFetch';
import { API_BASE } from '../../lib/config';

interface SkillDetailModalProps {
  skill: SkillListItem;
  onClose: () => void;
}

export const SkillDetailModal: React.FC<SkillDetailModalProps> = ({
  skill,
  onClose,
}) => {
  const { t } = useTranslation('skills');
  const [skillContent, setSkillContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [additionalFiles, setAdditionalFiles] = useState<Array<{ name: string; content: string }>>([]);

  useEffect(() => {
    const loadSkillContent = async () => {
      try {
        setIsLoading(true);
        
        // Load SKILL.md content
        const response = await authFetch(`${API_BASE}/skills/${skill.id}/files/SKILL.md`);
        if (response.ok) {
          const data = await response.json();
          setSkillContent(data.content);
        }

        // Load full skill details to get additional files
        const detailResponse = await authFetch(`${API_BASE}/skills/${skill.id}?scope=${skill.scope}`);
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          const skillData: SkillConfig = detailData.skill;
          
          const files = skillData?.files || [];
          
          // Load content of additional files (excluding SKILL.md)
          const otherFiles = files.filter((f: any) => !f.path.endsWith('SKILL.md'));
          const fileContents = await Promise.all(
            otherFiles.map(async (file: any) => {
              try {
                const fileResponse = await authFetch(`${API_BASE}/skills/${skill.id}/files/${file.path}`);
                if (fileResponse.ok) {
                  const fileData = await fileResponse.json();
                  return { name: file.path, content: fileData.content };
                }
              } catch (error) {
                console.error(`Failed to load file ${file.path}:`, error);
              }
              return null;
            })
          );
          
          setAdditionalFiles(fileContents.filter(Boolean) as Array<{ name: string; content: string }>);
        }
      } catch (error) {
        console.error('Failed to load skill content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSkillContent();
  }, [skill.id, skill.scope]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {skill.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {t('scope.user')}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                {skill.source === 'plugin' ? t('source.plugin') : t('source.local')}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="ml-4"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('detail.description')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {skill.description}
                </p>
              </div>

              {/* Allowed Tools */}
              {skill.allowedTools && skill.allowedTools.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('detail.allowedTools')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skill.allowedTools.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SKILL.md Content */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SKILL.md
                </h3>
                <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm overflow-x-auto">
                  <code className="text-gray-800 dark:text-gray-200">{skillContent}</code>
                </pre>
              </div>

              {/* Additional Files */}
              {additionalFiles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('detail.additionalFiles')}
                  </h3>
                  <div className="space-y-4">
                    {additionalFiles.map((file) => (
                      <div key={file.name}>
                        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {file.name}
                        </h4>
                        <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm overflow-x-auto">
                          <code className="text-gray-800 dark:text-gray-200">{file.content}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {t('detail.close')}
          </Button>
        </div>
      </div>
    </div>
  );
};

