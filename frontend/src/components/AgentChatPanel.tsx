import React, { useState, useRef, useEffect } from 'react';
import { Clock, Plus, RefreshCw, ChevronDown } from 'lucide-react';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgentSessions, useAgentSessionMessages, useInterruptSession } from '../hooks/useAgents';
import { useSessionHeartbeatOnSuccess } from '../hooks/useSessionHeartbeatOnSuccess';
import { useSessions } from '../hooks/useSessions';
import { useResponsiveSettings } from '../hooks/useResponsiveSettings';
import { tabManager } from '../utils/tabManager';
import { useQueryClient } from '@tanstack/react-query';
import { SessionsDropdown } from './SessionsDropdown';
import type { AgentConfig } from '../types/index.js';
import { isCommandTrigger } from '../utils/commandFormatter';
import { useTranslation } from 'react-i18next';
import { loadBackendServices, getCurrentService } from '../utils/backendServiceStorage';
import { useMobileContext } from '../contexts/MobileContext';
import {
  useImageUpload,
  useScrollManagement,
  useCommandCompletion,
  useToolSelector,
  useClaudeVersionManager,
  useMessageSender
} from '../hooks/agentChat';
import {
  ChatMessageList,
  AgentInputArea,
  createAgentCommandSelectorKeyHandler
} from './agentChat';

