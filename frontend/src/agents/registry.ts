import type { AgentPlugin } from './types.js';
import slidesAgent from './slides';
import chatAgent from './chat';
import documentsAgent from './documents';
import codeAgent from './code';

// Agent插件注册表
// 根据AgentConfig.ui.componentType映射到对应的插件
export const AgentRegistry: Record<string, AgentPlugin> = {
  'slides': slidesAgent,
  'chat': chatAgent,
  'documents': documentsAgent,
  'code': codeAgent,
  // 'custom': customAgent, // 未来可以支持自定义插件
};

// 获取Agent插件的辅助函数
export const getAgentPlugin = (componentType: string): AgentPlugin | undefined => {
  return AgentRegistry[componentType];
};

// 检查Agent是否支持分栏布局
export const hasRightPanel = (componentType: string): boolean => {
  const plugin = getAgentPlugin(componentType);
  return !!plugin?.rightPanelComponent;
};
