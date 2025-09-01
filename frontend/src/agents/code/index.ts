import type { AgentPlugin } from '../types.js';
import { CodeExplorerPanel } from './components/CodeExplorerPanel';

// 代码Agent插件配置
const codeAgent: AgentPlugin = {
  rightPanelComponent: CodeExplorerPanel,
  
  onMount: (agentId: string) => {
    console.log(`Code agent ${agentId} mounted`);
  },
  
  onUnmount: (agentId: string) => {
    console.log(`Code agent ${agentId} unmounted`);
  }
};

export default codeAgent;
