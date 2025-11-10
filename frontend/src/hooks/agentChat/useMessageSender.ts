import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { showInfo } from '../../utils/toast';
import { isCommandTrigger, formatCommandMessage } from '../../utils/commandFormatter';
import { createCommandHandler, SystemCommand } from '../../utils/commandHandler';
import { useAgentStore } from '../../stores/useAgentStore';
import { useAgentChat } from '../useAgents';
import { useAIStreamHandler, type UseAIStreamHandlerProps } from './useAIStreamHandler';
import type { ImageData } from './useImageUpload';
import type { AgentConfig } from '../../types/index.js';
import type { CommandType } from '../../utils/commandFormatter';

export interface UseMessageSenderProps {
  agent: AgentConfig;
  projectPath?: string;
  inputMessage: string;
  selectedImages: ImageData[];
  isAiTyping: boolean;
  currentSessionId: string | null;
  hasCommandsLoadError: boolean;
  userCommandsError?: Error;
  projectCommandsError?: Error;
  SYSTEM_COMMANDS: SystemCommand[];
  userCommands: CommandType[];
  projectCommands: CommandType[];
  selectedCommand: CommandType | null;
  selectedRegularTools: string[];
  selectedMcpTools: string[];
  mcpToolsEnabled: boolean;
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions';
  selectedModel: string;
  selectedClaudeVersion?: string;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  onSessionChange?: (sessionId: string | null) => void;
  setInputMessage: (message: string) => void;
  clearImages: () => void;
  setSelectedCommand: (command: CommandType | null) => void;
  setShowCommandSelector: (show: boolean) => void;
  setCommandWarning: (warning: string | null) => void;
  setIsInitializingSession: (init: boolean) => void;
  setCurrentSessionId: (id: string | null) => void;
  setIsNewSession: (isNew: boolean) => void;
  setAiTyping: (typing: boolean) => void;
  setHasSuccessfulResponse: (success: boolean) => void;
  setConfirmMessage: (message: string) => void;
  setConfirmAction: (action: (() => void) | null) => void;
  setShowConfirmDialog: (show: boolean) => void;
  handleNewSession: () => void;
  isCommandDefined: (commandName: string) => boolean;
  getAllAvailableCommands: () => string;
}

