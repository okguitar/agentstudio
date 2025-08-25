import React from 'react';
import { BaseToolComponent, ToolOutput } from './BaseToolComponent';
import type { ToolExecution, ExitPlanModeToolInput } from './types';

interface ExitPlanModeToolProps {
  execution: ToolExecution;
}

export const ExitPlanModeTool: React.FC<ExitPlanModeToolProps> = ({ execution }) => {
  const input = execution.toolInput as ExitPlanModeToolInput;

  return (
    <BaseToolComponent execution={execution}>
      <div>
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-2">实施计划:</p>
          <div className="p-3 rounded-md border bg-emerald-50 border-emerald-200">
            <div className="text-sm text-emerald-800 whitespace-pre-wrap break-words">
              {input.plan}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-emerald-600 bg-emerald-100 p-2 rounded">
          📋 计划模式已退出，准备开始实施
        </div>
      </div>
      
      {execution.toolResult && !execution.isError && (
        <ToolOutput result={execution.toolResult} />
      )}
    </BaseToolComponent>
  );
};