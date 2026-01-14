import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, LogIn, Settings } from 'lucide-react';

interface OnboardingCompleteStepProps {
  serviceName: string;
  serviceUrl: string;
  onGoToLogin: () => void;
  onManageServices: () => void;
}

export const OnboardingCompleteStep: React.FC<OnboardingCompleteStepProps> = ({
  serviceName,
  serviceUrl,
  onGoToLogin,
  onManageServices
}) => {
  const { t } = useTranslation('onboarding');

  return (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('backend.complete.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('backend.complete.description')}
        </p>
      </div>

      {/* Service Info */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-left">
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('backend.complete.serviceName')}
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {serviceName}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('backend.complete.serviceUrl')}
            </p>
            <p className="text-sm font-mono text-gray-900 dark:text-white">
              {serviceUrl}
            </p>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          {t('backend.complete.nextSteps.title')}
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          {t('backend.complete.nextSteps.description')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onGoToLogin}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span>{t('backend.complete.goToLogin')}</span>
        </button>
        <button
          onClick={onManageServices}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>{t('backend.complete.manageServices')}</span>
        </button>
      </div>
    </div>
  );
};
