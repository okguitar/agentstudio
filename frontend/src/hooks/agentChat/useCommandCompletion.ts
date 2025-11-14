import { useState, useCallback, useMemo, useEffect, RefObject } from 'react';
import { useCommands, useProjectCommands } from '../useCommands';
import {
  type CommandType
} from '../../utils/commandFormatter';
import { SystemCommand } from '../../utils/commandHandler';
import { useTranslation } from 'react-i18next';

export interface UseCommandCompletionProps {
  projectPath?: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export const useCommandCompletion = ({
  projectPath,
  textareaRef
}: UseCommandCompletionProps) => {
  const { t } = useTranslation('components');
  const [showCommandSelector, setShowCommandSelector] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<CommandType | null>(null);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [commandWarning, setCommandWarning] = useState<string | null>(null);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [atSymbolPosition, setAtSymbolPosition] = useState<number | null>(null);

  // System commands definition
  const SYSTEM_COMMANDS: SystemCommand[] = [
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
  ];

  // Fetch commands for keyboard navigation (with search filter)
  const { data: userCommandsFiltered = [], error: userCommandsError } = useCommands({
    scope: 'user',
    search: commandSearch
  });
  const { data: projectCommandsFiltered = [], error: projectCommandsError } = useProjectCommands({
    projectId: projectPath || '',
    search: commandSearch
  });

  // Fetch complete command lists for detection (without search filter)
  const { data: userCommands = [] } = useCommands({ scope: 'user' });
  const { data: projectCommands = [] } = useProjectCommands({
    projectId: projectPath || ''
  });

  // Helper function to check if a command is defined
  const isCommandDefined = useCallback((commandName: string) => {
    const systemCommand = SYSTEM_COMMANDS.find(cmd => cmd.name === commandName);
    const projectCommand = projectCommands.find(cmd => cmd.name === commandName);
    const userCommand = userCommands.find(cmd => cmd.name === commandName);

    return !!(systemCommand || projectCommand || userCommand);
  }, [SYSTEM_COMMANDS, projectCommands, userCommands]);

  // Helper function to get all available command names for error messages
  const getAllAvailableCommands = useCallback(() => {
    const systemCommands = SYSTEM_COMMANDS.map(cmd => cmd.content);
    const projectCommandsList = projectCommands.map(cmd => `/${cmd.name}`);
    const userCommandsList = userCommands.map(cmd => `/${cmd.name}`);

    return [...systemCommands, ...projectCommandsList, ...userCommandsList].join(', ');
  }, [SYSTEM_COMMANDS, projectCommands, userCommands]);

  // Check if commands failed to load (likely authentication issue)
  const hasCommandsLoadError = userCommandsError || projectCommandsError;

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

  // Reset selected index when commands change
  useEffect(() => {
    setSelectedCommandIndex(prev => {
      // Only update if index is out of bounds
      if (allCommands.length > 0 && prev >= allCommands.length) {
        return 0;
      }
      return prev;
    });
  }, [allCommands.length]);

  // Handle input change for command detection
  const handleInputChange = useCallback((value: string) => {
    // Clear command warning when input changes
    if (commandWarning) {
      setCommandWarning(null);
    }

    // Check for @ symbol trigger immediately
    if (value.length > 0 && value[value.length - 1] === '@') {
      // Check if @ is at start of line or preceded by whitespace
      const textBeforeAt = value.substring(0, value.length - 1);

      if (textBeforeAt.length === 0 || /\s$/.test(textBeforeAt)) {
        setAtSymbolPosition(value.length - 1);
        setShowFileBrowser(true);
        // Blur the textarea to prevent further input
        textareaRef.current?.blur();
        return;
      }
    }
  }, [commandWarning, textareaRef]);

  // Handle command selection
  const handleCommandSelect = useCallback((command: CommandType) => {
    setSelectedCommand(command);
    setShowCommandSelector(false);
    return `/${command.name}`;
  }, []);

  // Handle command selector close
  const handleCommandSelectorClose = useCallback(() => {
    setShowCommandSelector(false);
  }, []);

  // Handle file selection from file browser
  const handleFileSelect = useCallback((filePath: string, inputMessage: string) => {
    if (!textareaRef.current || atSymbolPosition === null) return inputMessage;

    // Convert absolute path to relative path (without leading ./)
    let relativePath = filePath;
    if (projectPath && filePath.startsWith(projectPath)) {
      relativePath = filePath.slice(projectPath.length);
      // Remove leading slash if present
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1);
      }
    }

    // Replace @ symbol with @ + selected file path + space
    const beforeAt = inputMessage.substring(0, atSymbolPosition);
    const afterAt = inputMessage.substring(atSymbolPosition + 1);
    const newValue = beforeAt + '@' + relativePath + ' ' + afterAt;

    setShowFileBrowser(false);
    setAtSymbolPosition(null);

    // Set cursor position after the inserted file path and space
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = atSymbolPosition + 1 + relativePath.length + 1; // +1 for @ symbol, +1 for space
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPosition;
        textareaRef.current.focus();
      }
    }, 0);

    return newValue;
  }, [atSymbolPosition, projectPath, textareaRef]);

  const handleFileBrowserClose = useCallback(() => {
    setShowFileBrowser(false);
    setAtSymbolPosition(null);
    // Refocus textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [textareaRef]);

  return {
    // State
    showCommandSelector,
    commandSearch,
    selectedCommand,
    selectedCommandIndex,
    commandWarning,
    showFileBrowser,
    atSymbolPosition,
    allCommands,
    SYSTEM_COMMANDS,
    userCommands,
    projectCommands,
    hasCommandsLoadError,
    userCommandsError,
    projectCommandsError,

    // Actions
    setSelectedCommand,
    setSelectedCommandIndex,
    setCommandWarning,
    setShowCommandSelector,
    setShowFileBrowser,
    setAtSymbolPosition,
    setCommandSearch,
    handleInputChange,
    handleCommandSelect,
    handleCommandSelectorClose,
    handleFileSelect,
    handleFileBrowserClose,
    isCommandDefined,
    getAllAvailableCommands
  };
};
