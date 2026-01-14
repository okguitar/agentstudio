import type { AgentPlugin } from '../types.js';

// 纯聊天Agent插件配置
// 无右侧面板，使用single布局
const chatAgent: AgentPlugin = {
  // 没有rightPanelComponent，表示single布局
  
  onMount: (agentId: string) => {
    console.log(`Chat agent ${agentId} mounted`);
  },
  
  onUnmount: (agentId: string) => {
    console.log(`Chat agent ${agentId} unmounted`);
  }
};

export default chatAgent;
