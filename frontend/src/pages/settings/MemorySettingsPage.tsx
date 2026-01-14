import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../lib/config';
import { authFetch } from '../../lib/authFetch';
import {
  Save,
  Brain,
  Edit,
  FileText
} from 'lucide-react';
import { showError, showSuccess } from '../../utils/toast';

export const MemorySettingsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const [globalMemory, setGlobalMemory] = useState('');
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

  // Load global memory
  useEffect(() => {
    loadGlobalMemory();
  }, []);

  const loadGlobalMemory = async () => {
    setIsLoadingMemory(true);
    try {
      const response = await authFetch(`${API_BASE}/settings/global-memory`);
      if (response.ok) {
        const data = await response.text();
        setGlobalMemory(data);
      }
    } catch (error) {
      console.error('Failed to load global memory:', error);
    } finally {
      setIsLoadingMemory(false);
    }
  };

  const saveGlobalMemory = async () => {
    try {
      const response = await authFetch(`${API_BASE}/settings/global-memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: globalMemory,
      });

      if (response.ok) {
        setIsEditingMemory(false);
        showSuccess(t('settings.memorySettings.saveSuccess'));
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save global memory:', error);
      showError(t('settings.memorySettings.saveFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('settings.memorySettings.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('settings.memorySettings.description')}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('settings.memorySettings.fileSourceInfo')}
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block font-medium text-gray-900 dark:text-white">{t('settings.memorySettings.memoryContent')}</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditingMemory(!isEditingMemory)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <Edit className="w-4 h-4" />
                  <span>{isEditingMemory ? t('settings.memorySettings.cancelEdit') : t('settings.memorySettings.edit')}</span>
                </button>
                <button
                  onClick={loadGlobalMemory}
                  disabled={isLoadingMemory}
                  className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isLoadingMemory ? t('settings.memorySettings.refreshing') : t('settings.memorySettings.refresh')}</span>
                </button>
              </div>
            </div>

            {isEditingMemory ? (
              <div className="space-y-3">
                <textarea
                  value={globalMemory}
                  onChange={(e) => setGlobalMemory(e.target.value)}
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder={t('settings.memorySettings.placeholder')}
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsEditingMemory(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                  >
                    {t('settings.memorySettings.cancel')}
                  </button>
                  <button
                    onClick={saveGlobalMemory}
                    className="flex items-center space-x-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t('settings.memorySettings.saveMemory')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 min-h-[300px]">
                {isLoadingMemory ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500 dark:text-gray-400">{t('settings.memorySettings.loading')}</div>
                  </div>
                ) : globalMemory ? (
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {globalMemory}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p>{t('settings.memorySettings.noMemory')}</p>
                      <p className="text-xs mt-1">{t('settings.memorySettings.clickEditToStart')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>• {t('settings.memorySettings.infoAutoLoad')}</p>
              <p>• {t('settings.memorySettings.infoSuggestions')}</p>
              <p>• {t('settings.memorySettings.infoFileLocation')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};