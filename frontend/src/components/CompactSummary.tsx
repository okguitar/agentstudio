import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';

interface CompactSummaryProps {
  content: string | any;
}

export const CompactSummary: React.FC<CompactSummaryProps> = ({ content }) => {
  // Ensure content is a string
  const displayContent = typeof content === 'string' ? content : 
    Array.isArray(content) ? content.map(item => item.text || JSON.stringify(item)).join('') :
    String(content);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Archive className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            已压缩上下文
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500">
            {isExpanded ? '收起' : '展开查看'}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="text-sm">
            <MarkdownMessage content={displayContent} />
          </div>
        </div>
      )}
    </div>
  );
};