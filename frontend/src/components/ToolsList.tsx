import React from 'react';
import { Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { getToolDisplayName } from '../utils/toolMapping';

interface ToolsListProps {
  tools: string[];
  id: string; // Unique ID for managing expanded state
  expandedTools: Record<string, boolean>;
  setExpandedTools: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isMobile?: boolean;
  emptyMessage?: string;
}

export const ToolsList: React.FC<ToolsListProps> = ({
  tools,
  id,
  expandedTools,
  setExpandedTools,
  isMobile = false,
  emptyMessage = '继承全局设置'
}) => {
  // Display limits
  const displayLimit = isMobile ? 3 : 5;
  const isExpanded = expandedTools[id] || false;

  if (!tools || tools.length === 0) {
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }))}
        className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2 group"
      >
        <Tag className="w-4 h-4" />
        <span className="font-medium">{tools.length} 个工具</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
        )}
      </button>

      {/* Expanded View */}
      {isExpanded && (
        <div className={`flex flex-wrap gap-1.5 ${isMobile ? 'max-h-40' : 'max-h-48'} overflow-y-auto pr-2`}>
          {tools.map((tool, idx) => (
            <code
              key={idx}
              className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs font-mono border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              title={getToolDisplayName(tool)}
            >
              {getToolDisplayName(tool)}
            </code>
          ))}
        </div>
      )}

      {/* Collapsed View */}
      {!isExpanded && (
        <div className="flex flex-wrap gap-1">
          {tools.slice(0, displayLimit).map((tool, idx) => (
            <code
              key={idx}
              className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs font-mono"
              title={getToolDisplayName(tool)}
            >
              {getToolDisplayName(tool)}
            </code>
          ))}
          {tools.length > displayLimit && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
              +{tools.length - displayLimit}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

