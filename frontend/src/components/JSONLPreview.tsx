import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Download, Maximize2, Minimize2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Copy, Check, FileJson } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';

interface JSONLPreviewProps {
  filePath: string;
  onClose: () => void;
}

interface ParsedLine {
  lineNumber: number;
  data: Record<string, unknown> | null;
  error?: string;
  raw: string;
}

export const JSONLPreview: React.FC<JSONLPreviewProps> = ({ filePath, onClose }) => {
  const { t } = useTranslation('components');
  const [content, setContent] = useState<ParsedLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMaximized, setIsMaximized] = useState(false);
  const [rowsPerPage] = useState(20);
  const [fileName, setFileName] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [copiedRow, setCopiedRow] = useState<number | null>(null);

  // Parse JSONL content
  const parseJSONL = (text: string): ParsedLine[] => {
    const lines = text.split('\n');
    const result: ParsedLine[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const data = JSON.parse(line);
        result.push({
          lineNumber: i + 1,
          data,
          raw: line
        });
      } catch {
        result.push({
          lineNumber: i + 1,
          data: null,
          error: t('jsonlPreview.errors.parseError'),
          raw: line
        });
      }
    }
    
    return result;
  };

  // Load JSONL content
  useEffect(() => {
    const loadJSONL = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Extract file name from path
        const name = filePath.split(/[/\\]/).pop() || 'unknown.jsonl';
        setFileName(name);
        
        const response = await authFetch(`${API_BASE}/files/read?path=${encodeURIComponent(filePath)}`);
        
        if (!response.ok) {
          throw new Error(t('jsonlPreview.errors.loadFailed'));
        }
        
        const data = await response.json();
        const parsed = parseJSONL(data.content);
        setContent(parsed);
      } catch (error) {
        console.error('Failed to load JSONL:', error);
        setError(error instanceof Error ? error.message : t('jsonlPreview.errors.unknownError'));
      } finally {
        setLoading(false);
      }
    };

    loadJSONL();
  }, [filePath, t]);

  // Filter content based on search term
  const filteredContent = useMemo(() => {
    if (!searchTerm) return content;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return content.filter(item =>
      item.raw.toLowerCase().includes(lowerSearchTerm)
    );
  }, [content, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredContent.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedContent = filteredContent.slice(startIndex, endIndex);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      } else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('jsonl-search')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentPage, totalPages]);

  // Toggle row expansion
  const toggleRow = (lineNumber: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(lineNumber)) {
      newExpanded.delete(lineNumber);
    } else {
      newExpanded.add(lineNumber);
    }
    setExpandedRows(newExpanded);
  };

  // Copy row to clipboard
  const copyRow = async (raw: string, lineNumber: number) => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopiedRow(lineNumber);
      setTimeout(() => setCopiedRow(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([content.map(item => item.raw).join('\n')], { type: 'application/jsonl;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Truncate long strings
  const truncate = (str: string, maxLength: number = 50): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          <span className="text-gray-700 dark:text-gray-300">{t('jsonlPreview.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('jsonlPreview.errors.title')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
          >
            {t('jsonlPreview.actions.close')}
          </button>
        </div>
      </div>
    );
  }

  const errorCount = content.filter(item => item.error).length;

  const containerClass = isMaximized 
    ? "fixed inset-4 bg-white dark:bg-gray-900 flex flex-col z-50 rounded-lg shadow-2xl"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

  const renderContent = () => (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FileJson className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {fileName}
            </h3>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('jsonlPreview.info.recordCount', { count: filteredContent.length })}
            {errorCount > 0 && (
              <span className="ml-2 text-red-500">
                ({t('jsonlPreview.info.errorCount', { count: errorCount })})
              </span>
            )}
            {searchTerm && ` (${t('jsonlPreview.info.filtered')})`}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {!isMaximized && (
            <button
              onClick={() => setIsMaximized(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t('jsonlPreview.actions.maximize')}
            >
              <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {isMaximized && (
            <button
              onClick={() => setIsMaximized(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t('jsonlPreview.actions.minimize')}
            >
              <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={t('jsonlPreview.actions.download')}
          >
            <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={t('jsonlPreview.actions.close')}
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="jsonl-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('jsonlPreview.search.placeholder')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {displayedContent.length > 0 ? (
          <div className="space-y-2">
            {displayedContent.map((item) => (
              <div
                key={item.lineNumber}
                className={`border rounded-lg overflow-hidden ${
                  item.error 
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                {/* Row Header */}
                <div 
                  className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => toggleRow(item.lineNumber)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-12">
                      #{item.lineNumber}
                    </span>
                    {item.error ? (
                      <span className="text-sm text-red-600 dark:text-red-400">
                        {item.error}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                        {truncate(item.raw, 80)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyRow(item.raw, item.lineNumber);
                      }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title={t('jsonlPreview.actions.copy')}
                    >
                      {copiedRow === item.lineNumber ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedRows.has(item.lineNumber) ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedRows.has(item.lineNumber) && item.data && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                    <pre className="text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Expanded Raw Content for Error Rows */}
                {expandedRows.has(item.lineNumber) && item.error && (
                  <div className="border-t border-red-200 dark:border-red-700 p-4 bg-red-50 dark:bg-red-900/30">
                    <pre className="text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap overflow-x-auto break-all">
                      {item.raw}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileJson className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('jsonlPreview.empty.noData')}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('jsonlPreview.pagination.showing', {
              start: startIndex + 1,
              end: Math.min(endIndex, filteredContent.length),
              total: filteredContent.length
            })}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('jsonlPreview.pagination.previous')}
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('jsonlPreview.pagination.next')}
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-700">
        {t('jsonlPreview.instructions')}
      </div>
    </>
  );

  return (
    <div className={containerClass}>
      {isMaximized ? (
        renderContent()
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
          {renderContent()}
        </div>
      )}
    </div>
  );
};
