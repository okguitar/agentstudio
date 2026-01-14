import { useTranslation } from 'react-i18next';
import type { SystemCommand } from '../utils/commandHandler';

export const getSystemCommands = (): SystemCommand[] => {
  const { t } = useTranslation('components');
  
  return [
    {
      id: 'init',
      name: 'init',
      description: t('systemCommands.init.description'),
      content: '/init',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'clear',
      name: 'clear',
      description: t('systemCommands.clear.description'),
      content: '/clear',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'compact',
      name: 'compact',
      description: t('systemCommands.compact.description'),
      content: '/compact',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'agents',
      name: 'agents',
      description: t('systemCommands.agents.description'),
      content: '/agents',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'settings',
      name: 'settings',
      description: t('systemCommands.settings.description'),
      content: '/settings',
      scope: 'system',
      isSystem: true
    }
  ];
};