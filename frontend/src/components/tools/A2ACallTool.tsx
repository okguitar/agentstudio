import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent } from './BaseToolComponent';
import type { BaseToolExecution } from './sdk-types';
import {
  Network,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

/**
 * A2A Call Tool Props Interface
 */
interface A2ACallToolProps {
  execution: BaseToolExecution;
}

/**
 * A2A Call Tool Input Interface
 */
interface A2ACallInput {
  agentUrl: string;
  agentName?: string;
  message: string;
  useTask?: boolean;
  timeout?: number;
}

/**
 * A2A Call Tool Result Interface
 */
interface A2ACallResult {
  success: boolean;
  data?: {
    response?: string;
    taskId?: string;
    status?: string;
    metadata?: Record<string, any>;
  };
  error?: string;
  taskId?: string;
  status?: string;
}

/**
 * Extract agent name from A2A URL
 */
const extractAgentName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Check if hostname is an IP address (v4 or v6)
    // Simple regex for IPv4, can be more robust if needed
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);

    if (isIp) {
      return hostname;
    }

    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[0];
    }
    return hostname;
  } catch {
    const match = url.match(/\/([^/]+)$/);
    return match ? match[1] : url;
  }
};

/**
 * A2A Call Tool Component
 * Refactored to align with BashOutputTool style using BaseToolComponent
 */
export const A2ACallTool: React.FC<A2ACallToolProps> = ({ execution }) => {
  const { t } = useTranslation();
  const input = execution.toolInput as unknown as A2ACallInput;

  // Safe JSON parsing
  let result: A2ACallResult | undefined;
  if (execution.toolResult) {
    try {
      result = JSON.parse(execution.toolResult) as A2ACallResult;
    } catch (e) {
      result = {
        success: false,
        error: execution.toolResult
      };
    }
  }

  const agentName = input.agentName || extractAgentName(input.agentUrl);

  // Determine status
  const isPending = !result;
  const isRunning = result?.status === 'running' || result?.status === 'pending';
  const isSuccess = result?.success === true;
  const isError = result?.success === false || Boolean(result?.error);

  // Subtitle for BaseToolComponent
  const getSubtitle = () => {
    let subtitle = agentName;
    if (input.useTask) subtitle += ` • ${t('tools.a2a.asyncTask', 'Async Task')}`;

    if (isPending) subtitle += ` • ${t('tools.a2a.calling', 'Calling...')}`;
    else if (isRunning) subtitle += ` • ${t('tools.a2a.running', 'Running...')}`;
    else if (isSuccess) subtitle += ` • ${t('tools.a2a.success', 'Success')}`;
    else if (isError) subtitle += ` • ${t('tools.a2a.error', 'Failed')}`;

    return subtitle;
  };

  // Status display helper
  const getStatusDisplay = () => {
    if (isPending || isRunning) {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        text: isRunning ? t('tools.a2a.running', 'Running') : t('tools.a2a.calling', 'Calling')
      };
    }
    if (isSuccess) {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'bg-green-100 text-green-800 border-green-200',
        text: t('tools.a2a.success', 'Success')
      };
    }
    return {
      icon: <XCircle className="w-4 h-4" />,
      className: 'bg-red-100 text-red-800 border-red-200',
      text: t('tools.a2a.error', 'Failed')
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <BaseToolComponent
      execution={execution}
      subtitle={getSubtitle()}
      showResult={false}
      isMcpTool={true}
      hideToolName={false}
      customIcon={<Network className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
      overrideToolName="call_external_agent"
    >
      <div className="space-y-3">
        {/* Status and Input Summary */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${statusDisplay.className}`}>
            {statusDisplay.icon}
            {statusDisplay.text}
          </div>

          {/* Agent URL */}
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-200">
            <span className="text-gray-500 dark:text-gray-400 mr-2">Agent:</span>
            <span className="break-all">{input.agentUrl}</span>
          </div>

          {/* Message */}
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
            <span className="text-gray-500 dark:text-gray-400 mr-2 block mb-1">Message:</span>
            <div className="whitespace-pre-wrap">{input.message}</div>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <>
            {/* Response */}
            {result.data?.response && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Network className="w-4 h-4" />
                  {t('tools.a2a.response', 'Response')}
                </div>
                <pre className="bg-gray-900 text-green-400 rounded-lg px-3 py-2 text-sm font-mono overflow-x-auto whitespace-pre-wrap border dark:border-gray-700">
                  {result.data.response}
                </pre>
              </div>
            )}

            {/* Error */}
            {result.error && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  {t('tools.a2a.error', 'Error')}
                </div>
                <pre className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                  {result.error}
                </pre>
              </div>
            )}

            {/* Metadata/Task Info */}
            {(result.taskId || result.data?.metadata) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                {result.taskId && <div>Task ID: {result.taskId}</div>}
                {result.data?.metadata && <div>Metadata: {JSON.stringify(result.data.metadata)}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </BaseToolComponent>
  );
};

export default A2ACallTool;
