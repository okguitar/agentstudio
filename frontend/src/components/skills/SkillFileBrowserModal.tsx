import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { FileExplorer } from '../FileExplorer';

interface SkillFileBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillName: string;
  installPath: string;
}

export const SkillFileBrowserModal: React.FC<SkillFileBrowserModalProps> = ({
  isOpen,
  onClose,
  skillName,
  installPath,
}) => {
  const { t } = useTranslation('skills');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-[1200px] w-full h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {skillName} - {t('detail.files')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {installPath}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="ml-4"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* File Explorer */}
        <div className="flex-1 overflow-hidden min-h-0">
          <FileExplorer
            projectPath={installPath}
            onFileSelect={(filePath) => {
              console.log('Selected file:', filePath);
            }}
            className="h-full"
          />
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

