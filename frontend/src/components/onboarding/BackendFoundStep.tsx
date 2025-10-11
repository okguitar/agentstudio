import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Server, Plus } from 'lucide-react';

interface BackendFoundStepProps {
  serviceUrl: string;
  onUseService: () => void;
  onAddOther: () => void;
}

export const BackendFoundStep: React.FC<BackendFoundStepProps> = ({
  serviceUrl,
  onUseService,
  onAddOther
}) => {
  const { t } = useTranslation('onboarding');

  return (
    <div className="space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {t('backend.found.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('backend.found.description')}
        </p>
      </div>

      {/* Service Info */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Server className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {t('backend.found.serviceAddress')}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
              {serviceUrl}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-700 dark:text-green-300">
                {t('backend.found.status')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onUseService}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{t('backend.found.useThisService')}</span>
        </button>
        <button
          onClick={onAddOther}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('backend.found.addOtherService')}</span>
        </button>
      </div>
    </div>
  );
};
