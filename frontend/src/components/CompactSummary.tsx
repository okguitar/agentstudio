import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import { useTranslation } from 'react-i18next';

interface CompactSummaryProps {
  content: string | any;
}

export const CompactSummary: React.FC<CompactSummaryProps> = ({ content }) => {
  const { t } = useTranslation('components');

  // Ensure content is a string
  const displayContent = typeof content === 'string' ? content :
    Array.isArray(content) ? content.map(item => item.text || JSON.stringify(item)).join('') :
    String(content);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Archive className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('compactSummary.title')}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isExpanded ? t('compactSummary.collapse') : t('compactSummary.expand')}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="text-sm">
            <MarkdownMessage content={displayContent} />
          </div>
        </div>
      )}
    </div>
  );
};