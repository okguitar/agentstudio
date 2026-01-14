/**
 * 智能标签页管理器 - 基于 localStorage 的轻量级实现
 * 支持所有URL打开方式的智能检测和标签页唤起
 */

interface TabInfo {
  agentId: string;
  sessionId: string;
  url: string;
  lastSeen: number;
  tabId: string;
  title: string;
}

interface WakeupSignal {
  type: 'WAKEUP';
  agentId: string;
  sessionId: string;
  requestId: string;
  timestamp: number;
  sourceUrl: string;
}

interface WakeupResponse {
  requestId: string;
  agentId: string;
  sessionId: string;
  success: boolean;
  timestamp: number;
}

interface SessionResumeRecord {
  originalSessionId: string;
  newSessionId: string;
  timestamp: number;
  agentId: string;
}

export class TabManager {
  private static instance: TabManager;
  private static readonly STORAGE_KEY = 'active_chat_tabs';
  private static readonly WAKEUP_SIGNAL_KEY = 'tab_wakeup_signal';
  private static readonly WAKEUP_RESPONSE_KEY = 'tab_wakeup_response';
  private static readonly TAB_TIMEOUT = 5 * 60 * 1000; // 5分钟超时
  
  private currentTabId: string;
  private cleanupInterval: number | undefined;
  private lastKnownSession: { agentId: string; sessionId: string } | null = null;
  private sessionResumeHistory: SessionResumeRecord[] = [];
  
  private constructor() {
    this.currentTabId = this.generateTabId();
    this.startCleanupTimer();
    this.setupBeforeUnloadHandler();
    console.log(`📱 TabManager initialized with ID: ${this.currentTabId}`);
  }
  
  static getInstance(): TabManager {
    if (!TabManager.instance) {
      TabManager.instance = new TabManager();
    }
    return TabManager.instance;
  }
  
  // ==================== 核心功能 ====================
  
  /**
   * 注册当前标签页
   */
  registerCurrentTab(agentId: string, sessionId: string): void {
    const tabs = this.getActiveTabs();
    const tabKey = this.getTabKey(agentId, sessionId);
    
    const tabInfo: TabInfo = {
      agentId,
      sessionId,
      url: window.location.href,
      lastSeen: Date.now(),
      tabId: this.currentTabId,
      title: document.title
    };
    
    tabs[tabKey] = tabInfo;
    this.saveActiveTabs(tabs);
    
    console.log(`📱 Tab registered: ${this.currentTabId} for session ${sessionId}`);
    
    // 更新内部跟踪状态
    this.lastKnownSession = { agentId, sessionId };
  }
  
  /**
   * 更新当前标签页活跃状态
   */
  updateCurrentTabActivity(agentId: string, sessionId: string): void {
    const tabs = this.getActiveTabs();
    const tabKey = this.getTabKey(agentId, sessionId);
    
    if (tabs[tabKey] && tabs[tabKey].tabId === this.currentTabId) {
      tabs[tabKey].lastSeen = Date.now();
      tabs[tabKey].url = window.location.href;
      tabs[tabKey].title = document.title;
      this.saveActiveTabs(tabs);
      
      // 更新内部跟踪状态
      this.lastKnownSession = { agentId, sessionId };
    }
  }
  
  /**
   * 检查是否有活跃的标签页
   */
  hasActiveTab(agentId: string, sessionId: string): boolean {
    return this.findActiveTabForSession(agentId, sessionId) !== null;
  }

