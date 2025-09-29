import React, { useEffect, useRef } from 'react';
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

const SYSTEM_COMMANDS: SystemCommand[] = [
  {
    id: 'init',
    name: 'init',
    description: '初始化项目或重置对话上下文',
    content: '/init',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'clear',
    name: 'clear',
    description: '清空当前对话历史',
    content: '/clear',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'compact',
    name: 'compact',
    description: '压缩对话历史，保留关键信息',
    content: '/compact',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'agents',
    name: 'agents',
    description: '管理AI代理和子代理',
    content: '/agents',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'settings',
    name: 'settings',
    description: '打开设置页面',
    content: '/settings',
    scope: 'system',
    isSystem: true
  },
  {
    id: 'help',
    name: 'help',
    description: '显示帮助信息',
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

  // Filter system commands based on search term
  const filteredSystemCommands = SYSTEM_COMMANDS.filter(cmd =>
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
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-72 max-w-96 overflow-hidden"
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
              className={`px-4 py-3 cursor-pointer flex items-center border-b border-gray-100 last:border-b-0 ${
                isSelected 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelect(command)}
              onMouseEnter={() => onSelectedIndexChange?.(index)}
            >
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${
                  isSelected ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {getDisplayName()}
                </div>
                {command.description && (
                  <div className={`text-xs truncate ${
                    isSelected ? 'text-blue-700' : 'text-gray-500'
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