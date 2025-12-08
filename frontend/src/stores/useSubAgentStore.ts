/**
 * 子Agent消息状态管理
 * 用于追踪活跃的Task工具及其子Agent的实时消息流
 * 
 * 使用 parentToolUseId 来关联子Agent消息和对应的Task工具
 */

import { create } from 'zustand';
import type { SubAgentMessage, SubAgentMessagePart } from '../components/tools/types';

// 活跃的子Agent任务（按parentToolUseId索引）
interface ActiveSubAgentTask {
  parentToolUseId: string;   // Task工具的Claude ID (tool_use id)
  sessionId: string;         // 主会话ID
  messageFlow: SubAgentMessage[];  // 累积的子Agent消息流
  startedAt: number;         // 开始时间
  lastUpdatedAt: number;     // 最后更新时间
}

interface SubAgentState {
  // 活跃的子Agent任务映射: parentToolUseId -> ActiveSubAgentTask
  activeTasks: Map<string, ActiveSubAgentTask>;
}

interface SubAgentActions {
  // 注册一个正在执行的Task工具
  registerTaskTool: (taskToolClaudeId: string, sessionId: string) => void;
  
  // 激活子Agent任务（当收到第一条sidechain消息时调用）
  activateSubAgent: (parentToolUseId: string, sessionId: string) => void;
  
  // 添加子Agent消息部分
  addSubAgentMessagePart: (parentToolUseId: string, part: SubAgentMessagePart) => void;
  
  // 获取子Agent的消息流
  getSubAgentMessageFlow: (parentToolUseId: string) => SubAgentMessage[];
  
  // 清理指定的子Agent任务
  clearSubAgentTask: (parentToolUseId: string) => void;
  
  // 重置所有状态
  reset: () => void;
}

const initialState: SubAgentState = {
  activeTasks: new Map(),
};

export const useSubAgentStore = create<SubAgentState & SubAgentActions>((set, get) => ({
  ...initialState,

  registerTaskTool: (taskToolClaudeId: string, sessionId: string) => {
    console.log('📋 [SubAgentStore] Registering Task tool:', taskToolClaudeId, 'sessionId:', sessionId);
    // Task工具注册时，预先创建一个空的任务记录
    set((state) => {
      const newActiveTasks = new Map(state.activeTasks);
      if (!newActiveTasks.has(taskToolClaudeId)) {
        newActiveTasks.set(taskToolClaudeId, {
          parentToolUseId: taskToolClaudeId,
          sessionId,
          messageFlow: [],
          startedAt: Date.now(),
          lastUpdatedAt: Date.now(),
        });
      }
      return { activeTasks: newActiveTasks };
    });
  },

  activateSubAgent: (parentToolUseId: string, sessionId: string) => {
    const state = get();
    
    // 如果已经有这个任务，跳过
    if (state.activeTasks.has(parentToolUseId)) {
      console.log('📋 [SubAgentStore] SubAgent already active for:', parentToolUseId);
      return;
    }

    console.log('📋 [SubAgentStore] Activating SubAgent for parentToolUseId:', parentToolUseId);
    
    set((state) => {
      const newActiveTasks = new Map(state.activeTasks);
      newActiveTasks.set(parentToolUseId, {
        parentToolUseId,
        sessionId,
        messageFlow: [],
        startedAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
      return { activeTasks: newActiveTasks };
    });
  },

  addSubAgentMessagePart: (parentToolUseId: string, part: SubAgentMessagePart) => {
    set((state) => {
      const task = state.activeTasks.get(parentToolUseId);
      if (!task) {
        // 如果任务不存在，先创建一个
        console.log('📋 [SubAgentStore] Creating new task for parentToolUseId:', parentToolUseId);
        const newActiveTasks = new Map(state.activeTasks);
        newActiveTasks.set(parentToolUseId, {
          parentToolUseId,
          sessionId: '',
          messageFlow: [{
            id: `msg_${parentToolUseId}_${Date.now()}`,
            role: 'assistant' as const,
            timestamp: new Date().toISOString(),
            messageParts: [part],
          }],
          startedAt: Date.now(),
          lastUpdatedAt: Date.now(),
        });
        return { activeTasks: newActiveTasks };
      }

      const newActiveTasks = new Map(state.activeTasks);
      const existingTask = newActiveTasks.get(parentToolUseId)!;
      
      // 查找是否有同一个消息的部分需要更新
      const existingPartIndex = existingTask.messageFlow.findIndex(
        msg => msg.messageParts.some(p => p.id === part.id)
      );

      let updatedMessageFlow: SubAgentMessage[];
      
      if (existingPartIndex >= 0) {
        // 更新现有的消息部分
        updatedMessageFlow = existingTask.messageFlow.map((msg, idx) => {
          if (idx === existingPartIndex) {
            return {
              ...msg,
              messageParts: msg.messageParts.map(p => 
                p.id === part.id ? part : p
              ),
            };
          }
          return msg;
        });
      } else {
        // 添加新的消息部分 - 合并到最后一条消息或创建新消息
        const lastMessage = existingTask.messageFlow[existingTask.messageFlow.length - 1];
        
        if (lastMessage && lastMessage.role === 'assistant') {
          // 追加到最后一条assistant消息
          updatedMessageFlow = [
            ...existingTask.messageFlow.slice(0, -1),
            {
              ...lastMessage,
              messageParts: [...lastMessage.messageParts, part],
            },
          ];
        } else {
          // 创建新的assistant消息
          updatedMessageFlow = [
            ...existingTask.messageFlow,
            {
              id: `msg_${parentToolUseId}_${Date.now()}`,
              role: 'assistant' as const,
              timestamp: new Date().toISOString(),
              messageParts: [part],
            },
          ];
        }
      }

      newActiveTasks.set(parentToolUseId, {
        ...existingTask,
        messageFlow: updatedMessageFlow,
        lastUpdatedAt: Date.now(),
      });

      console.log('📋 [SubAgentStore] Added message part to', parentToolUseId, 
        'type:', part.type, 
        'total parts:', updatedMessageFlow.reduce((sum, m) => sum + m.messageParts.length, 0));

      return { activeTasks: newActiveTasks };
    });
  },

  getSubAgentMessageFlow: (parentToolUseId: string) => {
    const state = get();
    const task = state.activeTasks.get(parentToolUseId);
    return task?.messageFlow || [];
  },

  clearSubAgentTask: (parentToolUseId: string) => {
    console.log('📋 [SubAgentStore] Clearing SubAgent task:', parentToolUseId);
    set((state) => {
      const newActiveTasks = new Map(state.activeTasks);
      newActiveTasks.delete(parentToolUseId);
      return { activeTasks: newActiveTasks };
    });
  },

  reset: () => {
    console.log('📋 [SubAgentStore] Resetting state');
    set({ activeTasks: new Map() });
  },
}));

// 选择器：获取特定parentToolUseId的活跃任务
export const selectActiveSubAgentTask = (parentToolUseId: string) => 
  (state: SubAgentState) => state.activeTasks.get(parentToolUseId);

// 选择器：检查是否有任何活跃的子Agent任务
export const selectHasActiveSubAgents = () => 
  (state: SubAgentState) => state.activeTasks.size > 0;