export const useMessageSender = (props: UseMessageSenderProps) => {
  const {
    agent,
    projectPath,
    inputMessage,
    selectedImages,
    isAiTyping,
    currentSessionId,
    hasCommandsLoadError,
    userCommandsError,
    projectCommandsError,
    SYSTEM_COMMANDS,
    userCommands,
    projectCommands,
    selectedCommand,
    selectedRegularTools,
    selectedMcpTools,
    mcpToolsEnabled,
    permissionMode,
    selectedModel,
    selectedClaudeVersion,
    abortControllerRef,
    onSessionChange,
    setInputMessage,
    clearImages,
    setSelectedCommand,
    setShowCommandSelector,
    setCommandWarning,
    setIsInitializingSession,
    setCurrentSessionId,
    setIsNewSession,
    setAiTyping,
    setHasSuccessfulResponse,
    setConfirmMessage,
    setConfirmAction,
    setShowConfirmDialog,
    handleNewSession,
    isCommandDefined,
    getAllAvailableCommands,
  } = props;

  const { t } = useTranslation('components');
  const { addMessage, addCommandPartToMessage, addTextPartToMessage } = useAgentStore();
  const agentChatMutation = useAgentChat();

  // Track if this is a compact command for special handling in SSE stream
  const isCompactCommandRef = useRef(false);

  // Initialize AI stream handler
  const streamHandlerProps: UseAIStreamHandlerProps = {
    agentId: agent.id,
    currentSessionId,
    projectPath,
    isCompactCommand: isCompactCommandRef.current,
    abortControllerRef,
    onSessionChange,
    setIsInitializingSession,
    setCurrentSessionId,
    setIsNewSession,
    setAiTyping,
    setHasSuccessfulResponse,
  };

  const { handleStreamMessage, handleStreamError, resetMessageId } = useAIStreamHandler(streamHandlerProps);

  // Check if send should be disabled
  const isSendDisabled = useCallback(() => {
    if (isAiTyping) return true;
    if (!inputMessage.trim() && selectedImages.length === 0) return true;

    // Check for undefined command
    if (isCommandTrigger(inputMessage)) {
      const commandName = inputMessage.slice(1).split(' ')[0].toLowerCase();
      return !isCommandDefined(commandName);
    }

    return false;
  }, [inputMessage, isAiTyping, selectedImages, isCommandDefined]);

  // Main send message handler
  const handleSendMessage = useCallback(async () => {
    if ((!inputMessage.trim() && selectedImages.length === 0) || isAiTyping) return;

    let userMessage = inputMessage.trim();
    const images = [...selectedImages];

    // Convert images to backend format
    const imageData = images.map(img => ({
      id: img.id,
      data: img.preview.split(',')[1], // Remove data:image/type;base64, prefix
      mediaType: img.file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      name: img.file.name
    }));

    // Check if this is a command and handle routing
    if (isCommandTrigger(inputMessage)) {
      const commandName = inputMessage.slice(1).split(' ')[0].toLowerCase();

      // Check if command is defined
      if (!isCommandDefined(commandName)) {
        // If commands failed to load, provide a more helpful error message
        if (hasCommandsLoadError) {
          setCommandWarning(t('agentChat.commandsLoadErrorWarning', {
            command: commandName,
            commands: SYSTEM_COMMANDS.map(cmd => cmd.content).join(', '),
            errorMessage: userCommandsError?.message || projectCommandsError?.message || 'Unknown error'
          }));
        } else {
          setCommandWarning(t('agentChat.unknownCommandWarning', {
            command: commandName,
            commands: getAllAvailableCommands()
          }));
        }
        return;
      }

      // Clear warning if command is valid
      setCommandWarning(null);

      // 创建命令处理器
      const commandHandler = createCommandHandler({
        agentStore: useAgentStore.getState(),
        onNewSession: handleNewSession,
        onNavigate: (path: string) => {
          showInfo(t('agentChat.navigateToAlert', { path }));
        },
        onConfirm: (message: string, onConfirm: () => void) => {
          setConfirmMessage(message);
          setConfirmAction(() => onConfirm);
          setShowConfirmDialog(true);
        }
      });

      // 创建命令对象（系统命令或从 selectedCommand）
      let command = selectedCommand;
      if (!command) {
        // 用户手动输入的命令，查找对应的命令对象
        command = SYSTEM_COMMANDS.find(cmd => cmd.name === commandName) ||
          projectCommands.find(cmd => cmd.name === commandName) ||
          userCommands.find(cmd => cmd.name === commandName) ||
          null;
      }

      if (command) {
        // 执行命令路由
        const result = await commandHandler.executeCommand(command);

        if (result.shouldSendToBackend) {
          // 后端命令：直接使用原始用户输入，不做任何格式化
          userMessage = inputMessage.trim();

          // 添加用户消息，使用 messageParts 显示命令组件
          const message = {
            content: '',
            role: 'user' as const,
            images: imageData
          };
          addMessage(message);
          // 获取刚添加的消息ID
          const state = useAgentStore.getState();
          const messageId = state.messages[state.messages.length - 1].id;
          // 添加命令部分
          addCommandPartToMessage(messageId, userMessage);
        } else {
          // 前端处理完成，添加格式化的用户命令消息
          const commandArgs = inputMessage.slice(command.content.length).trim() || undefined;
          const formattedCommand = formatCommandMessage(command, commandArgs, projectPath);

          addMessage({
            content: formattedCommand,
            role: 'user',
            images: imageData
          });

          setInputMessage('');
          clearImages();
          setSelectedCommand(null);
          setShowCommandSelector(false);

          if (result.message && result.action !== 'confirm') {
            addMessage({
              content: result.message,
              role: 'assistant'
            });
          }
          return; // 不发送到后端
        }
      }
    } else {
      // Clear warning for non-command messages
      setCommandWarning(null);
    }

    setInputMessage('');
    clearImages();
    setSelectedCommand(null);
    setShowCommandSelector(false);

    // Add user message with images (only for non-command messages)
    // Commands are already added above
    if (!isCommandTrigger(inputMessage.trim())) {
      addMessage({
        content: userMessage || t('agentChat.sendImage'),
        role: 'user',
        images: imageData
      });
    }

    // Build context - now simplified since each agent manages its own state
    const context = {};

    setAiTyping(true);

    // 检查是否需要创建新会话
    if (!currentSessionId) {
      console.log('🆕 No current session, will create new session');
      setIsInitializingSession(true);
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Track if this is a compact command for special handling in SSE stream
    isCompactCommandRef.current = userMessage.trim() === '/compact';

    // Reset AI message ID for new message
    resetMessageId();

    try {
      // 合并常规工具和MCP工具
      const allSelectedTools = [
        ...selectedRegularTools,
        ...(mcpToolsEnabled && selectedMcpTools.length > 0 ? selectedMcpTools : [])
      ];

      // Use agent-specific SSE streaming chat - pass null as sessionId if no current session
      await agentChatMutation.mutateAsync({
        agentId: agent.id,
        message: userMessage,
        images: imageData.length > 0 ? imageData : undefined,
        context,
        sessionId: currentSessionId, // Keep existing session or null for new session
        projectPath,
        mcpTools: allSelectedTools.length > 0 ? allSelectedTools : undefined,
        permissionMode,
        model: selectedModel,
        claudeVersion: selectedClaudeVersion,
        abortController,
        onMessage: handleStreamMessage,
        onError: handleStreamError
      });
    } catch (error) {
      console.error('Chat error:', error);
      setAiTyping(false);
      setIsInitializingSession(false);
      abortControllerRef.current = null;

      // Check if error is due to user cancellation
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request was aborted by user');
        return;
      }

      // Determine specific error message for catch block
      let errorMessage = t('agentChatPanel.errors.connectionFailed');

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = t('agentChatPanel.errors.networkConnectionFailed');
        } else if (error.message.includes('timeout')) {
          errorMessage = t('agentChatPanel.errors.connectionTimeout');
        } else {
          errorMessage = `❌ **${t('agentChatPanel.errors.connectionError')}**\n\n${error.message || t('agentChatPanel.errors.cannotConnectRetry')}`;
        }
      }

      addMessage({
        content: errorMessage,
        role: 'assistant'
      });
    }
  }, [
    agent,
    projectPath,
    inputMessage,
    selectedImages,
    isAiTyping,
    currentSessionId,
    hasCommandsLoadError,
    userCommandsError,
    projectCommandsError,
    SYSTEM_COMMANDS,
    userCommands,
    projectCommands,
    selectedCommand,
    selectedRegularTools,
    selectedMcpTools,
    mcpToolsEnabled,
    permissionMode,
    selectedModel,
    selectedClaudeVersion,
    abortControllerRef,
    setInputMessage,
    clearImages,
    setSelectedCommand,
    setShowCommandSelector,
    setCommandWarning,
    setIsInitializingSession,
    setAiTyping,
    handleNewSession,
    isCommandDefined,
    getAllAvailableCommands,
    t,
    addMessage,
    addCommandPartToMessage,
    addTextPartToMessage,
    agentChatMutation,
    handleStreamMessage,
    handleStreamError,
    resetMessageId,
    setConfirmMessage,
    setConfirmAction,
    setShowConfirmDialog,
  ]);

  return {
    isSendDisabled,
    handleSendMessage
  };
};
