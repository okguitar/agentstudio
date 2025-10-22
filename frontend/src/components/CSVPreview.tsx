import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Download, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';

interface CSVPreviewProps {
  filePath: string;
  onClose: () => void;
}

export const CSVPreview: React.FC<CSVPreviewProps> = ({ filePath, onClose }) => {
  const { t } = useTranslation('components');
  const [content, setContent] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMaximized, setIsMaximized] = useState(false);
  const [rowsPerPage] = useState(50);
  const [fileName, setFileName] = useState('');

  // Parse CSV content
  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    const result: string[][] = [];
    
    for (const line of lines) {
      const row: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            currentValue += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          row.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      row.push(currentValue.trim());
      result.push(row);
    }
    
    return result;
  };

  // Load CSV content
  useEffect(() => {
    const loadCSV = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Extract file name from path
        const name = filePath.split(/[/\\]/).pop() || 'unknown.csv';
        setFileName(name);
        
        const response = await authFetch(`${API_BASE}/files/read?path=${encodeURIComponent(filePath)}`);
        
        if (!response.ok) {
          throw new Error(t('csvPreview.errors.loadFailed'));
        }
        
        const data = await response.json();
        const parsed = parseCSV(data.content);
        setContent(parsed);
      } catch (error) {
        console.error('Failed to load CSV:', error);
        setError(error instanceof Error ? error.message : t('csvPreview.errors.unknownError'));
      } finally {
        setLoading(false);
      }
    };

    loadCSV();
  }, [filePath, t]);

  // Filter content based on search term
  const filteredContent = useMemo(() => {
    if (!searchTerm) return content;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return content.filter(row =>
      row.some(cell => cell.toLowerCase().includes(lowerSearchTerm))
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
        document.getElementById('csv-search')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentPage, totalPages]);

  // Handle download
  const handleDownload = () => {
    const csvContent = content.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if needed
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-700 dark:text-gray-300">{t('csvPreview.loading')}</span>
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
              {t('csvPreview.errors.title')}
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
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {t('csvPreview.actions.close')}
          </button>
        </div>
      </div>
    );
  }

  const containerClass = isMaximized 
    ? "fixed inset-4 bg-white dark:bg-gray-900 flex flex-col z-50"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

  return (
    <div className={containerClass}>
      {isMaximized ? (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {fileName}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('csvPreview.info.rowCount', { count: filteredContent.length })}
                {searchTerm && ` (${t('csvPreview.info.filtered')})`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMaximized(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title={t('csvPreview.actions.minimize')}
              >
                <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title={t('csvPreview.actions.download')}
              >
                <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title={t('csvPreview.actions.close')}
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
                id="csv-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('csvPreview.search.placeholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-4">
            {displayedContent.length > 0 ? (
              <div className="min-w-full">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      {displayedContent[0]?.map((header, index) => (
                        <th
                          key={index}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700"
                        >
                          {header || t('csvPreview.table.untitled')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayedContent.slice(1).map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-100 dark:border-gray-800"
                          >
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>{t('csvPreview.empty.noData')}</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('csvPreview.pagination.showing', {
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
                  title={t('csvPreview.pagination.previous')}
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
                  title={t('csvPreview.pagination.next')}
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {fileName}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('csvPreview.info.rowCount', { count: filteredContent.length })}
                {searchTerm && ` (${t('csvPreview.info.filtered')})`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMaximized(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={t('csvPreview.actions.maximize')}
              >
                <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={t('csvPreview.actions.download')}
              >
                <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={t('csvPreview.actions.close')}
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="csv-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('csvPreview.search.placeholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-4">
            {displayedContent.length > 0 ? (
              <div className="min-w-full">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      {displayedContent[0]?.map((header, index) => (
                        <th
                          key={index}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700"
                        >
                          {header || t('csvPreview.table.untitled')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayedContent.slice(1).map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-100 dark:border-gray-800"
                          >
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>{t('csvPreview.empty.noData')}</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('csvPreview.pagination.showing', {
                  start: startIndex + 1,
                  end: Math.min(endIndex, filteredContent.length),
                  total: filteredContent.length
                })}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('csvPreview.pagination.previous')}
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('csvPreview.pagination.next')}
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-700">
            {t('csvPreview.instructions')}
          </div>
        </div>
      )}
    </div>
  );
};