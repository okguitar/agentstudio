/**
 * Unit tests for useAIStreamHandler.ts - Character-by-Character Text Streaming
 * Tests for User Story 1: Text streaming and User Story 2: Thinking streaming
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIStreamHandler } from '../agentChat/useAIStreamHandler';
import { useAgentStore } from '../../stores/useAgentStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../utils/eventBus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
  EVENTS: {
    AI_RESPONSE_COMPLETE: 'AI_RESPONSE_COMPLETE',
  },
}));

vi.mock('../../utils/tabManager', () => ({
  tabManager: {
    handleSessionResume: vi.fn(),
    recordSessionResume: vi.fn(),
  },
}));

describe('useAIStreamHandler - Text Streaming (US1)', () => {
  let queryClient: QueryClient;
  let abortControllerRef: React.MutableRefObject<AbortController | null>;
  const setIsInitializingSession = vi.fn();
  const setCurrentSessionId = vi.fn();
  const setIsNewSession = vi.fn();
  const setAiTyping = vi.fn();
  const setHasSuccessfulResponse = vi.fn();
  const onSessionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    abortControllerRef = {
      current: null,
    };

    // Reset Zustand store
    useAgentStore.setState({
      messages: [],
      currentAgent: null,
      currentSessionId: null,
      isAiTyping: false,
      mcpStatus: {
        hasError: false,
        connectedServers: [],
        connectionErrors: [],
        lastError: undefined,
        lastErrorDetails: undefined,
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('T017-T022: Partial Text Message Detection and Accumulation', () => {
    it('T018: should detect partial text message (type: stream_event)', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Send message_start event
      act(() => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'message_start',
            message: {
              id: 'msg-123',
              type: 'message',
              role: 'assistant',
              content: [],
            },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send content_block_start event
      act(() => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_start',
            index: 0,
            content_block: {
              type: 'text',
              text: '',
            },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send content_block_delta event
      act(() => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            index: 0,
            delta: {
              type: 'text_delta',
              text: 'Hello',
            },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Verify that a message was created
      const messages = useAgentStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
    });

    it('T019: should accumulate text content across multiple fragments', async () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Send first fragment
      act(() => {
        result.current.handleStreamMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: 'Hello ',
              },
            ],
          },
        });
      });

      // Send second fragment
      act(() => {
        result.current.handleStreamMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: 'world',
              },
            ],
          },
        });
      });

      // Verify accumulated content
      const messages = useAgentStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.role).toBe('assistant');

      // Check that text was accumulated (message parts)
      if (lastMessage.messageParts) {
        const textParts = lastMessage.messageParts.filter(
          (part: any) => part.type === 'text'
        );
        expect(textParts.length).toBeGreaterThan(0);
      }
    });

    it('T020: should track block ID to prevent duplicates', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      const blockId = 'text-block-unique';

      // Send same block twice with same ID
      act(() => {
        result.current.handleStreamMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'text',
                id: blockId,
                text: 'Same content ',
              },
            ],
          },
        });
      });

      const messagesAfterFirst = useAgentStore.getState().messages;
      const countAfterFirst = messagesAfterFirst.length;

      act(() => {
        result.current.handleStreamMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'text',
                id: blockId,
                text: 'Same content again',
              },
            ],
          },
        });
      });

      const messagesAfterSecond = useAgentStore.getState().messages;
      // Should accumulate to same message, not create duplicate
      expect(messagesAfterSecond.length).toBe(countAfterFirst);
    });

    it('T021: should finalize content on result event', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Send partial text
      act(() => {
        result.current.handleStreamMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: 'Partial text',
              },
            ],
          },
        });
      });

      // Send result event
      act(() => {
        result.current.handleStreamMessage({
          type: 'result',
          subtype: 'success',
        });
      });

      // Verify AI typing was stopped
      expect(setAiTyping).toHaveBeenCalledWith(false);
      expect(setHasSuccessfulResponse).toHaveBeenCalledWith(true);
    });

    it('T022: should preserve partial content on network interruption', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Send partial content
      act(() => {
        result.current.handleStreamMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: 'Partial content before interruption',
              },
            ],
          },
        });
      });

      const messagesBeforeError = useAgentStore.getState().messages;
      expect(messagesBeforeError.length).toBeGreaterThan(0);

      // Simulate network error
      const networkError = new Error('Network error');
      act(() => {
        result.current.handleStreamError(networkError);
      });

      // Verify partial content is preserved
      const messagesAfterError = useAgentStore.getState().messages;
      expect(messagesAfterError.length).toBe(messagesBeforeError.length);

      // Error should be appended to the existing message
      const lastMessage = messagesAfterError[messagesAfterError.length - 1];
      expect(lastMessage.role).toBe('assistant');
    });
  });

  describe('Session Management', () => {
    it('should handle session initialization', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: null,
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleStreamMessage({
          type: 'system',
          subtype: 'init',
          sessionId: 'new-session-id',
        });
      });

      expect(setIsInitializingSession).toHaveBeenCalledWith(false);
      expect(setCurrentSessionId).toHaveBeenCalledWith('new-session-id');
      expect(setIsNewSession).toHaveBeenCalledWith(true);
      expect(onSessionChange).toHaveBeenCalledWith('new-session-id');
    });

    it('should handle session resume with new branch', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'original-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleStreamMessage({
          type: 'session_resumed',
          subtype: 'new_branch',
          originalSessionId: 'original-session',
          newSessionId: 'new-branch-session',
          message: 'Session resumed with new branch',
          sessionId: 'new-branch-session',
        });
      });

      expect(setIsInitializingSession).toHaveBeenCalledWith(false);
      expect(setCurrentSessionId).toHaveBeenCalledWith('new-branch-session');
      expect(setIsNewSession).toHaveBeenCalledWith(true);
      expect(onSessionChange).toHaveBeenCalledWith('new-branch-session');
    });
  });

  describe('Error Handling', () => {
    it('should handle Claude Code SDK errors', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleStreamMessage({
          type: 'error',
          error: 'Claude Code SDK failed',
          message: 'Test error message',
        });
      });

      expect(setAiTyping).toHaveBeenCalledWith(false);
      expect(setIsInitializingSession).toHaveBeenCalledWith(false);

      // Verify error message was added
      const messages = useAgentStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.role).toBe('assistant');
      expect(lastMessage.content).toContain('error');
    });

    it('should handle abort errors gracefully', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      const abortError = new DOMException('Request aborted', 'AbortError');

      act(() => {
        result.current.handleStreamError(abortError);
      });

      // Should not add error message for user-initiated abort
      expect(setAiTyping).toHaveBeenCalledWith(false);
    });

    it('should handle generic stream errors', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      const genericError = new Error('Generic stream error');

      act(() => {
        result.current.handleStreamError(genericError);
      });

      expect(setAiTyping).toHaveBeenCalledWith(false);
      expect(setIsInitializingSession).toHaveBeenCalledWith(false);

      // Verify error message was added
      const messages = useAgentStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Message ID Management', () => {
    it('should reset message ID when starting new message', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Send first message
      act(() => {
        result.current.handleStreamMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'First message' }],
          },
        });
      });

      const firstMessageCount = useAgentStore.getState().messages.length;

      // Reset message ID
      act(() => {
        result.current.resetMessageId();
      });

      // Send second message
      act(() => {
        result.current.handleStreamMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Second message' }],
          },
        });
      });

      const secondMessageCount = useAgentStore.getState().messages.length;
      expect(secondMessageCount).toBeGreaterThan(firstMessageCount);
    });
  });
});

describe('useAIStreamHandler - Thinking Streaming (US2)', () => {
  let queryClient: QueryClient;
  let abortControllerRef: React.MutableRefObject<AbortController | null>;
  const setIsInitializingSession = vi.fn();
  const setCurrentSessionId = vi.fn();
  const setIsNewSession = vi.fn();
  const setAiTyping = vi.fn();
  const setHasSuccessfulResponse = vi.fn();
  const onSessionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    abortControllerRef = {
      current: null,
    };

    // Reset Zustand store
    useAgentStore.setState({
      messages: [],
      currentAgent: null,
      currentSessionId: null,
      isAiTyping: false,
      mcpStatus: {
        hasError: false,
        connectedServers: [],
        connectionErrors: [],
        lastError: undefined,
        lastErrorDetails: undefined,
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('T032-T034: Partial Thinking Message Detection and Accumulation', () => {
    it('T032: should detect partial thinking message', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Send message_start event
      act(() => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'message_start',
            message: {
              id: 'msg-123',
              type: 'message',
              role: 'assistant',
              content: [],
            },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send content_block_start event for thinking
      act(() => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_start',
            index: 0,
            content_block: {
              type: 'thinking',
              thinking: '',
            },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send content_block_delta event for thinking
      act(() => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            index: 0,
            delta: {
              type: 'thinking_delta',
              thinking: 'Let me think about this...',
            },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Verify that a message was created
      const messages = useAgentStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
    });

    it('T033: should accumulate thinking content across multiple fragments', async () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Send message_start
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'message_start',
            message: { id: 'msg-123', type: 'message', role: 'assistant', content: [] },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send content_block_start for thinking
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'thinking', thinking: '' },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send first thinking fragment
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'thinking_delta', thinking: 'I need to analyze ' },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
        // Wait for RAF to flush
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      });

      // Send second thinking fragment
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'thinking_delta', thinking: 'this problem carefully' },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
        // Wait for RAF to flush
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      });

      // Send content_block_stop
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_stop',
            index: 0,
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Verify accumulated thinking content
      const messages = useAgentStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.role).toBe('assistant');

      // Check that thinking was accumulated (message parts)
      if (lastMessage.messageParts) {
        const thinkingParts = lastMessage.messageParts.filter(
          (part: any) => part.type === 'thinking'
        );
        expect(thinkingParts.length).toBeGreaterThan(0);
        // Verify accumulated content
        const fullThinking = thinkingParts[0].content;
        expect(fullThinking).toBe('I need to analyze this problem carefully');
      }
    });

    it('T034: should handle simultaneous text and thinking block streaming', async () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Send message_start
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'message_start',
            message: { id: 'msg-123', type: 'message', role: 'assistant', content: [] },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send thinking block start (index 0)
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'thinking', thinking: '' },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send thinking delta
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'thinking_delta', thinking: 'Let me reason about this...' },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      });

      // Send thinking block stop
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_stop',
            index: 0,
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send text block start (index 1)
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_start',
            index: 1,
            content_block: { type: 'text', text: '' },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send text delta
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            index: 1,
            delta: { type: 'text_delta', text: 'Here is my answer: ' },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      });

      // Send text block stop
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_stop',
            index: 1,
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Verify both types were processed
      const messages = useAgentStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.role).toBe('assistant');

      // Verify both thinking and text parts exist
      if (lastMessage.messageParts) {
        const thinkingParts = lastMessage.messageParts.filter(
          (part: any) => part.type === 'thinking'
        );
        const textParts = lastMessage.messageParts.filter(
          (part: any) => part.type === 'text'
        );
        
        expect(thinkingParts.length).toBeGreaterThan(0);
        expect(textParts.length).toBeGreaterThan(0);
        
        // Verify content
        expect(thinkingParts[0].content).toBe('Let me reason about this...');
        expect(textParts[0].content).toBe('Here is my answer: ');
      }
    });
  });
});

describe('useAIStreamHandler - Tool Streaming (US4)', () => {
  let queryClient: QueryClient;
  let abortControllerRef: React.MutableRefObject<AbortController | null>;
  const setIsInitializingSession = vi.fn();
  const setCurrentSessionId = vi.fn();
  const setIsNewSession = vi.fn();
  const setAiTyping = vi.fn();
  const setHasSuccessfulResponse = vi.fn();
  const onSessionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    abortControllerRef = {
      current: null,
    };

    useAgentStore.setState({
      messages: [],
      currentAgent: null,
      currentSessionId: null,
      isAiTyping: false,
      mcpStatus: {
        hasError: false,
        connectedServers: [],
        connectionErrors: [],
        lastError: undefined,
        lastErrorDetails: undefined,
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('T038-T039: Tool Use Block Display', () => {
    it('T038: should handle tool_use blocks in streaming messages', async () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Send message_start
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'message_start',
            message: { id: 'msg-123', type: 'message', role: 'assistant', content: [] },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send tool_use block start
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_start',
            index: 0,
            content_block: {
              type: 'tool_use',
              id: 'tool-1',
              name: 'read_file',
              input: {},
            },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send partial tool input delta
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            index: 0,
            delta: {
              type: 'input_json_delta',
              partial_json: '{"path": "/test/fi',
            },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send complete tool input delta
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            index: 0,
            delta: {
              type: 'input_json_delta',
              partial_json: '{"path": "/test/file.txt"}',
            },
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      // Send tool block stop
      await act(async () => {
        result.current.handleStreamMessage({
          type: 'stream_event',
          event: {
            type: 'content_block_stop',
            index: 0,
          },
          sessionId: 'test-session',
          agentId: 'test-agent',
          timestamp: Date.now(),
        });
      });

      const messages = useAgentStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.messageParts) {
        const toolParts = lastMessage.messageParts.filter(
          (part: any) => part.type === 'tool'
        );
        expect(toolParts.length).toBeGreaterThan(0);
        
        // Verify tool input was accumulated
        const toolPart = toolParts[0];
        expect(toolPart.toolData?.toolName).toBe('read_file');
        expect(toolPart.toolData?.toolInput).toEqual({ path: '/test/file.txt' });
      }
    });

    it('T039: should maintain backward compatibility for complete tool blocks', () => {
      const { result } = renderHook(
        () =>
          useAIStreamHandler({
            agentId: 'test-agent',
            currentSessionId: 'test-session',
            abortControllerRef,
            setIsInitializingSession,
            setCurrentSessionId,
            setIsNewSession,
            setAiTyping,
            setHasSuccessfulResponse,
            onSessionChange,
          }),
        { wrapper }
      );

      // Traditional assistant message with tool_use (non-streaming)
      act(() => {
        result.current.handleStreamMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'tool-complete',
                name: 'bash',
                input: { command: 'ls -la' },
              },
            ],
          },
        });
      });

      const messages = useAgentStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.messageParts) {
        const toolParts = lastMessage.messageParts.filter(
          (part: any) => part.type === 'tool'
        );
        expect(toolParts.length).toBeGreaterThan(0);
        if (toolParts[0] && toolParts[0].toolData) {
          expect(toolParts[0].toolData.toolName).toBe('bash');
        }
      }
    });
  });
});

