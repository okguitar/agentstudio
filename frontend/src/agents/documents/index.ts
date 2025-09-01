import type { AgentPlugin } from '../types.js';
import { DocumentOutlinePanel } from './components/DocumentOutlinePanel';

// 文档Agent插件配置
const documentsAgent: AgentPlugin = {
  rightPanelComponent: DocumentOutlinePanel,
  
  onMount: (agentId: string) => {
    console.log(`Documents agent ${agentId} mounted`);
  },
  
  onUnmount: (agentId: string) => {
    console.log(`Documents agent ${agentId} unmounted`);
  }
};

export default documentsAgent;
