import type { AgentPlugin } from '../types.js';
import { SlidePreviewPanel } from './components/SlidePreviewPanel';

// 幻灯片Agent插件配置
const slidesAgent: AgentPlugin = {
  rightPanelComponent: SlidePreviewPanel,
  
  onMount: (agentId: string) => {
    console.log(`Slides agent ${agentId} mounted`);
  },
  
  onUnmount: (agentId: string) => {
    console.log(`Slides agent ${agentId} unmounted`);
  }
};

export default slidesAgent;
