import React from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, Server, FileText, History, ArrowRight, SkipForward } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext, onSkip }) => {
  const { t } = useTranslation('onboarding');

  return (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <Rocket className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('backend.welcome.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('backend.welcome.subtitle')}
        </p>
      </div>

      {/* Features List */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 space-y-4 text-left">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('backend.welcome.features.title')}
        </p>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('backend.welcome.features.ai.title')}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('backend.welcome.features.ai.description')}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('backend.welcome.features.storage.title')}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('backend.welcome.features.storage.description')}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <History className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('backend.welcome.features.history.title')}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('backend.welcome.features.history.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={onSkip}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <SkipForward className="w-4 h-4" />
          <span>{t('backend.actions.skip')}</span>
        </button>
        <button
          onClick={onNext}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span>{t('backend.actions.getStarted')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