  /**
   * 查找相同会话的标签页（忽略URL参数顺序）
   */
  private findActiveTabForSession(agentId: string, sessionId: string): TabInfo | null {
    const tabs = this.getActiveTabs();
    
    // 首先尝试直接查找
    const directTabKey = this.getTabKey(agentId, sessionId);
    if (tabs[directTabKey]) {
      const isActive = (Date.now() - tabs[directTabKey].lastSeen) < TabManager.TAB_TIMEOUT;
      if (isActive) {
        return tabs[directTabKey];
      }
    }
    
    // 如果直接查找失败，遍历所有标签页查找相同会话
    for (const [tabKey, tabInfo] of Object.entries(tabs)) {
      if (tabInfo.agentId === agentId && tabInfo.sessionId === sessionId) {
        const isActive = (Date.now() - tabInfo.lastSeen) < TabManager.TAB_TIMEOUT;
        if (isActive) {
          return tabInfo;
        } else {
          // 清理过期标签页
          delete tabs[tabKey];
          this.saveActiveTabs(tabs);
          console.log(`🗑️ Cleaned up expired tab: ${sessionId}`);
        }
      }
    }
    
    return null;
  }
  
  /**
   * 唤起已存在的标签页
   */
  async wakeupExistingTab(agentId: string, sessionId: string, targetUrl?: string): Promise<boolean> {
    const activeTab = this.findActiveTabForSession(agentId, sessionId);
    if (!activeTab) {
      return false;
    }
    
    const wakeupSignal: WakeupSignal = {
      type: 'WAKEUP',
      agentId,
      sessionId,
      requestId: this.generateRequestId(),
      timestamp: Date.now(),
      sourceUrl: targetUrl || window.location.href
    };
    
    console.log(`🔔 Sending wakeup signal for session: ${sessionId}`);
    
    // 发送唤起信号
    localStorage.setItem(TabManager.WAKEUP_SIGNAL_KEY, JSON.stringify(wakeupSignal));
    
    // 等待响应
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Wakeup timeout for session ${sessionId}`);
        resolve(false);
      }, 2000);
      
      const checkResponse = () => {
        const responseStr = localStorage.getItem(TabManager.WAKEUP_RESPONSE_KEY);
        if (responseStr) {
          try {
            const response: WakeupResponse = JSON.parse(responseStr);
            if (response.requestId === wakeupSignal.requestId) {
              clearTimeout(timeoutId);
              localStorage.removeItem(TabManager.WAKEUP_RESPONSE_KEY);
              console.log(`✅ Tab awakened successfully: ${sessionId}`);
              resolve(response.success);
              return;
            }
          } catch (e) {
            console.error('Error parsing wakeup response:', e);
          }
        }
      };
      
      // 轮询检查响应
      const intervalId = setInterval(checkResponse, 100);
      setTimeout(() => clearInterval(intervalId), 2000);
    });
  }
  
  /**
   * 监听并响应唤起信号
   */
  setupWakeupListener(agentId: string, sessionId: string): () => void {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TabManager.WAKEUP_SIGNAL_KEY && e.newValue) {
        try {
          const signal: WakeupSignal = JSON.parse(e.newValue);
          
          if (signal.type === 'WAKEUP' && 
              signal.agentId === agentId && 
              signal.sessionId === sessionId) {
            
            this.handleWakeupSignal(signal);
          }
        } catch (e) {
          console.error('Error handling wakeup signal:', e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // 额外的轮询检查，以防storage事件不可靠
    const pollInterval = setInterval(() => {
      const signalStr = localStorage.getItem(TabManager.WAKEUP_SIGNAL_KEY);
      if (signalStr) {
        try {
          const signal: WakeupSignal = JSON.parse(signalStr);
          
          if (signal.type === 'WAKEUP' && 
              signal.agentId === agentId && 
              signal.sessionId === sessionId) {
            
            // 检查信号是否是最近的（避免处理旧信号）
            if (Date.now() - signal.timestamp < 5000) { // 5秒内的信号
              this.handleWakeupSignal(signal);
            }
          }
        } catch (e) {
          console.error('Error polling wakeup signal:', e);
        }
      }
    }, 500); // 每500ms检查一次
    
    console.log(`🎯 Wakeup listener setup for session: ${sessionId}`);
    
    // 返回清理函数
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
      console.log(`🎯 Wakeup listener cleaned up for session: ${sessionId}`);
    };
  }
  
  // ==================== 会话切换和恢复 ====================
  
  /**
   * 更新当前标签页的会话信息（会话切换）
   */
  updateCurrentTabSession(oldAgentId: string, oldSessionId: string, newAgentId: string, newSessionId: string): void {
    const tabs = this.getActiveTabs();
    
    // 删除旧会话的记录
    const oldTabKey = this.getTabKey(oldAgentId, oldSessionId);
    if (tabs[oldTabKey] && tabs[oldTabKey].tabId === this.currentTabId) {
      delete tabs[oldTabKey];
    }
    
    // 添加新会话的记录
    const newTabKey = this.getTabKey(newAgentId, newSessionId);
    tabs[newTabKey] = {
      agentId: newAgentId,
      sessionId: newSessionId,
      url: window.location.href,
      lastSeen: Date.now(),
      tabId: this.currentTabId,
      title: document.title
    };
    
    this.saveActiveTabs(tabs);
    
    console.log(`🔄 Tab session updated: ${oldSessionId} → ${newSessionId}`);
    
    // 更新内部跟踪状态
    this.lastKnownSession = { agentId: newAgentId, sessionId: newSessionId };
  }
  
  /**
   * 注销当前标签页的指定会话
   */
  unregisterCurrentTabSession(agentId: string, sessionId: string): void {
    const tabs = this.getActiveTabs();
    const tabKey = this.getTabKey(agentId, sessionId);
    
    if (tabs[tabKey] && tabs[tabKey].tabId === this.currentTabId) {
      delete tabs[tabKey];
      this.saveActiveTabs(tabs);
      console.log(`📤 Unregistered current tab from session: ${sessionId}`);
    }
    
    // 清理内部跟踪状态
    if (this.lastKnownSession && 
        this.lastKnownSession.agentId === agentId && 
        this.lastKnownSession.sessionId === sessionId) {
      this.lastKnownSession = null;
    }
  }
  
  /**
   * 处理会话恢复（旧会话→新会话）
   */
  handleSessionResume(agentId: string, originalSessionId: string, newSessionId: string): void {
    const tabs = this.getActiveTabs();
    const originalTabKey = this.getTabKey(agentId, originalSessionId);
    const newTabKey = this.getTabKey(agentId, newSessionId);
    
    // 检查原会话是否由当前标签页管理
    if (tabs[originalTabKey] && tabs[originalTabKey].tabId === this.currentTabId) {
      // 删除旧会话记录
      delete tabs[originalTabKey];
      
      // 添加新会话记录
      tabs[newTabKey] = {
        agentId,
        sessionId: newSessionId,
        url: window.location.href,
        lastSeen: Date.now(),
        tabId: this.currentTabId,
        title: document.title
      };
      
      this.saveActiveTabs(tabs);
      
      console.log(`🔄 Session resumed: ${originalSessionId} → ${newSessionId}`);
      
      // 更新内部跟踪状态
      this.lastKnownSession = { agentId, sessionId: newSessionId };
    } else {
      // 原会话不是由当前标签页管理，但新会话是在当前标签页，进行注册
      this.registerCurrentTab(agentId, newSessionId);
      console.log(`🆕 Resumed session registered: ${newSessionId}`);
    }
  }
  
  /**
   * 记录会话恢复事件
   */
  recordSessionResume(agentId: string, originalSessionId: string, newSessionId: string): void {
    this.sessionResumeHistory.push({
      originalSessionId,
      newSessionId,
      timestamp: Date.now(),
      agentId
    });
    
    // 保留最近的100个记录
    if (this.sessionResumeHistory.length > 100) {
      this.sessionResumeHistory = this.sessionResumeHistory.slice(-100);
    }
    
    console.log(`📝 Recorded session resume: ${originalSessionId} → ${newSessionId}`);
  }
  
  // ==================== 智能监听 ====================
  
  /**
   * 智能更新当前标签页状态
   */
  smartUpdateCurrentTab(): void {
    const currentUrl = window.location.href;
    const sessionInfo = this.parseSessionFromUrl(currentUrl);
    
    if (!sessionInfo) {
      // 当前不在会话页面，清理相关记录
      if (this.lastKnownSession) {
        this.unregisterCurrentTabSession(
          this.lastKnownSession.agentId, 
          this.lastKnownSession.sessionId
        );
        this.lastKnownSession = null;
      }
      return;
    }
    
    const { agentId, sessionId } = sessionInfo;
    
    if (this.lastKnownSession) {
      const { agentId: lastAgentId, sessionId: lastSessionId } = this.lastKnownSession;
      
      if (lastSessionId !== sessionId || lastAgentId !== agentId) {
        // 检查是否是会话恢复
        const resumeRecord = this.sessionResumeHistory.find(record => 
          record.originalSessionId === lastSessionId && 
          record.newSessionId === sessionId &&
          record.agentId === agentId &&
          (Date.now() - record.timestamp) < 30000 // 30秒内的恢复记录
        );
        
        if (resumeRecord) {
          // 这是会话恢复，使用专门的处理方法
          this.handleSessionResume(agentId, lastSessionId, sessionId);
          console.log(`🔄 Detected session resume via URL: ${lastSessionId} → ${sessionId}`);
        } else {
          // 常规会话切换
          this.updateCurrentTabSession(lastAgentId, lastSessionId, agentId, sessionId);
          console.log(`🎯 Regular session switch: ${lastSessionId} → ${sessionId}`);
        }
      } else {
        // 会话没有变化，只更新活跃状态
        this.updateCurrentTabActivity(agentId, sessionId);
      }
    } else {
      // 首次进入会话页面
      this.registerCurrentTab(agentId, sessionId);
      console.log(`🎯 Initial session register: ${sessionId}`);
    }
    
    this.lastKnownSession = { agentId, sessionId };
  }
  
  /**
   * 启动智能监听
   */
  startSmartMonitoring(): () => void {
    // 立即执行一次
    this.smartUpdateCurrentTab();
    
    // 监听URL变化
    const handleUrlChange = () => {
      setTimeout(() => this.smartUpdateCurrentTab(), 100); // 小延迟确保DOM更新
    };
    
    // 监听popstate（浏览器前进后退）
    window.addEventListener('popstate', handleUrlChange);
    
    // 监听pushstate/replacestate（程序化导航）
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleUrlChange();
    };
    
    console.log(`🎯 Smart monitoring started for tab: ${this.currentTabId}`);
    
    // 返回清理函数
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      console.log(`🛑 Smart monitoring stopped for tab: ${this.currentTabId}`);
    };
  }
  
  // ==================== 私有方法 ====================
  
  private handleWakeupSignal(signal: WakeupSignal): void {
    console.log(`🔔 Received wakeup signal for session: ${signal.sessionId}`);
    
    // 1. 多重聚焦尝试
    try {
      // 尝试多种方法来聚焦窗口
      window.focus();
      
      // 如果在iframe中，尝试聚焦父窗口
      if (window.parent && window.parent !== window) {
        window.parent.focus();
      }
      
      // 尝试通过点击事件来获得焦点
      if (document.hidden) {
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(clickEvent);
      }
      
    } catch (e) {
      console.log('Focus attempt failed:', e);
    }
    
    // 2. 标题闪烁和音效提示
    this.flashPageTitle();
    this.playNotificationSound();
    
    // 3. 如果URL不同，进行导航
    if (signal.sourceUrl && signal.sourceUrl !== window.location.href) {
      // 使用智能会话比较，忽略参数顺序
      if (!this.isSameSession(signal.sourceUrl, window.location.href)) {
        console.log(`🔄 Navigating to: ${signal.sourceUrl}`);
        window.history.replaceState(null, '', signal.sourceUrl);
        window.location.reload();
      } else {
        console.log(`🎯 URLs point to same session, forcing visibility`);
        // 即使URL相同，也尝试让页面更加可见
        this.makePageVisible();
      }
    } else {
      // 没有URL差异，但仍然尝试提高可见性
      this.makePageVisible();
    }
    
    // 4. 发送响应
    const response: WakeupResponse = {
      requestId: signal.requestId,
      agentId: signal.agentId,
      sessionId: signal.sessionId,
      success: true,
      timestamp: Date.now()
    };
    
    localStorage.setItem(TabManager.WAKEUP_RESPONSE_KEY, JSON.stringify(response));
    
    // 5. 清理信号
    localStorage.removeItem(TabManager.WAKEUP_SIGNAL_KEY);
    
    // 6. 更新活跃状态
    this.updateCurrentTabActivity(signal.agentId, signal.sessionId);
    
    console.log(`✅ Wakeup signal processed successfully for session: ${signal.sessionId}`);
  }
  
  private flashPageTitle(): void {
    const originalTitle = document.title;
    let flashCount = 0;
    
    const flashInterval = setInterval(() => {
      document.title = flashCount % 2 === 0 ? '🔔 会话已唤起' : originalTitle;
      flashCount++;
      
      if (flashCount > 6) { // 闪烁3次
        clearInterval(flashInterval);
        document.title = originalTitle;
      }
    }, 500);
    
    // 页面获得焦点时立即停止闪烁
    const stopFlashing = () => {
      clearInterval(flashInterval);
      document.title = originalTitle;
      window.removeEventListener('focus', stopFlashing);
    };
    
    window.addEventListener('focus', stopFlashing);
  }
  
  private playNotificationSound(): void {
    try {
      // 使用 Web Audio API 生成简单的提示音
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log('Audio notification not supported:', e);
    }
  }

  private makePageVisible(): void {
    try {
      // 尝试多种方法使页面更可见
      
      // 1. 滚动到顶部
      window.scrollTo(0, 0);
      
      // 2. 尝试全屏然后退出（如果支持）
      if (document.fullscreenEnabled) {
        document.documentElement.requestFullscreen?.()?.then(() => {
          setTimeout(() => {
            document.exitFullscreen?.();
          }, 100);
        }).catch(e => console.log('Fullscreen toggle failed:', e));
      }
      
      // 3. 创建一个临时的动画来吸引注意
      const indicator = document.createElement('div');
      indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 18px;
        font-weight: bold;
        z-index: 999999;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: bounce 0.6s ease-in-out;
      `;
      
      // 添加CSS动画
      const style = document.createElement('style');
      style.textContent = `
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate(-50%, -50%) translateY(0);
          }
          40%, 43% {
            transform: translate(-50%, -50%) translateY(-20px);
          }
          70% {
            transform: translate(-50%, -50%) translateY(-10px);
          }
          90% {
            transform: translate(-50%, -50%) translateY(-5px);
          }
        }
      `;
      document.head.appendChild(style);
      
      indicator.textContent = '🎯 会话已激活';
      document.body.appendChild(indicator);
      
      // 2秒后移除指示器
      setTimeout(() => {
        if (document.body.contains(indicator)) {
          document.body.removeChild(indicator);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 2000);
      
      console.log('🎯 Made page more visible');
      
    } catch (e) {
      console.log('Make page visible failed:', e);
    }
  }
  
  private parseSessionFromUrl(url: string): { agentId: string; sessionId: string } | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const chatIndex = pathParts.indexOf('chat');
      
      if (chatIndex !== -1 && pathParts[chatIndex + 1]) {
        const agentId = pathParts[chatIndex + 1];
        const sessionId = urlObj.searchParams.get('session');
        
        if (agentId && sessionId) {
          return { agentId, sessionId };
        }
      }
      
      return null;
    } catch (e) {
      console.error('Error parsing session from URL:', e);
      return null;
    }
  }

  /**
   * 比较两个URL是否指向相同的会话（忽略参数顺序）
   */
  private isSameSession(url1: string, url2: string): boolean {
    try {
      const session1 = this.parseSessionFromUrl(url1);
      const session2 = this.parseSessionFromUrl(url2);
      
      if (!session1 || !session2) return false;
      
      return session1.agentId === session2.agentId && session1.sessionId === session2.sessionId;
    } catch (e) {
      console.error('Error comparing session URLs:', e);
      return false;
    }
  }
  
  private getActiveTabs(): Record<string, TabInfo> {
    try {
      const stored = localStorage.getItem(TabManager.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Error reading active tabs:', e);
      return {};
    }
  }
  
  private saveActiveTabs(tabs: Record<string, TabInfo>): void {
    try {
      localStorage.setItem(TabManager.STORAGE_KEY, JSON.stringify(tabs));
    } catch (e) {
      console.error('Error saving active tabs:', e);
    }
  }
  
  private getTabKey(agentId: string, sessionId: string): string {
    return `${agentId}_${sessionId}`;
  }
  
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private startCleanupTimer(): void {
    // 每分钟清理一次过期标签页
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupExpiredTabs();
    }, 60000);
  }
  
  private cleanupExpiredTabs(): void {
    const tabs = this.getActiveTabs();
    const now = Date.now();
    let cleaned = 0;
    
    Object.keys(tabs).forEach(tabKey => {
      if (now - tabs[tabKey].lastSeen > TabManager.TAB_TIMEOUT) {
        delete tabs[tabKey];
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      this.saveActiveTabs(tabs);
      console.log(`🗑️ Cleaned up ${cleaned} expired tabs`);
    }
  }
  
  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // 页面卸载时清理当前标签页记录
      const tabs = this.getActiveTabs();
      Object.keys(tabs).forEach(tabKey => {
        if (tabs[tabKey].tabId === this.currentTabId) {
          delete tabs[tabKey];
        }
      });
      this.saveActiveTabs(tabs);
    });
  }
  
  // ==================== 调试方法 ====================
  
  /**
   * 获取所有活跃标签页信息（调试用）
   */
  getDebugInfo(): { 
    tabs: Record<string, TabInfo>; 
    currentTabId: string;
    lastKnownSession: { agentId: string; sessionId: string } | null;
    resumeHistory: SessionResumeRecord[];
  } {
    return {
      tabs: this.getActiveTabs(),
      currentTabId: this.currentTabId,
      lastKnownSession: this.lastKnownSession,
      resumeHistory: this.sessionResumeHistory
    };
  }
  
  /**
   * 清理所有标签页记录（调试用）
   */
  clearAllTabs(): void {
    localStorage.removeItem(TabManager.STORAGE_KEY);
    localStorage.removeItem(TabManager.WAKEUP_SIGNAL_KEY);
    localStorage.removeItem(TabManager.WAKEUP_RESPONSE_KEY);
    this.sessionResumeHistory = [];
    this.lastKnownSession = null;
    console.log('🗑️ All tab records cleared');
  }

  /**
   * 停止清理定时器（调试用）
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      console.log('🛑 Cleanup timer stopped');
    }
  }
}

// 导出单例实例
export const tabManager = TabManager.getInstance();

// 全局调试工具
(window as any).tabManagerDebug = {
  showTabs: () => console.table(tabManager.getDebugInfo().tabs),
  clearAll: () => tabManager.clearAllTabs(),
  testWakeup: (agentId: string, sessionId: string) => tabManager.wakeupExistingTab(agentId, sessionId),
  getCurrentTabId: () => tabManager.getDebugInfo().currentTabId,
  getDebugInfo: () => tabManager.getDebugInfo()
};
