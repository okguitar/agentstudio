import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SlashCommand } from '../types/commands';
import { useCommands, useProjectCommands } from '../hooks/useCommands';
import { SystemCommand } from '../utils/commandHandler';

interface CommandSelectorProps {
  isOpen: boolean;
  onSelect: (command: SlashCommand | SystemCommand) => void;
  onClose?: () => void;
  searchTerm: string;
  position: { top: number; left: number };
  projectId?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
}

// SystemCommand is now imported from commandHandler

// Helper function to create system commands with translations
const createSystemCommands = (t: (key: string) => string): SystemCommand[] => [
  {
    id: 'init',
    name: 'init',
    description: t('commandSelector.systemCommands.init.description'),
    content: '/init',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'clear',
    name: 'clear',
    description: t('commandSelector.systemCommands.clear.description'),
    content: '/clear',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'compact',
    name: 'compact',
    description: t('commandSelector.systemCommands.compact.description'),
    content: '/compact',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'agents',
    name: 'agents',
    description: t('commandSelector.systemCommands.agents.description'),
    content: '/agents',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'settings',
    name: 'settings',
    description: t('commandSelector.systemCommands.settings.description'),
    content: '/settings',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'help',
    name: 'help',
    description: t('commandSelector.systemCommands.help.description'),
    content: '/help',
    scope: 'system',
    isSystem: true
  },
];

export const CommandSelector: React.FC<CommandSelectorProps> = ({
  isOpen,
  onSelect,
  onClose,
  searchTerm,
  position,
  projectId,
  // onKeyDown,
  selectedIndex = 0,
  onSelectedIndexChange,
}) => {
  const { t } = useTranslation('components');
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);
  // Fetch commands
  const { data: userCommands = [] } = useCommands({ scope: 'user', search: searchTerm });
  const { data: projectCommands = [] } = useProjectCommands({
    projectId: projectId || '',
    search: searchTerm
  });

  // Create system commands with translations
  const systemCommands = createSystemCommands(t);

  // Filter system commands based on search term
  const filteredSystemCommands = systemCommands.filter(cmd =>
    cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Combine all commands
  const allCommands: (SlashCommand | SystemCommand)[] = [
    ...filteredSystemCommands,
    ...projectCommands,
    ...userCommands,
  ];

  // Reset selectedIndex when commands change
  useEffect(() => {
    if (allCommands.length > 0 && selectedIndex >= allCommands.length) {
      onSelectedIndexChange?.(0);
    }
  }, [allCommands.length, selectedIndex, onSelectedIndexChange]);

  // Scroll to selected item
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const selectedItem = containerRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen || allCommands.length === 0) return null;

  // Calculate dynamic height based on number of commands and viewport
  const itemHeight = 65; // Approximate height per command item
  const padding = 20; // Extra padding to ensure it doesn't touch viewport edges
  const fixedGap = 4; // Fixed gap between selector and input
  // Since the popup shows above the input, available height is from top of viewport to input position minus gap
  const maxAvailableHeight = position.top - padding - fixedGap;
  const idealHeight = allCommands.length * itemHeight;
  const dynamicHeight = Math.min(idealHeight, maxAvailableHeight);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-72 max-w-96 overflow-hidden"
      style={{
        bottom: window.innerHeight - position.top + fixedGap, // Fixed distance from input
        left: position.left,
        maxHeight: `${dynamicHeight}px`,
      }}
    >
      <div className="overflow-y-auto" style={{ maxHeight: `${dynamicHeight}px` }}>
        {allCommands.map((command, index) => {
          const isSystem = 'isSystem' in command;
          const isSelected = index === selectedIndex;

          // Format display name for custom commands with namespace
          const getDisplayName = () => {
            if (isSystem) {
              return command.name;
            }
            // For custom commands, show namespace:name if namespace exists
            if (command.namespace) {
              return `${command.namespace}:${command.name}`;
            }
            return command.name;
          };

          return (
            <div
              key={command.id}
              data-index={index}
              className={`px-4 py-3 cursor-pointer flex items-center border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => onSelect(command)}
              onMouseEnter={() => onSelectedIndexChange?.(index)}
            >
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${
                  isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {getDisplayName()}
                </div>
                {command.description && (
                  <div className={`text-xs truncate ${
                    isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {command.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Export helper function to get selected command
export const getSelectedCommand = (
  allCommands: (SlashCommand | SystemCommand)[],
  selectedIndex: number
): SlashCommand | SystemCommand | null => {
  return allCommands[selectedIndex] || null;
};