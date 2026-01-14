import { useEffect, useRef } from 'react';

export type TabNotificationStatus = 'working' | 'completed' | 'error' | 'idle';

interface UseTabNotificationOptions {
  status: TabNotificationStatus;
  originalTitle?: string;
  workingText?: string;
  completedText?: string;
  errorText?: string;
  marqueeSpeed?: number; // 走马灯滚动速度(毫秒)
  blinkInterval?: number; // 闪烁间隔(毫秒)
}

/**
 * Hook to show tab title notifications when page is inactive
 *
 * @param status - Current notification status
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const { messages, isAiTyping, error } = useAgentStore();
 *
 * const status: TabNotificationStatus = useMemo(() => {
 *   if (error) return 'error';
 *   if (isAiTyping) return 'working';
 *   if (messages.length > 0 && !isAiTyping) return 'completed';
 *   return 'idle';
 * }, [isAiTyping, error, messages]);
 *
 * useTabNotification({ status });
 * ```
 */
export function useTabNotification({
  status,
  originalTitle = document.title,
  workingText = '🤖 AI 正在工作',
  completedText = '✅ 已完成',
  errorText = '❌ 发生错误',
  marqueeSpeed = 300,
  blinkInterval = 800,
}: UseTabNotificationOptions) {
  const intervalRef = useRef<number | null>(null);
  const isPageVisibleRef = useRef(!document.hidden);
  const originalTitleRef = useRef(originalTitle);
  const statusRef = useRef<TabNotificationStatus>('idle');

  // Update original title if it changes when page is visible
  useEffect(() => {
    if (!document.hidden) {
      originalTitleRef.current = originalTitle;
    }
  }, [originalTitle]);

  // Clear any existing interval
  const clearInterval = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Restore original title
  const restoreTitle = () => {
    clearInterval();
    document.title = originalTitleRef.current;
  };

  // Start marquee animation for working status
  const startMarquee = (text: string) => {
    clearInterval();
    let position = 0;
    const fullText = `${text}...    `;

    const updateTitle = () => {
      const displayText = fullText.slice(position) + fullText.slice(0, position);
      document.title = displayText;
      position = (position + 1) % fullText.length;
    };

    updateTitle();
    intervalRef.current = window.setInterval(updateTitle, marqueeSpeed);
  };

  // Start blinking animation for completed/error status
  const startBlink = (text: string) => {
    clearInterval();
    let showText = true;

    const updateTitle = () => {
      document.title = showText ? text : originalTitleRef.current;
      showText = !showText;
    };

    updateTitle();
    intervalRef.current = window.setInterval(updateTitle, blinkInterval);
  };

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;

      if (!document.hidden) {
        // Page became visible - restore original title
        restoreTitle();
      } else {
        // Page became hidden - show notification based on current status
        const currentStatus = statusRef.current;

        if (currentStatus === 'working') {
          startMarquee(workingText);
        } else if (currentStatus === 'completed') {
          startBlink(completedText);
        } else if (currentStatus === 'error') {
          startBlink(errorText);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval();
    };
  }, [workingText, completedText, errorText, marqueeSpeed, blinkInterval]);

  // Handle status changes
  useEffect(() => {
    statusRef.current = status;

    // Only show notifications when page is hidden
    if (document.hidden) {
      if (status === 'working') {
        startMarquee(workingText);
      } else if (status === 'completed') {
        startBlink(completedText);
      } else if (status === 'error') {
        startBlink(errorText);
      } else if (status === 'idle') {
        restoreTitle();
      }
    }
  }, [status, workingText, completedText, errorText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval();
      document.title = originalTitleRef.current;
    };
  }, []);
}
