// 简单的事件总线，用于组件间通信
type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  // 订阅事件
  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  // 取消订阅
  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 发送事件
  emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // 清理所有事件监听器
  clear() {
    this.events.clear();
  }
}

// 创建全局事件总线实例
export const eventBus = new EventBus();

// 预定义的事件类型
export const EVENTS = {
  AI_RESPONSE_COMPLETE: 'ai_response_complete', // AI回复完成
  REFRESH_AGENT_CONTENT: 'refresh_agent_content', // 刷新Agent内容
} as const;