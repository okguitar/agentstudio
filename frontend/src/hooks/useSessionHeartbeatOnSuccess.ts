import { useEffect, useRef } from 'react';
import { useSessionHeartbeat } from './useSessionHeartbeat';

interface UseSessionHeartbeatOnSuccessOptions {
  agentId?: string;
  sessionId?: string | null;
  projectPath?: string;
  enabled?: boolean;
  interval?: number;
  isNewSession?: boolean; // 是否是新会话
  hasSuccessfulResponse?: boolean; // 是否已收到成功的 AI 响应
}

/**
 * 基于 AI 响应成功状态的心跳管理 hook
 * 
 * 使用场景：
 * 1. 新建对话：用户发送第一句话且 AI 正确回复后开始心跳
 * 2. 恢复会话：打开已有会话时先检查存在性，若存在立即开始心跳；若不存在，待收到 AI 响应后开始心跳
 */
export const useSessionHeartbeatOnSuccess = ({
  agentId,
  sessionId,
  projectPath,
  enabled = true,
  interval = 30000,
  isNewSession = false,
  hasSuccessfulResponse = false
}: UseSessionHeartbeatOnSuccessOptions) => {
  const previousSessionIdRef = useRef<string | null | undefined>(null);
  const heartbeatStartedRef = useRef<boolean>(false);

  // 确定是否应该启用心跳
  const shouldEnableHeartbeat = (() => {
    if (!sessionId || !enabled) {
      return false;
    }

    // 新会话：必须等到收到成功响应
    if (isNewSession) {
      return hasSuccessfulResponse;
    }

    // 恢复会话：需要检查存在性
    return true;
  })();

  // 确定是否需要检查会话存在性（仅对恢复的会话）
  const shouldCheckExistence = !isNewSession && !!sessionId;

  const heartbeatHook = useSessionHeartbeat({
    agentId,
    sessionId,
    projectPath,
    enabled: shouldEnableHeartbeat,
    interval,
    shouldCheckExistence
  });

  // 当会话ID改变时重置状态
  useEffect(() => {
    if (previousSessionIdRef.current !== sessionId) {
      heartbeatStartedRef.current = false;
      previousSessionIdRef.current = sessionId;
    }
  }, [sessionId]);

  // 记录心跳启动状态
  useEffect(() => {
    if (shouldEnableHeartbeat && sessionId && !heartbeatStartedRef.current) {
      heartbeatStartedRef.current = true;
      console.log(`🚀 Heartbeat enabled for session: ${sessionId} (new: ${isNewSession}, hasResponse: ${hasSuccessfulResponse})`);
    }
  }, [shouldEnableHeartbeat, sessionId, isNewSession, hasSuccessfulResponse]);

  return {
    ...heartbeatHook,
    isHeartbeatActive: shouldEnableHeartbeat && heartbeatStartedRef.current
  };
};
