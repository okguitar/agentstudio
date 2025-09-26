import { useEffect, useRef, useCallback } from 'react';
import { tabManager } from '../utils/tabManager';
import { API_BASE } from '../lib/config';

interface UseSessionHeartbeatOptions {
  agentId?: string;
  sessionId?: string | null;
  projectPath?: string;
  enabled?: boolean;
  interval?: number;
  shouldCheckExistence?: boolean; // 是否需要检查会话在 SessionManager 中的存在性
}

/**
 * 自定义 hook 用于管理会话心跳
 */
export const useSessionHeartbeat = ({
  agentId,
  sessionId,
  projectPath,
  enabled = true,
  interval = 30000, // 30秒
  shouldCheckExistence = false
}: UseSessionHeartbeatOptions) => {
  const intervalRef = useRef<number | null>(null);
  const lastHeartbeatRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(true);
  const existenceCheckedRef = useRef<boolean>(false);

  // 检查会话是否在 SessionManager 中存在
  const checkSessionExists = useCallback(async (): Promise<boolean> => {
    if (!agentId || !sessionId) {
      return false;
    }

    try {
      const url = `${API_BASE}/sessions/${agentId}/${sessionId}/check`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🔍 Session existence check: ${sessionId} - ${data.exists ? 'exists' : 'not found'}`);
        return data.exists;
      }
      return false;
    } catch (error) {
      console.error('❌ Error checking session existence:', error);
      return false;
    }
  }, [agentId, sessionId]);

  const sendHeartbeat = useCallback(async () => {
    if (!agentId || !sessionId || !enabled) {
      return;
    }

    try {
      const url = `${API_BASE}/sessions/${agentId}/${sessionId}/heartbeat`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        const data = await response.json();
        lastHeartbeatRef.current = data.timestamp;
        console.log(`💓 Session heartbeat sent successfully: ${sessionId}`);
        
        // 同时更新TabManager活跃状态
        tabManager.updateCurrentTabActivity(agentId, sessionId);
      } else {
        console.warn(`⚠️ Failed to send heartbeat for session ${sessionId}:`, response.status);
      }
    } catch (error) {
      console.error('💔 Error sending session heartbeat:', error);
    }
  }, [agentId, sessionId, projectPath, enabled]);

  // 处理页面可见性变化
  const handleVisibilityChange = useCallback(() => {
    isActiveRef.current = !document.hidden;
    
    if (isActiveRef.current && enabled && sessionId) {
      // 页面重新可见时立即发送心跳（虽然现在后台也在发送，但重新可见时立即发送一次确保同步）
      sendHeartbeat();
    }
  }, [sendHeartbeat, enabled, sessionId]);

  // 启动心跳
  const startHeartbeat = useCallback(async () => {
    if (!enabled || !sessionId || intervalRef.current) {
      return;
    }

    // 如果需要检查存在性
    if (shouldCheckExistence && !existenceCheckedRef.current) {
      const exists = await checkSessionExists();
      existenceCheckedRef.current = true;
      
      if (!exists) {
        console.log(`⏸️ Session ${sessionId} not found in SessionManager, heartbeat not started`);
        return;
      }
    }

    console.log(`💓 Starting heartbeat for session: ${sessionId}`);
    
    // 立即发送一次心跳
    sendHeartbeat();
    
    // 设置定时器 - 无论标签页是否活跃都发送心跳
    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, interval);
  }, [enabled, sessionId, sendHeartbeat, interval, shouldCheckExistence, checkSessionExists]);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      console.log(`💔 Stopping heartbeat for session: ${sessionId}`);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [sessionId]);

  // 监听会话ID变化
  useEffect(() => {
    // 重置存在性检查标记
    existenceCheckedRef.current = false;
    
    if (sessionId && enabled) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }

    return () => {
      stopHeartbeat();
    };
  }, [sessionId, enabled, startHeartbeat, stopHeartbeat]);

  // 监听页面可见性变化
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    sendHeartbeat,
    startHeartbeat,
    stopHeartbeat,
    checkSessionExists,
    lastHeartbeat: lastHeartbeatRef.current
  };
};
