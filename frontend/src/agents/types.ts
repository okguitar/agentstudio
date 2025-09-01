import React from 'react';
import type { AgentConfig } from '../types/index.js';

// Agent插件通用属性接口
export interface AgentPanelProps {
  agent: AgentConfig;
  projectPath?: string;
}

// Agent插件配置接口
export interface AgentPlugin {
  // 右侧面板组件（有=split布局，无=single布局）
  rightPanelComponent?: React.ComponentType<AgentPanelProps>;
  
  // 生命周期钩子（可选）
  onMount?: (agentId: string) => void;
  onUnmount?: (agentId: string) => void;
}
