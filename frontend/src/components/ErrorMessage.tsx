import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Copy, CheckCircle } from 'lucide-react';

interface ErrorMessageProps {
  error: string | Error | { message: string; details?: unknown; stack?: string };
  title?: string;
  showDetails?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  title = "Error occurred",
  showDetails = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract error information
  const getErrorInfo = () => {
    if (error instanceof Error) {
      return {
        message: error.message,
        details: error.stack || '',
        raw: error
      };
    } else if (typeof error === 'object' && error !== null) {
      return {
        message: (error as { message?: string }).message || JSON.stringify(error),
        details: (error as { details?: unknown; stack?: string }).details || (error as { stack?: string }).stack || JSON.stringify(error, null, 2),
        raw: error
      };
    } else {
      return {
        message: String(error),
        details: '',
        raw: String(error)
      };
    }
  };

  const errorInfo = getErrorInfo();
  const hasDetails = showDetails && (errorInfo.details || errorInfo.raw);

  const handleCopy = async () => {
    const textToCopy = errorInfo.details
      ? `${title}: ${errorInfo.message}\n\nDetails:\n${errorInfo.details}`
      : `${title}: ${errorInfo.message}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  return (
    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
      {/* Main Error Message */}
      <div className="flex items-start space-x-2">
        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {errorInfo.message}
          </p>

          {/* Expandable Details */}
          {hasDetails && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1 mt-2 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Hide Details</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Show Details</span>
                </>
              )}
            </button>
          )}

          {/* Detailed Error Information */}
          {isExpanded && hasDetails && (
            <div className="mt-3 space-y-2">
              {/* Raw Error Object */}
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded border border-red-200 dark:border-red-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">
                    Technical Details:
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    title="Copy error details"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs text-red-800 dark:text-red-200 whitespace-pre-wrap break-words overflow-x-auto font-mono max-h-40 overflow-y-auto">
                  {typeof errorInfo.details === 'string' ? errorInfo.details : JSON.stringify(errorInfo.details)}
                </pre>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-red-500 dark:text-red-400">
                Time: {new Date().toLocaleString()}
              </div>

              {/* Browser Info */}
              <div className="text-xs text-red-500 dark:text-red-400">
                Browser: {navigator.userAgent.split(' ')[0]} | URL: {window.location.href}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};