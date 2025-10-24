import React from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket } from 'lucide-react';

interface ReinitializeSetupButtonProps {
  onReinitializeSetup: () => void;
}

export const ReinitializeSetupButton: React.FC<ReinitializeSetupButtonProps> = ({
  onReinitializeSetup,
}) => {
  const { t } = useTranslation('pages');

  return (
    <button
      onClick={onReinitializeSetup}
      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      title={t('settings.version.reinitializeTitle')}
    >
      <Rocket className="w-4 h-4" />
      <span>{t('settings.version.reinitialize')}</span>
    </button>
  );
};