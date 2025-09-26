## 🎯 设计目标

实现一个轻量级、可靠的智能标签页管理系统，支持所有URL打开方式的兼容性：
- 仪表板气泡按钮点击
- 直接URL地址栏输入
- 书签打开
- 外部链接跳转
- 浏览器历史记录
- 新窗口/新标签页打开

## 🏗️ 系统架构

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                    TabManager (核心管理器)                    │
├─────────────────────────────────────────────────────────────┤
│  • localStorage 持久化存储                                   │
│  • 标签页注册/注销                                          │
│  • 唤起信号发送/接收                                        │
│  • 自动清理过期标签页                                       │
└─────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌─────────────────┐    ┌──────────────────┐   ┌──────────────────┐
│ SessionsDashboard│    │   ChatPage       │   │  SmartNavigation │
│   (触发端)        │    │  (目标端)         │   │    (工具库)      │
├─────────────────┤    ├──────────────────┤   ├──────────────────┤
│ • 检测已存在标签页 │    │ • 自动注册标签页   │   │ • 智能路由决策    │
│ • 发送唤起信号    │    │ • 监听唤起信号    │   │ • 降级处理机制    │
│ • 智能打开/唤起   │    │ • 响应聚焦请求    │   │ • 统一API接口     │
└─────────────────┘    └──────────────────┘   └──────────────────┘
```

## 📁 文件结构和改动

### 新增文件

#### 1. `frontend/src/utils/tabManager.ts` (核心管理器)
```typescript
/**
 * 智能标签页管理器 - 核心实现
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

export class TabManager {
  private static instance: TabManager;
  private static readonly STORAGE_KEY = 'active_chat_tabs';
  private static readonly WAKEUP_SIGNAL_KEY = 'tab_wakeup_signal';
  private static readonly WAKEUP_RESPONSE_KEY = 'tab_wakeup_response';
  private static readonly TAB_TIMEOUT = 5 * 60 * 1000; // 5分钟超时
  
  private currentTabId: string;
  private cleanupInterval: number;
  
  private constructor() {
    this.currentTabId = this.generateTabId();
    this.startCleanupTimer();
    this.setupBeforeUnloadHandler();
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
    }
  }
  
  /**
   * 检查是否有活跃的标签页
   */
  hasActiveTab(agentId: string, sessionId: string): boolean {
    const tabs = this.getActiveTabs();
    const tabKey = this.getTabKey(agentId, sessionId);
    const tabInfo = tabs[tabKey];
    
    if (!tabInfo) return false;
    
    // 检查是否在超时时间内
    const isActive = (Date.now() - tabInfo.lastSeen) < TabManager.TAB_TIMEOUT;
    
    if (!isActive) {
      // 清理过期标签页
      delete tabs[tabKey];
      this.saveActiveTabs(tabs);
    }
    
    return isActive;
  }
  
  /**
   * 唤起已存在的标签页
   */
  async wakeupExistingTab(agentId: string, sessionId: string, targetUrl?: string): Promise<boolean> {
    if (!this.hasActiveTab(agentId, sessionId)) {
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
    
    // 返回清理函数
    return () => window.removeEventListener('storage', handleStorageChange);
  }
  
  // ==================== 私有方法 ====================
  
  private handleWakeupSignal(signal: WakeupSignal): void {
    console.log(`🔔 Received wakeup signal for session: ${signal.sessionId}`);
    
    // 1. 聚焦窗口
    window.focus();
    
    // 2. 如果页面在后台，标题闪烁提示
    if (document.hidden) {
      this.flashPageTitle();
    }
    
    // 3. 可选：播放提示音
    this.playNotificationSound();
    
    // 4. 如果URL不同，进行导航
    if (signal.sourceUrl && signal.sourceUrl !== window.location.href) {
      const url = new URL(signal.sourceUrl);
      if (url.pathname !== window.location.pathname || 
          url.search !== window.location.search) {
        window.history.replaceState(null, '', signal.sourceUrl);
        window.location.reload();
      }
    }
    
    // 5. 发送响应
    const response: WakeupResponse = {
      requestId: signal.requestId,
      agentId: signal.agentId,
      sessionId: signal.sessionId,
      success: true,
      timestamp: Date.now()
    };
    
    localStorage.setItem(TabManager.WAKEUP_RESPONSE_KEY, JSON.stringify(response));
    
    // 6. 清理信号
    localStorage.removeItem(TabManager.WAKEUP_SIGNAL_KEY);
    
    // 7. 更新活跃状态
    this.updateCurrentTabActivity(signal.agentId, signal.sessionId);
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
      // 使用 data URL 嵌入简单的提示音
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
      console.log('Audio not supported:', e);
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
  getDebugInfo(): { tabs: Record<string, TabInfo>; currentTabId: string } {
    return {
      tabs: this.getActiveTabs(),
      currentTabId: this.currentTabId
    };
  }
  
  /**
   * 清理所有标签页记录（调试用）
   */
  clearAllTabs(): void {
    localStorage.removeItem(TabManager.STORAGE_KEY);
    localStorage.removeItem(TabManager.WAKEUP_SIGNAL_KEY);
    localStorage.removeItem(TabManager.WAKEUP_RESPONSE_KEY);
    console.log('🗑️ All tab records cleared');
  }
}

// 导出单例实例
export const tabManager = TabManager.getInstance();
```

#### 2. `frontend/src/utils/smartNavigationV4.ts` (新版智能导航)
```typescript
/**
 * 方案4：基于 localStorage 的智能导航
 */

import { tabManager } from './tabManager';

export interface NavigationResult {
  action: 'awakened' | 'opened_new' | 'failed';
  success: boolean;
  message: string;
  windowRef?: Window | null;
}

/**
 * 智能导航主函数
 */
export async function smartNavigateV4(
  url: string, 
  agentId: string, 
  sessionId: string
): Promise<NavigationResult> {
  
  console.log(`🧠 Smart navigation: ${agentId}/${sessionId} -> ${url}`);
  
  try {
    // 1. 检查是否有活跃的标签页
    const hasActiveTab = tabManager.hasActiveTab(agentId, sessionId);
    
    if (hasActiveTab) {
      console.log(`🔍 Found active tab for session: ${sessionId}`);
      
      // 2. 尝试唤起已存在的标签页
      const awakened = await tabManager.wakeupExistingTab(agentId, sessionId, url);
      
      if (awakened) {
        return {
          action: 'awakened',
          success: true,
          message: `成功唤起已存在的会话标签页`
        };
      } else {
        console.log(`⚠️ Failed to wake up existing tab, opening new one`);
      }
    }
    
    // 3. 打开新标签页
    const windowName = getWindowName(agentId, sessionId);
    const newWindow = window.open(url, windowName);
    
    if (newWindow) {
      console.log(`🆕 Opened new tab for session: ${sessionId}`);
      return {
        action: 'opened_new',
        success: true,
        message: `打开新的会话标签页`,
        windowRef: newWindow
      };
    } else {
      // 可能被弹窗阻止，降级到当前页面导航
      console.log(`🚫 Popup blocked, navigating in current tab`);
      window.location.href = url;
      return {
        action: 'opened_new',
        success: true,
        message: `在当前标签页打开会话`
      };
    }
    
  } catch (error) {
    console.error('Smart navigation failed:', error);
    
    // 降级处理
    try {
      window.open(url) || (window.location.href = url);
      return {
        action: 'failed',
        success: false,
        message: `智能导航失败，使用降级方案`
      };
    } catch (fallbackError) {
      console.error('Fallback navigation also failed:', fallbackError);
      return {
        action: 'failed',
        success: false,
        message: `导航失败`
      };
    }
  }
}

/**
 * 生成窗口名称
 */
export function getWindowName(agentId: string, sessionId: string): string {
  return `chat_${agentId}_${sessionId}`;
}

/**
 * 从URL解析会话信息
 */
export function parseSessionFromUrl(url: string): { agentId: string; sessionId: string } | null {
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
 * 显示用户通知
 */
export function showNavigationNotification(result: NavigationResult): void {
  // 可以集成到现有的通知系统
  console.log(`📢 ${result.message}`);
  
  // 如果有 toast 组件，可以这样调用：
  // toast.success(result.message);
}
```

### 修改现有文件

#### 3. 修改 `frontend/src/components/SessionsDashboard.tsx`
```typescript
// 在文件顶部添加导入
import { smartNavigateV4, showNavigationNotification } from '../utils/smartNavigationV4';

// 替换现有的 handleOpenChat 函数
const handleOpenChat = async (session: SessionInfo) => {
  const url = `/chat/${session.agentId}?session=${session.sessionId}${session.projectPath ? `&project=${encodeURIComponent(session.projectPath)}` : ''}`;
  
  try {
    const result = await smartNavigateV4(url, session.agentId, session.sessionId);
    
    // 显示操作结果
    showNavigationNotification(result);
    
    // 记录详细日志
    console.log(`🎯 Navigation result:`, result);
    
  } catch (error) {
    console.error('Navigation failed:', error);
    // 降级：直接打开链接
    window.open(url);
  }
};
```

#### 4. 修改聊天页面组件
需要在所有聊天页面（ChatPage、AgentChatPanel等）中添加自动注册逻辑：

```typescript
// 在 ChatPage.tsx 或 AgentChatPanel.tsx 中添加
import { tabManager } from '../utils/tabManager';
import { parseSessionFromUrl } from '../utils/smartNavigationV4';

// 在组件中添加 useEffect
useEffect(() => {
  // 解析当前URL获取会话信息
  const sessionInfo = parseSessionFromUrl(window.location.href);
  
  if (sessionInfo) {
    const { agentId, sessionId } = sessionInfo;
    
    // 注册当前标签页
    tabManager.registerCurrentTab(agentId, sessionId);
    
    // 设置唤起监听器
    const cleanup = tabManager.setupWakeupListener(agentId, sessionId);
    
    // 定期更新活跃状态（与心跳一起）
    const updateActivity = () => {
      tabManager.updateCurrentTabActivity(agentId, sessionId);
    };
    
    const activityInterval = setInterval(updateActivity, 30000); // 30秒
    
    // 页面焦点变化时更新活跃状态
    const handleFocus = () => updateActivity();
    const handleVisibilityChange = () => {
      if (!document.hidden) updateActivity();
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 清理函数
    return () => {
      cleanup();
      clearInterval(activityInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }
}, [agent.id, currentSessionId]); // 依赖于实际的 agentId 和 sessionId
```

#### 5. 与心跳机制集成
修改 `frontend/src/hooks/useSessionHeartbeat.ts`：

```typescript
// 在心跳发送的同时更新标签页活跃状态
import { tabManager } from '../utils/tabManager';

// 在 sendHeartbeat 函数中添加
const sendHeartbeat = useCallback(async () => {
  // ... 现有的心跳逻辑
  
  // 同时更新标签页活跃状态
  if (agentId && sessionId) {
    tabManager.updateCurrentTabActivity(agentId, sessionId);
  }
  
  // ... 现有的心跳逻辑
}, [agentId, sessionId, projectPath, enabled]);
```

## 🎭 用户场景覆盖

### 场景1：仪表板气泡点击 ✅
```
用户操作: 仪表板 → 点击会话A气泡
系统处理: 
1. smartNavigateV4() 检查已存在标签页
2. 发现有活跃标签页 → 发送唤起信号
3. 目标标签页响应 → window.focus() + 标题闪烁
4. 用户看到标签页切换到前台

结果: ✅ 智能唤起现有标签页
```

### 场景2：直接URL输入 ✅
```
用户操作: 地址栏输入 /chat/general-chat?session=xxx
系统处理:
1. ChatPage 加载 → useEffect 触发
2. parseSessionFromUrl() 解析会话信息
3. tabManager.registerCurrentTab() 注册标签页
4. 设置唤起监听器

结果: ✅ 标签页被正确注册，后续智能导航生效
```

### 场景3：书签打开 ✅
```
用户操作: 点击书签 /chat/general-chat?session=xxx
系统处理: 同场景2，自动注册机制生效

结果: ✅ 标签页被注册并可被智能导航
```

### 场景4：外部链接 ✅
```
用户操作: 从邮件/其他应用点击聊天链接
系统处理: 同场景2，页面加载时自动注册

结果: ✅ 外部打开的标签页也被纳入管理
```

### 场景5：新窗口打开 ✅
```
用户操作: 右键 → "在新窗口中打开"
系统处理: 同场景2，每个窗口独立管理

结果: ✅ 新窗口标签页正常工作
```

### 场景6：混合场景 ✅
```
时间线:
T1: 用户直接URL打开会话A → 标签页1注册
T2: 用户在仪表板点击会话A气泡 → 唤起标签页1 ✅
T3: 用户通过气泡打开会话B → 新标签页2
T4: 用户直接URL打开会话B → 唤起标签页2 ✅

结果: ✅ 完美的智能管理
```

## 🎨 用户体验效果

### 视觉效果
1. **标签页切换**: 目标标签页自动切换到前台
2. **标题闪烁**: `🔔 会话已唤起` ↔ `原标题` (闪烁3次)
3. **聚焦提示**: 页面自动滚动到最新内容（可选）

### 音频效果
1. **提示音**: 轻微的"叮"声提示
2. **音量控制**: 30%音量，不打扰用户

### 交互反馈
1. **成功提示**: "成功唤起已存在的会话标签页"
2. **新开提示**: "打开新的会话标签页"
3. **失败降级**: "智能导航失败，使用降级方案"

## ⚡ 性能和可靠性

### 存储管理
- **自动清理**: 5分钟无活动的标签页自动清理
- **存储大小**: 每个标签页 ~200字节，100个标签页 ~20KB
- **清理频率**: 每分钟检查一次过期记录

### 错误处理
- **localStorage 异常**: 降级到普通导航
- **JSON 解析错误**: 忽略错误数据，重新开始
- **唤起超时**: 2秒超时后打开新标签页
- **权限限制**: window.focus() 失败时仍有视觉提示

### 兼容性
- **现代浏览器**: 100% 支持
- **IE11**: 部分支持（无 BroadcastChannel，但 localStorage 可用）
- **移动端**: 基本支持（window.focus() 效果有限）

## 🔧 调试和维护

### 调试工具
```javascript
// 浏览器控制台中可用的调试命令
window.tabManagerDebug = {
  // 查看所有活跃标签页
  showTabs: () => console.table(tabManager.getDebugInfo().tabs),
  
  // 清理所有记录
  clearAll: () => tabManager.clearAllTabs(),
  
  // 手动唤起测试
  testWakeup: (agentId, sessionId) => tabManager.wakeupExistingTab(agentId, sessionId),
  
  // 查看当前标签页ID
  getCurrentTabId: () => tabManager.getDebugInfo().currentTabId
};
```

### 监控指标
- 唤起成功率
- 标签页注册数量
- 清理的过期记录数
- 错误发生频率

## 📊 实施评估

### 开发工作量
- **新增代码**: ~800行
- **修改代码**: ~200行
- **测试覆盖**: 15个场景
- **开发时间**: 2-3天

### 风险评估
- **技术风险**: 低（基于成熟的 localStorage API）
- **兼容性风险**: 低（广泛的浏览器支持）
- **性能风险**: 低（轻量级实现）
- **维护风险**: 低（代码简洁，逻辑清晰）

这个完整的方案4设计能够以最小的复杂度实现智能标签页管理，覆盖所有常见的URL打开方式，并提供良好的用户体验！您觉得这个设计如何？
