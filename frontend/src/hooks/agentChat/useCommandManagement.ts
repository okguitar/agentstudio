import { useMemo } from 'react';
import { useCommands, useProjectCommands } from '../useCommands';
import { useTranslation } from 'react-i18next';

export interface SystemCommand {
  id: string;
  name: string;
  description: string;
  content: string;
  scope: 'system';
  isSystem: boolean;
}

export interface UseCommandManagementProps {
  commandSearch: string;
  projectPath?: string;
  hasCommandsLoadError?: boolean;
  userCommandsError?: any;
  projectCommandsError?: any;
}

export const useCommandManagement = ({
  commandSearch,
  projectPath
}: UseCommandManagementProps) => {
  const { t } = useTranslation('components');

  // Fetch commands for keyboard navigation (with search filter)
  const { data: userCommandsFiltered = [], error: userCommandsErrorHook } = useCommands({ scope: 'user', search: commandSearch });
  const { data: projectCommandsFiltered = [], error: projectCommandsErrorHook } = useProjectCommands({
    projectId: projectPath || '',
    search: commandSearch
  });

  // Fetch complete command lists for detection (without search filter)
  const { data: userCommands = [] } = useCommands({ scope: 'user' });
  const { data: projectCommands = [] } = useProjectCommands({
    projectId: projectPath || ''
  });

  // System commands definition
  const SYSTEM_COMMANDS: SystemCommand[] = useMemo(() => [
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
    },
    {
      id: 'help',
      name: 'help',
      description: t('systemCommands.help.description'),
      content: '/help',
      scope: 'system',
      isSystem: true
    },
  ], [t]);

  // Helper function to check if a command is defined
  const isCommandDefined = (commandName: string) => {
    const systemCommand = SYSTEM_COMMANDS.find(cmd => cmd.name === commandName);
    const projectCommand = projectCommands.find(cmd => cmd.name === commandName);
    const userCommand = userCommands.find(cmd => cmd.name === commandName);
    
    return !!(systemCommand || projectCommand || userCommand);
  };

  // Helper function to get all available command names for error messages
  const getAllAvailableCommands = () => {
    const systemCommands = SYSTEM_COMMANDS.map(cmd => cmd.content);
    const projectCommandsList = projectCommands.map(cmd => `/${cmd.name}`);
    const userCommandsList = userCommands.map(cmd => `/${cmd.name}`);
    
    return [...systemCommands, ...projectCommandsList, ...userCommandsList].join(', ');
  };

  // Check if commands failed to load (likely authentication issue)
  const commandsLoadError = userCommandsErrorHook || projectCommandsErrorHook;

  // Memoize allCommands to prevent unnecessary re-renders (for command selector)
  const allCommands = useMemo(() => {
    // Filter system commands based on search term
    const filteredSystemCommands = SYSTEM_COMMANDS.filter(cmd =>
      cmd.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
      cmd.description.toLowerCase().includes(commandSearch.toLowerCase())
    );

    // Combine all commands (use filtered lists for selector)
    return [
      ...filteredSystemCommands,
      ...projectCommandsFiltered,
      ...userCommandsFiltered,
    ];
  }, [userCommandsFiltered, projectCommandsFiltered, commandSearch, SYSTEM_COMMANDS]);

  return {
    // Commands data
    userCommands,
    projectCommands,
    userCommandsFiltered,
    projectCommandsFiltered,
    allCommands,
    SYSTEM_COMMANDS,
    
    // Error states
    commandsLoadError,
    
    // Helper functions
    isCommandDefined,
    getAllAvailableCommands,
  };
};