interface AgentChatPanelProps {
  agent: AgentConfig;
  projectPath?: string;
  onSessionChange?: (sessionId: string | null) => void;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ agent, projectPath, onSessionChange }) => {
  const { t } = useTranslation('components');
  const { isCompactMode } = useResponsiveSettings();
  const { isMobile } = useMobileContext();
  
  // Refs - 需要在hooks之前定义
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 基础状态
  const [inputMessage, setInputMessage] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showMcpStatusModal, setShowMcpStatusModal] = useState(false);
  const [hasSuccessfulResponse, setHasSuccessfulResponse] = useState(false);
  const [isNewSession, setIsNewSession] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isInitializingSession, setIsInitializingSession] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Agent store状态 - 需要在其他hooks之前  
  const {
    messages,
    isAiTyping,
    currentSessionId,
    mcpStatus,
    addMessage,
    interruptAllExecutingTools,
    setAiTyping,
    setCurrentSessionId,
    clearMessages,
    loadSessionMessages,
  } = useAgentStore();

  // 使用重构的 hooks
  const {
    selectedImages,
    previewImage,
    isDragOver,
    handleImageSelect,
    handleImageRemove,
    handleImagePreview,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearImages,
    setPreviewImage
  } = useImageUpload({
    textareaRef,
    inputMessage,
    setInputMessage
  });

  const scrollManagement = useScrollManagement({
    messagesContainerRef,
    messagesEndRef,
    messages,
    isAiTyping
  });

  const commandCompletion = useCommandCompletion({
    projectPath,
    textareaRef
  });

  const toolSelector = useToolSelector({
    agent
  });

  const claudeVersionManager = useClaudeVersionManager({
    initialModel: 'claude-3-5-sonnet-20241022'
  });

  // 从hooks中解构需要的状态和方法
  const {
    commandSearch,
    selectedCommand,
    selectedCommandIndex,
    commandWarning,
    showCommandSelector,
    showFileBrowser,
    atSymbolPosition,
    allCommands,
    SYSTEM_COMMANDS,
    userCommands,
    projectCommands,
    userCommandsError,
    projectCommandsError,
    setSelectedCommand,
    setSelectedCommandIndex,
    setCommandWarning,
    setShowCommandSelector,
    setShowFileBrowser,
    setAtSymbolPosition,
    // handleInputChange,
    handleCommandSelect,
    isCommandDefined,
    getAllAvailableCommands
  } = commandCompletion;

  const {
    selectedModel,
    selectedClaudeVersion,
    isVersionLocked,
    claudeVersionsData,
    availableModels,
    setSelectedModel,
    setSelectedClaudeVersion,
    setIsVersionLocked
  } = claudeVersionManager;

  const {
    showToolSelector,
    selectedRegularTools,
    selectedMcpTools,
    mcpToolsEnabled,
    permissionMode,
    showPermissionDropdown,
    showModelDropdown,
    showVersionDropdown,
    setShowToolSelector,
    setSelectedRegularTools,
    setSelectedMcpTools,
    setMcpToolsEnabled,
    setPermissionMode,
    setShowPermissionDropdown,
    setShowModelDropdown,
    setShowVersionDropdown
  } = toolSelector;

  const {
    isUserScrolling,
    newMessagesCount,
    scrollToBottom,
    setNewMessagesCount,
    setIsUserScrolling
  } = scrollManagement;

  
  // Get current backend service name
  const [currentServiceName, setCurrentServiceName] = useState<string>('默认服务');
  useEffect(() => {
    const backendServices = loadBackendServices();
    const currentService = getCurrentService(backendServices);
    if (currentService) {
      setCurrentServiceName(currentService.name);
    }
  }, []);
  

  const queryClient = useQueryClient();
  const interruptSessionMutation = useInterruptSession();
  const { data: sessionsData } = useAgentSessions(agent.id, searchTerm, projectPath);
  const { data: sessionMessagesData } = useAgentSessionMessages(agent.id, currentSessionId, projectPath);
  const { data: activeSessionsData } = useSessions();
  
  // 会话心跳 - 基于 AI 响应成功状态
  useSessionHeartbeatOnSuccess({
    agentId: agent.id,
    sessionId: currentSessionId,
    projectPath,
    enabled: !!currentSessionId,
    isNewSession,
    hasSuccessfulResponse
  });

  // TabManager 智能监听和标签页管理
  useEffect(() => {
    // 启动智能监听
    const cleanup = tabManager.startSmartMonitoring();
    
    return cleanup;
  }, []); // 只在组件挂载时启动一次

  // 设置唤起监听器（当会话ID变化时）
  useEffect(() => {
    if (currentSessionId && agent.id) {
      console.log(`🎯 Setting up wakeup listener for session: ${currentSessionId}`);
      const cleanup = tabManager.setupWakeupListener(agent.id, currentSessionId);
      return cleanup;
    }
  }, [currentSessionId, agent.id]);
  

    


  // Check if commands failed to load (likely authentication issue)
  const hasCommandsLoadError = userCommandsError || projectCommandsError;

  // Reset selected index when commands change
  useEffect(() => {
    setSelectedCommandIndex(prev => {
      // Only update if index is out of bounds
      if (allCommands.length > 0 && prev >= allCommands.length) {
        return 0;
      }
      return prev;
    });
  }, [allCommands.length]);




  const handleSwitchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowSessions(false);
    // Set loading state for message loading
    setIsLoadingMessages(true);
    // Reset heartbeat states for resumed session
    setIsNewSession(false);
    setHasSuccessfulResponse(false); // 恢复会话时重置，等待检查存在性
    // Update URL with new session ID
    if (onSessionChange) {
      onSessionChange(sessionId);
    }
    // Clear messages first, then invalidate to trigger fresh load
    clearMessages();
    queryClient.invalidateQueries({ queryKey: ['agent-session-messages', agent.id, sessionId] });
  };

  const handleNewSession = () => {
    // Clear current session and messages
    setCurrentSessionId(null);
    clearMessages();
    setShowSessions(false);
    // Reset heartbeat states
    setIsNewSession(true);
    setHasSuccessfulResponse(false);
    // Update URL to remove session ID
    if (onSessionChange) {
      onSessionChange(null);
    }
    // Clear search term
    setSearchTerm('');
    // Focus on textarea after state updates
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleRefreshMessages = () => {
    if (currentSessionId) {
      // Set loading state
      setIsLoadingMessages(true);
      // Clear messages first, then invalidate to trigger fresh load
      clearMessages();
      queryClient.invalidateQueries({ queryKey: ['agent-session-messages', agent.id, currentSessionId] });
    }
  };

  const handleStopGeneration = async () => {
    if (!abortControllerRef.current || !currentSessionId) {
      return;
    }

    try {
      // 设置停止中状态
      setIsStopping(true);
      console.log('🛑 Stopping generation for session:', currentSessionId);

      // 先调用后端 interrupt API
      try {
        await interruptSessionMutation.mutateAsync(currentSessionId);
        console.log('✅ Successfully interrupted session via API');
      } catch (interruptError) {
        console.error('❌ Failed to interrupt session:', interruptError);
        // interrupt 失败，显示错误消息
        const errorMessage = interruptError instanceof Error ? interruptError.message : 'Unknown error';
        addMessage({
          content: `${t('agentChat.stopFailed')}\n\n${errorMessage}`,
          role: 'assistant'
        });
        setIsStopping(false);
        return; // 不继续执行 abort，按照用户要求不强制断开
      }

      // 中断所有正在执行的工具
      interruptAllExecutingTools();

      // interrupt 成功后，断开 SSE 连接
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setAiTyping(false);
      setIsStopping(false);
      setIsInitializingSession(false);

      // Add a message indicating the generation was stopped
      addMessage({
        content: t('agentChat.generationStopped'),
        role: 'assistant'
      });
    } catch (error) {
      console.error('Error stopping generation:', error);
      setIsStopping(false);
      setIsInitializingSession(false);
    }
  };

  // Use message sender hook (must be after handleNewSession is defined)
  const { isSendDisabled, handleSendMessage } = useMessageSender({
    agent,
    projectPath,
    inputMessage,
    selectedImages,
    isAiTyping,
    currentSessionId,
    hasCommandsLoadError: !!hasCommandsLoadError,
    userCommandsError: userCommandsError || undefined,
    projectCommandsError: projectCommandsError || undefined,
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
  });

  // 为 AgentCommandSelector 创建键盘处理器
  const agentCommandSelectorKeyHandler = createAgentCommandSelectorKeyHandler({
    showCommandSelector,
    showFileBrowser,
    commandSearch,
    selectedCommand,
    selectedCommandIndex,
    atSymbolPosition,
    projectPath,
    textareaRef,
    inputMessage,
    allCommands,
    onCommandSelect: handleCommandSelect,
    onSetInputMessage: setInputMessage,
    onSetShowCommandSelector: setShowCommandSelector,
    onSetSelectedCommandIndex: setSelectedCommandIndex,
    onSetShowFileBrowser: setShowFileBrowser,
    onSetAtSymbolPosition: setAtSymbolPosition,
    onHandleKeyDown: (e: React.KeyboardEvent) => {
      // 处理非命令选择器相关的键盘事件
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        // Check for undefined command and show warning
        if (isCommandTrigger(inputMessage)) {
          const commandName = inputMessage.slice(1).split(' ')[0].toLowerCase();
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
        }

        handleSendMessage();
        return;
      }
    }
  });

  // const handleKeyPress = useCallback((_e: React.KeyboardEvent) => {
  //   // Enter key is now fully handled in handleKeyDown
  //   // This function is kept for potential future use
  // }, []);
  
  
  
  const handleConfirmDialog = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmDialog(false);
    setConfirmMessage('');
    setConfirmAction(null);
  };
  
  const handleCancelDialog = () => {
    setShowConfirmDialog(false);
    setConfirmMessage('');
    setConfirmAction(null);
  };
  

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  // Load session messages when session changes or messages are available
  useEffect(() => {
    console.log('🔍 Session messages effect triggered:', {
      sessionMessagesData: sessionMessagesData?.messages?.length || 0,
      currentSessionId,
      hasSessionMessagesData: !!sessionMessagesData,
      messagesLength: sessionMessagesData?.messages?.length,
      isLoadingMessages
    });

    if (sessionMessagesData?.messages && currentSessionId) {
      console.log('✅ Loading session messages:', sessionMessagesData.messages.length);
      loadSessionMessages(sessionMessagesData.messages);

      // If we were loading messages (from refresh), clear loading state after render
      if (isLoadingMessages) {
        // Wait for next tick to ensure messages are rendered
        setTimeout(() => {
          setIsLoadingMessages(false);
        }, 100);
      }
    } else if (currentSessionId && sessionMessagesData && sessionMessagesData.messages?.length === 0) {
      console.log('🗑️ Loading empty session messages');
      // Handle empty session - clear messages
      loadSessionMessages([]);

      // If we were loading messages (from refresh), clear loading state
      if (isLoadingMessages) {
        setTimeout(() => {
          setIsLoadingMessages(false);
        }, 100);
      }
    }
  }, [sessionMessagesData, currentSessionId, loadSessionMessages, isLoadingMessages, t]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowPermissionDropdown(false);
        setShowModelDropdown(false);
        setShowVersionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 检查当前会话是否在活跃会话中，如果是则切换至对应版本并锁定
  useEffect(() => {
    if (!currentSessionId || !activeSessionsData?.sessions) {
      setIsVersionLocked(false);
      return;
    }

    // 查找当前会话是否在活跃会话列表中
    const activeSession = activeSessionsData.sessions.find(s => s.sessionId === currentSessionId);

    if (activeSession) {
      console.log(`🔒 Found active session: ${currentSessionId}, version: ${activeSession.claudeVersionId}`);

      // 如果会话有指定的版本，切换到该版本并锁定
      if (activeSession.claudeVersionId) {
        setSelectedClaudeVersion(activeSession.claudeVersionId);
        setIsVersionLocked(true);
        console.log(`🔒 Locked to Claude version: ${activeSession.claudeVersionId}`);
      } else {
        // 会话没有指定版本，清除选择状态以显示默认版本
        setSelectedClaudeVersion(undefined);
        setIsVersionLocked(false);
        console.log(`🔓 Session has no specific version, unlocked`);
      }
    } else {
      // 会话不在活跃列表中，清除选择状态以显示默认版本
      setSelectedClaudeVersion(undefined);
      setIsVersionLocked(false);
      console.log(`🔓 Session ${currentSessionId} not in active sessions, unlocked`);
    }
  }, [currentSessionId, activeSessionsData]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header - Fixed */}
      <div
        className="flex-shrink-0 h-12 px-4 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center"
      >
        <div className="flex items-center justify-between w-full">
          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold flex items-center space-x-2 text-gray-900 dark:text-white">
              <span className="text-lg flex-shrink-0">{agent.ui.icon}</span>
              <span className="truncate">[{currentServiceName}]</span>
              {projectPath && (
                <span className="text-sm opacity-75 font-normal truncate flex-shrink-0" title={projectPath}>
                  {projectPath.split('/').pop() || projectPath}
                </span>
              )}
              {currentSessionId && (
                <>
                  <span className="text-sm opacity-75">-</span>
                  <span className="text-sm opacity-75 truncate">
                    {sessionsData?.sessions?.find((s: any) => s.id === currentSessionId)?.title || t('agentChat.currentSession')}
                  </span>
                </>
              )}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-1 flex-shrink-0 ml-2">
            <button
              onClick={handleNewSession}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300"
              title={t('agentChat.newSession')}
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300"
                title={t('agentChat.sessionHistory')}
              >
                <Clock className="w-4 h-4" />
              </button>

              {/* Sessions Dropdown */}
              <SessionsDropdown
                isOpen={showSessions}
                onToggle={() => setShowSessions(!showSessions)}
                sessions={sessionsData?.sessions || []}
                currentSessionId={currentSessionId}
                onSwitchSession={handleSwitchSession}
                isLoading={false}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>
            <button
              onClick={handleRefreshMessages}
              disabled={!currentSessionId || isLoadingMessages}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('agentChat.refreshMessages')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 - 聊天视图 - Scrollable */}
      <div ref={messagesContainerRef} className="flex-1 px-5 py-5 overflow-y-auto space-y-4 min-h-0 relative">
        {/* Welcome message */}
        <div className="px-4">
          <div className="text-sm leading-relaxed break-words overflow-hidden text-gray-600 dark:text-gray-400">
            {agent.ui.welcomeMessage || agent.description}
          </div>
        </div>

        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('agentChat.loadingMessages')}
            </div>
          </div>
        ) : (
          <ChatMessageList
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            isInitializingSession={isInitializingSession}
            isAiTyping={isAiTyping}
            isStopping={isStopping}
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
            isUserScrolling={isUserScrolling}
            newMessagesCount={newMessagesCount}
            onScrollToBottom={scrollToBottom}
          />
        )}

        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {isUserScrolling && newMessagesCount > 0 && (
          <button
            onClick={() => {
              scrollToBottom();
              setIsUserScrolling(false);
              setNewMessagesCount(0);
            }}
            className="fixed bottom-24 right-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-2 shadow-lg flex items-center space-x-2 transition-all duration-200 z-10"
          >
            <ChevronDown className="w-4 h-4" />
            <span className="text-sm font-medium">
              {newMessagesCount} {t('agentChat.newMessages')}
            </span>
          </button>
        )}
      </div>

      {/* Unified Input Area */}
      <AgentInputArea
        // Basic state
        inputMessage={inputMessage}
        selectedImages={selectedImages}
        isAiTyping={isAiTyping}
        isStopping={isStopping}
        isMobile={isMobile}
        
        // Tool state
        showToolSelector={showToolSelector}
        selectedRegularTools={selectedRegularTools}
        selectedMcpTools={selectedMcpTools}
        mcpToolsEnabled={mcpToolsEnabled}
        
        // Command state
        showCommandSelector={showCommandSelector}
        showFileBrowser={showFileBrowser}
        commandSearch={commandSearch}
        selectedCommand={selectedCommand}
        selectedCommandIndex={selectedCommandIndex}
        atSymbolPosition={atSymbolPosition}
        commandWarning={commandWarning || ''}
        
        // Settings state
        permissionMode={permissionMode}
        selectedModel={selectedModel}
        selectedClaudeVersion={selectedClaudeVersion || ''}
        showPermissionDropdown={showPermissionDropdown}
        showModelDropdown={showModelDropdown}
        showVersionDropdown={showVersionDropdown}
        showMobileSettings={showMobileSettings}
        isCompactMode={isCompactMode}
        isVersionLocked={isVersionLocked}
        
        // UI state
        isDragOver={isDragOver}
        previewImage={previewImage}
        showConfirmDialog={showConfirmDialog}
        confirmMessage={confirmMessage || ''}
        showMcpStatusModal={showMcpStatusModal}
        
        // Data
        availableModels={availableModels}
        claudeVersionsData={claudeVersionsData}
        agent={agent}
        projectPath={projectPath}
        mcpStatus={mcpStatus}
        
        // Refs
        textareaRef={textareaRef}
        fileInputRef={fileInputRef}
        
        // Event handlers
        onSend={handleSendMessage}
        handleKeyDown={agentCommandSelectorKeyHandler}
        handleImageSelect={handleImageSelect}
        handleImageRemove={handleImageRemove}
        handleImagePreview={handleImagePreview}
        handlePaste={handlePaste}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDrop={handleDrop}
        handleStopGeneration={handleStopGeneration}
        
        // Setters
        onSetInputMessage={setInputMessage}
        onSetShowToolSelector={setShowToolSelector}
        onSetSelectedRegularTools={setSelectedRegularTools}
        onSetSelectedMcpTools={setSelectedMcpTools}
        onSetMcpToolsEnabled={setMcpToolsEnabled}
        onSetPermissionMode={setPermissionMode}
        onSetSelectedModel={setSelectedModel}
        onSetSelectedClaudeVersion={setSelectedClaudeVersion}
        onSetShowPermissionDropdown={setShowPermissionDropdown}
        onSetShowModelDropdown={setShowModelDropdown}
        onSetShowVersionDropdown={setShowVersionDropdown}
        onSetShowMobileSettings={setShowMobileSettings}
        onSetPreviewImage={setPreviewImage}
        onSetShowConfirmDialog={setShowConfirmDialog}
        onSetShowMcpStatusModal={setShowMcpStatusModal}
        
        // Command handlers
        onCommandSelect={handleCommandSelect}
        onSetShowCommandSelector={setShowCommandSelector}
        onSetSelectedCommandIndex={setSelectedCommandIndex}
        onSetShowFileBrowser={setShowFileBrowser}
        onSetAtSymbolPosition={setAtSymbolPosition}
        onSetCommandWarning={setCommandWarning}
        
        // Confirm dialog handlers
        handleConfirmDialog={handleConfirmDialog}
        handleCancelDialog={handleCancelDialog}
        
        // Utility functions
        isSendDisabled={isSendDisabled}
      />
    </div>
  );
};
