import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { showInfo } from '../../utils/toast';
import { isCommandTrigger, formatCommandMessage } from '../../utils/commandFormatter';
import { createCommandHandler, SystemCommand } from '../../utils/commandHandler';
import type { ImageData } from './useImageUpload';
import type { AgentConfig } from '../../types/index.js';

export interface UseMessageSenderProps {
  agent: AgentConfig;
  projectPath?: string;
  inputMessage: string;
  isAiTyping: boolean;
  hasCommandsLoadError: boolean;
  userCommandsError?: any;
  projectCommandsError?: any;
  SYSTEM_COMMANDS: SystemCommand[];
  userCommands: any[];
  projectCommands: any[];
  selectedCommand: any;
  selectedImages: ImageData[];
  onSetInputMessage: (message: string) => void;
  onClearImages: () => void;
  onSetAiTyping: (typing: boolean) => void;
  onSetInitializingSession: (init: boolean) => void;
  onAddMessage: (message: any) => void;
  onAddCommandPartToMessage: (messageId: string, command: string) => void;
  onAddTextPartToMessage: (messageId: string, text: string) => void;
  onGetImagesForBackend: () => any[];
  onHandleNewSession: () => void;
  onSetCommandWarning: (warning: string | null) => void;
  onSetConfirmMessage: (message: string) => void;
  onSetConfirmAction: (action: () => void) => void;
  onSetShowConfirmDialog: (show: boolean) => void;
  onIsCommandDefined: (commandName: string) => boolean;
  onGetAllAvailableCommands: () => string;
}

export const useMessageSender = ({
  agent,
  projectPath,
  inputMessage,
  isAiTyping,
  hasCommandsLoadError,
  userCommandsError,
  projectCommandsError,
  SYSTEM_COMMANDS,
  userCommands,
  projectCommands,
  selectedCommand,
  selectedImages,
  onSetInputMessage,
  onClearImages,
  onSetAiTyping,
  onAddMessage,
  onAddCommandPartToMessage,
  onGetImagesForBackend,
  onHandleNewSession,
  onSetCommandWarning,
  onSetConfirmMessage,
  onSetConfirmAction,
  onSetShowConfirmDialog,
  onIsCommandDefined,
  onGetAllAvailableCommands
}: UseMessageSenderProps) => {
  const { t } = useTranslation('components');

  // Check if send should be disabled
  const isSendDisabled = useCallback(() => {
    if (isAiTyping) return true;
    if (!inputMessage.trim() && selectedImages.length === 0) return true;

    // Check for undefined command
    if (isCommandTrigger(inputMessage)) {
      const commandName = inputMessage.slice(1).split(' ')[0].toLowerCase();
      return !onIsCommandDefined(commandName);
    }

    return false;
  }, [inputMessage, isAiTyping, selectedImages, onIsCommandDefined]);

  // Create message with optimized flow
  const handleSendMessage = useCallback(async () => {
    if ((!inputMessage.trim() && selectedImages.length === 0) || isAiTyping) return;

    let userMessage = inputMessage.trim();

    // 🎯 使用 hook 方法转换图片
    const imageData = onGetImagesForBackend();
    
    // Check if this is a command and handle routing
    if (isCommandTrigger(inputMessage)) {
      const commandName = inputMessage.slice(1).split(' ')[0].toLowerCase();
      
      // Check if command is defined
      if (!onIsCommandDefined(commandName)) {
        // If commands failed to load, provide a more helpful error message
        if (hasCommandsLoadError) {
          onSetCommandWarning(t('agentChat.commandsLoadErrorWarning', {
            command: commandName,
            commands: SYSTEM_COMMANDS.map(cmd => cmd.content).join(', '),
            errorMessage: userCommandsError?.message || projectCommandsError?.message || 'Unknown error'
          }));
        } else {
          onSetCommandWarning(t('agentChat.unknownCommandWarning', {
            command: commandName,
            commands: onGetAllAvailableCommands()
          }));
        }
        return;
      }
      
      // Clear warning if command is valid
      onSetCommandWarning(null);
      
      // 创建命令处理器
      const commandHandler = createCommandHandler({
        agentStore: require('../../stores/useAgentStore').useAgentStore.getState(),
        onNewSession: onHandleNewSession,
        onNavigate: (path: string) => {
          showInfo(t('agentChat.navigateToAlert', { path }));
        },
        onConfirm: (message: string, onConfirm: () => void) => {
          onSetConfirmMessage(message);
          onSetConfirmAction(() => onConfirm);
          onSetShowConfirmDialog(true);
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
          onAddMessage(message);
          // 获取刚添加的消息ID
          const state = require('../../stores/useAgentStore').useAgentStore.getState();
          const messageId = state.messages[state.messages.length - 1].id;
          // 添加命令部分
          onAddCommandPartToMessage(messageId, userMessage);
        } else {
          // 前端处理完成，添加格式化的用户命令消息
          const commandArgs = inputMessage.slice(command.content.length).trim() || undefined;
          const formattedCommand = formatCommandMessage(command, commandArgs, projectPath);
          
          onAddMessage({
            content: formattedCommand,
            role: 'user',
            images: imageData
          });
          
          onSetInputMessage('');
          onClearImages();
          
          if (result.message && result.action !== 'confirm') {
            onAddMessage({
              content: result.message,
              role: 'assistant'
            });
          }
          return; // 不发送到后端
        }
      }
    } else {
      // Clear warning for non-command messages
      onSetCommandWarning(null);
    }
    
    onSetInputMessage('');
    onClearImages();
    
    // Add user message with images (only for non-command messages)
    // Commands are already added above
    if (!isCommandTrigger(inputMessage.trim())) {
      onAddMessage({
        content: userMessage || t('agentChat.sendImage'),
        role: 'user',
        images: imageData
      });
    }

    // Set AI typing state
    onSetAiTyping(true);
  }, [
    inputMessage,
    isAiTyping,
    selectedImages,
    onGetImagesForBackend,
    projectPath,
    agent,
    onSetInputMessage,
    onClearImages,
    onSetAiTyping,
    onAddMessage,
    onAddCommandPartToMessage,
    onGetAllAvailableCommands,
    onIsCommandDefined,
    onSetCommandWarning,
    onHandleNewSession
  ]);

  return {
    isSendDisabled,
    handleSendMessage
  };
};