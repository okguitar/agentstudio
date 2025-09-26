/**
 * 智能导航工具 - 基于 localStorage 和 TabManager 的智能导航
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
/**
 * 标准化URL参数顺序，确保相同会话生成相同URL
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    const params = new URLSearchParams(urlObj.search);
    
    // 按固定顺序重新排列参数：project -> session -> 其他
    const normalizedParams = new URLSearchParams();
    
    if (params.has('project')) {
      normalizedParams.set('project', params.get('project')!);
    }
    if (params.has('session')) {
      normalizedParams.set('session', params.get('session')!);
    }
    
    // 添加其他参数
    for (const [key, value] of params.entries()) {
      if (key !== 'session' && key !== 'project') {
        normalizedParams.set(key, value);
      }
    }
    
    return `${urlObj.pathname}?${normalizedParams.toString()}`;
  } catch (e) {
    console.warn('Failed to normalize URL:', e);
    return url;
  }
}

export async function smartNavigate(
  url: string, 
  agentId: string, 
  sessionId: string
): Promise<NavigationResult> {
  
  console.log(`🧠 Smart navigation: ${agentId}/${sessionId} -> ${url}`);
  
  try {
    // 标准化URL参数顺序
    const normalizedUrl = normalizeUrl(url);
    console.log(`🔄 Normalized URL: ${normalizedUrl}`);
    
    // 第一步：尝试使用window.open的窗口名称机制（最可靠的方法）
    const windowName = getWindowName(agentId, sessionId);
    console.log(`🎯 Attempting window.open with name: ${windowName}`);
    const targetWindow = window.open(normalizedUrl, windowName);
    
    if (targetWindow) {
      // 检查是否是新窗口还是现有窗口
      const isNewWindow = targetWindow.location.href === 'about:blank' || 
                         targetWindow.document.readyState === 'loading';
      
      if (!isNewWindow) {
        console.log(`✅ Successfully focused existing window for session: ${sessionId}`);
        return {
          action: 'awakened',
          success: true,
          message: `成功切换到已存在的会话标签页`,
          windowRef: targetWindow
        };
      } else {
        console.log(`🆕 Opened new window for session: ${sessionId}`);
        return {
          action: 'opened_new',
          success: true,
          message: `打开新的会话标签页`,
          windowRef: targetWindow
        };
      }
    }
    
    // 第二步：如果window.open失败，尝试TabManager的BroadcastChannel唤起
    const hasActiveTab = tabManager.hasActiveTab(agentId, sessionId);
    console.log(`🔍 TabManager reports active tab: ${hasActiveTab}`);
    
    if (hasActiveTab) {
      console.log(`🔍 Found active tab in TabManager for session: ${sessionId}`);
      
      // 尝试通过BroadcastChannel唤起已存在的标签页
      const awakened = await tabManager.wakeupExistingTab(agentId, sessionId, normalizedUrl);
      
      if (awakened) {
        console.log(`✅ Successfully awakened existing tab via BroadcastChannel for session: ${sessionId}`);
        return {
          action: 'awakened',
          success: true,
          message: `通过后台信号唤起会话标签页`
        };
      } else {
        console.log(`⚠️ Failed to wake up existing tab via BroadcastChannel`);
      }
    }
    
    // 第三步：降级到当前标签页导航
    console.log(`🔄 Falling back to current tab navigation`);
    window.location.href = normalizedUrl;
    return {
      action: 'opened_new',
      success: true,
      message: `在当前标签页打开会话`
    };
    
  } catch (error) {
    console.error('Smart navigation failed:', error);
    
    // 降级处理
    try {
      const fallbackWindow = window.open(url);
      if (!fallbackWindow) {
        window.location.href = url;
      }
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
  console.log(`📢 ${result.message}`);
  
  // 创建简单的 toast 通知
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${result.success ? '#10b981' : '#ef4444'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-size: 14px;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 300px;
    transition: all 0.3s ease;
  `;
  
  toast.textContent = result.message;
  document.body.appendChild(toast);
  
  // 3秒后移除
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

/**
 * 测试智能导航功能
 */
export async function testSmartNavigation(): Promise<void> {
  console.log('🧪 Testing smart navigation...');
  
  // 测试数据
  const testCases = [
    { agentId: 'general-chat', sessionId: 'test-session-1' },
    { agentId: 'general-chat', sessionId: 'test-session-2' },
    { agentId: 'code-assistant', sessionId: 'test-session-3' }
  ];
  
  for (const testCase of testCases) {
    const url = `/chat/${testCase.agentId}?session=${testCase.sessionId}`;
    console.log(`Testing: ${url}`);
    
    const result = await smartNavigate(url, testCase.agentId, testCase.sessionId);
    console.log(`Result:`, result);
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🧪 Smart navigation test completed');
}
