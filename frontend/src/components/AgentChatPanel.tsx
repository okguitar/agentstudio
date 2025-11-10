import React, { useState, useRef, useEffect } from 'react';
import { Clock, Plus, RefreshCw, ChevronDown } from 'lucide-react';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgentChat, useAgentSessions, useAgentSessionMessages, useInterruptSession } from '../hooks/useAgents';
import { useSessionHeartbeatOnSuccess } from '../hooks/useSessionHeartbeatOnSuccess';
import { useSessions } from '../hooks/useSessions';
import { useResponsiveSettings } from '../hooks/useResponsiveSettings';
import { tabManager } from '../utils/tabManager';
import { useQueryClient } from '@tanstack/react-query';
import { SessionsDropdown } from './SessionsDropdown';
import type { AgentConfig } from '../types/index.js';
import {
  isCommandTrigger,
  formatCommandMessage
} from '../utils/commandFormatter';
import { createCommandHandler } from '../utils/commandHandler';
import { eventBus, EVENTS } from '../utils/eventBus';
import { useTranslation } from 'react-i18next';
import { showInfo } from '../utils/toast';
import { loadBackendServices, getCurrentService } from '../utils/backendServiceStorage';
import { useMobileContext } from '../contexts/MobileContext';
import { 
  useImageUpload,
  useScrollManagement,
  useCommandCompletion,
  useToolSelector,
  useClaudeVersionManager
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
    addTextPartToMessage,
    addThinkingPartToMessage,
    // addCompactSummaryPartToMessage,
    addCommandPartToMessage,
    addToolPartToMessage,
    updateToolPartInMessage,
    interruptAllExecutingTools,
    setAiTyping,
    setCurrentSessionId,
    clearMessages,
    loadSessionMessages,
    updateMcpStatus,
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
  const agentChatMutation = useAgentChat();
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

  // Helper function to check if send should be disabled
  const isSendDisabled = () => {
    if (isAiTyping) return true;
    if (!inputMessage.trim() && selectedImages.length === 0) return true;
    
    // Check for undefined command
    if (isCommandTrigger(inputMessage)) {
      const commandName = inputMessage.slice(1).split(' ')[0].toLowerCase();
      return !isCommandDefined(commandName);
    }
    
    return false;
  };



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




  // 包装函数以处理事件类型
  // const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   handleInputChange(e.target.value);
  // }, [handleInputChange]);

  // 适配器函数处理 FileBrowser 的回调
  // Image handling functions


  const handleSendMessage = async () => {
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

    try {
      // Add initial AI message placeholder
      let aiMessageId: string | null = null;

      // Track if this is a compact command for special handling in SSE stream
      const isCompactCommand = userMessage.trim() === '/compact';

      // console.log('Sending agent chat request:', { agentId: agent.id, message: userMessage, context, sessionId: currentSessionId, projectPath });

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
        onMessage: (data) => {
          console.log('Received SSE message:', data);
          const eventData = data as { 
            type: string; 
            sessionId?: string; 
            session_id?: string;
            subtype?: string; 
            message?: { content: unknown[] } | string; 
            permission_denials?: Array<{ tool_name: string; tool_input: Record<string, unknown> }>; 
            error?: string;
          };
          
          // Handle direct error messages from Claude Code SDK
          if (eventData.type === 'error') {
            console.error('Claude Code SDK error:', eventData);
            setAiTyping(false);
            setIsInitializingSession(false);
            abortControllerRef.current = null;
            
            let errorMessage = `${t('agentChat.errorMessages.claudeCodeSDKError')}\n\n`;
            
            if (eventData.error === 'Claude Code SDK failed' && eventData.message && typeof eventData.message === 'string') {
              if (eventData.message.includes('not valid JSON')) {
                errorMessage += t('agentChatPanel.errors.jsonParseError');
              } else if (eventData.message.includes('timeout')) {
                errorMessage += t('agentChatPanel.errors.timeoutError');
              } else {
                errorMessage += `${eventData.message}\n\n**${t('agentChatPanel.errors.suggestedActions')}**\n- ${t('agentChatPanel.errors.resendMessage')}\n- ${t('agentChatPanel.errors.refreshPage')}`;
              }
            } else {
              errorMessage += `${eventData.error || t('agentChatPanel.errors.unknownError')}\n\n**${t('agentChatPanel.errors.suggestedActions')}**\n- ${t('agentChatPanel.errors.resendMessage')}\n- ${t('agentChatPanel.errors.refreshPage')}`;
            }
            
            // Add error message
            if (!aiMessageId) {
              addMessage({
                content: errorMessage,
                role: 'assistant'
              });
            } else {
              addTextPartToMessage(aiMessageId, '\n\n' + errorMessage);
            }
            return;
          }
          
          if (eventData.type === 'system' && eventData.subtype === 'init' && (eventData.sessionId || eventData.session_id)) {
            const newSessionId = eventData.sessionId || eventData.session_id;
            console.log('Setting session ID from AI response:', newSessionId);

            // 会话初始化完成，关闭初始化提示
            setIsInitializingSession(false);

            // Only set session ID if we don't have one (new session created by AI)
            if (!currentSessionId && newSessionId) {
              setCurrentSessionId(newSessionId);
              // This is a new session being created
              setIsNewSession(true);
              // Update URL with new session ID
              if (onSessionChange) {
                onSessionChange(newSessionId);
              }
              // Refresh sessions list when new session is created
              queryClient.invalidateQueries({ queryKey: ['agent-sessions', agent.id] });
            }
          } 
          // 🔧 处理 MCP 状态事件
          else if (eventData.type === 'mcp_status') {
            console.log('📡 MCP Status Event:', eventData);
            
            if (eventData.subtype === 'connection_failed') {
              const failedServers = (eventData as any).failedServers || [];
              console.warn('🚨 MCP服务器连接失败:', failedServers);
              
              // 更新 MCP 状态到 store
              updateMcpStatus({
                hasError: true,
                connectionErrors: failedServers,
                lastError: `连接失败: ${failedServers.map((s: any) => s.name).join(', ')}`
              });
            } else if (eventData.subtype === 'connection_success') {
              const connectedServers = (eventData as any).connectedServers || [];
              console.log('✅ MCP服务器连接成功:', connectedServers.map((s: any) => s.name));
              
              // 更新 MCP 状态到 store
              updateMcpStatus({
                hasError: false,
                connectedServers: connectedServers,
                connectionErrors: [],
                lastError: null
              });
            }
          }
          // 🚨 处理 MCP 执行错误事件
          else if (eventData.type === 'mcp_error') {
            console.log('❌ MCP Error Event:', eventData);
            
            if (eventData.subtype === 'execution_failed') {
              const errorData = eventData as any;
              const toolName = errorData.tool || '未知工具';
              const errorMessage = errorData.error || '执行失败';
              const details = errorData.details || '';
              
              console.error('❌ MCP工具执行失败:', { tool: toolName, error: errorMessage, details });
              
              // 更新 MCP 状态到 store
              updateMcpStatus({
                hasError: true,
                lastError: `工具执行失败: ${toolName} - ${errorMessage}`,
                lastErrorDetails: details
              });
            }
          }
          else if (eventData.type === 'session_resumed' && eventData.subtype === 'new_branch') {
            // Handle session resume notification from backend
            const resumeData = eventData as any as {
              originalSessionId: string;
              newSessionId: string;
              message: string;
              sessionId: string;
            };

            console.log('🔄 Session resumed with new branch:', resumeData);
            console.log('🔄 Updating session ID from', currentSessionId, 'to', resumeData.newSessionId);

            // 会话恢复完成，关闭初始化提示
            setIsInitializingSession(false);

            // Update session ID to the new one (this will trigger useAgentSessionMessages to reload history)
            setCurrentSessionId(resumeData.newSessionId);
            // This is a resumed session creating a new branch
            setIsNewSession(true); // 恢复会话创建新分支，视为新会话
            
            // Update URL with new session ID
            if (onSessionChange) {
              console.log('🔄 Updating URL with new session ID:', resumeData.newSessionId);
              onSessionChange(resumeData.newSessionId);
            }
            
            // Show session resume notification
            addMessage({
              content: `${t('agentChat.sessionResumed')}\n\n${resumeData.message}\n\n${t('agentChat.sessionIdUpdated')}`,
              role: 'assistant'
            });
            
            // Refresh sessions list to include the new session
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', agent.id] });

            // 🆕 TabManager 会话恢复处理
            if (currentSessionId && resumeData.originalSessionId && resumeData.newSessionId) {
              // 立即更新TabManager状态
              tabManager.handleSessionResume(
                agent.id,
                resumeData.originalSessionId,
                resumeData.newSessionId
              );
              
              // 记录恢复事件以供智能监听使用
              tabManager.recordSessionResume(
                agent.id,
                resumeData.originalSessionId,
                resumeData.newSessionId
              );
              
              console.log(`🎯 TabManager updated for session resume: ${resumeData.originalSessionId} → ${resumeData.newSessionId}`);
            }
            
            console.log('✅ Session resume handling complete');
          }
          else if (eventData.type === 'system' && eventData.subtype === 'init') {
            // Claude Code SDK initialization - silently initialize without showing message
            // Just ensure we have an AI message ID ready for when content starts coming
          }
          else if (eventData.type === 'assistant') {
            // Add AI message placeholder if not added yet
            if (!aiMessageId) {
              const message = {
                content: '',
                role: 'assistant' as const
              };
              addMessage(message);
              // Get the ID of the message we just added
              const state = useAgentStore.getState();
              aiMessageId = state.messages[state.messages.length - 1].id;
              console.log('📝 Created new AI message with ID:', aiMessageId);
            }

            // Handle tool use and text content
            if (eventData.message && typeof eventData.message === 'object' && 'content' in eventData.message && eventData.message.content && aiMessageId) {
              console.log('📝 Processing assistant message content blocks:', eventData.message.content.length, 'aiMessageId:', aiMessageId);
              for (const block of eventData.message.content as Array<{ type: string; text?: string; thinking?: string; name?: string; input?: unknown; id?: string }>) {
                console.log('📝 Processing block:', { type: block.type, hasText: !!block.text, hasThinking: !!block.thinking, textLength: block.text?.length, thinkingLength: block.thinking?.length, toolName: block.name });
                if (block.type === 'text') {
                  // Add text as a separate part
                  if (block.text) {
                    console.log('📝 Adding text part:', block.text.substring(0, 100) + (block.text.length > 100 ? '...' : ''));
                    // Check if this is a response to /compact command
                    if (isCompactCommand) {
                      console.log('📦 Detected /compact command response, adding as compactSummary');
                      // addCompactSummaryPartToMessage(aiMessageId, block.text);
                      addTextPartToMessage(aiMessageId, block.text);
                    } else {
                      addTextPartToMessage(aiMessageId, block.text);
                    }
                  } else {
                    console.warn('📝 Text block has no text content');
                  }
                } else if (block.type === 'thinking') {
                  // Add thinking as a separate part
                  if (block.thinking) {
                    console.log('🤔 Adding thinking part:', block.thinking.substring(0, 100) + (block.thinking.length > 100 ? '...' : ''));
                    addThinkingPartToMessage(aiMessageId, block.thinking);
                  } else {
                    console.warn('🤔 Thinking block has no thinking content');
                  }
                } else if (block.type === 'tool_use') {
                  // Add tool usage as a separate part
                  if (block.name) {
                    console.log('📝 Adding tool part:', block.name, 'id:', block.id);
                    // Special logging for BashOutput
                    if (block.name === 'BashOutput') {
                      console.log('🐚 [BashOutput] Tool use detected, claudeId:', block.id, 'input:', block.input);
                    }
                    const toolData = {
                      toolName: block.name,
                      toolInput: (block.input as Record<string, unknown>) || {},
                      isExecuting: true,
                      claudeId: block.id // Store Claude's tool use ID for matching with results
                    };
                    addToolPartToMessage(aiMessageId, toolData);
                  }
                } else {
                  console.log('📝 Unknown block type:', block.type);
                }
              }
            } else {
              console.warn('📝 No content or aiMessageId for assistant message:', { 
                hasMessage: !!eventData.message, 
                hasContent: !!(eventData.message as any)?.content,
                aiMessageId 
              });
            }
          }
          else if (eventData.type === 'user') {
            // Tool results
            if (eventData.message && typeof eventData.message === 'object' && 'content' in eventData.message && eventData.message.content && aiMessageId) {
              for (const block of eventData.message.content as Array<{ type: string; content?: unknown; is_error?: boolean; tool_use_id?: string }>) {
                if (block.type === 'tool_result' && block.tool_use_id) {
                  console.log('🔧 Processing tool_result for tool_use_id:', block.tool_use_id, 'content:', block.content);
                  // Find the tool by tool_use_id - search across ALL messages, not just current
                  const state = useAgentStore.getState();
                  let targetTool: any = null;
                  let targetMessageId: string | null = null;

                  // Search through all messages to find the tool with matching claudeId
                  for (const message of state.messages) {
                    if (message.messageParts) {
                      const foundTool = message.messageParts.find((part: any) =>
                        part.type === 'tool' && part.toolData?.claudeId === block.tool_use_id
                      );
                      if (foundTool) {
                        targetTool = foundTool;
                        targetMessageId = message.id;
                        break;
                      }
                    }
                  }
                  
                  console.log('🔧 Found target tool:', { 
                    toolData: targetTool?.toolData, 
                    messageId: targetMessageId,
                    currentMessageId: aiMessageId 
                  });
                  
                  if (targetTool?.toolData && targetMessageId) {
                    // Update the corresponding tool with results
                    const toolResult = typeof block.content === 'string'
                      ? block.content
                      : Array.isArray(block.content)
                        ? block.content.map((c: { text?: string }) => c.text || String(c)).join('')
                        : JSON.stringify(block.content);

                    console.log('🔧 Updating tool with result, setting isExecuting: false');
                    // Special logging for BashOutput
                    if (targetTool.toolData.toolName === 'BashOutput') {
                      console.log('🐚 [BashOutput] Updating tool result:', {
                        toolId: targetTool.toolData.id,
                        messageId: targetMessageId,
                        toolResult: toolResult?.substring(0, 200),
                        rawContent: block.content
                      });
                    }
                    updateToolPartInMessage(targetMessageId, targetTool.toolData.id, {
                      toolResult,
                      isError: block.is_error || false,
                      isExecuting: false
                    });
                  } else {
                    console.warn('🔧 No target tool found for tool_use_id:', block.tool_use_id);
                    // Log all available tools for debugging
                    const allTools = state.messages.flatMap(m => 
                      (m.messageParts || [])
                        .filter((p: any) => p.type === 'tool')
                        .map((p: any) => ({ 
                          claudeId: p.toolData?.claudeId, 
                          toolName: p.toolData?.toolName,
                          isExecuting: p.toolData?.isExecuting 
                        }))
                    );
                    console.warn('🔧 Available tools:', allTools);
                  }
                }
              }
            }
          }

          // Also check for tool results in assistant messages (alternative path)
          if (eventData.type === 'assistant' && eventData.message && typeof eventData.message === 'object' && 'content' in eventData.message && eventData.message.content && aiMessageId) {
            for (const block of eventData.message.content as Array<{ type: string; content?: unknown; is_error?: boolean; tool_use_id?: string }>) {
              if (block.type === 'tool_result' && block.tool_use_id) {
                console.log('🔧 Processing tool_result in assistant message for tool_use_id:', block.tool_use_id);
                // Find the tool by tool_use_id - search across ALL messages, not just current
                const state = useAgentStore.getState();
                let targetTool: any = null;
                let targetMessageId: string | null = null;
                
                // Search through all messages to find the tool with matching claudeId
                for (const message of state.messages) {
                  if (message.messageParts) {
                    const foundTool = message.messageParts.find((part: any) =>
                      part.type === 'tool' && part.toolData?.claudeId === block.tool_use_id
                    );
                    if (foundTool) {
                      targetTool = foundTool;
                      targetMessageId = message.id;
                      break;
                    }
                  }
                }
                
                console.log('🔧 Found target tool in assistant message:', { 
                  toolData: targetTool?.toolData, 
                  messageId: targetMessageId,
                  currentMessageId: aiMessageId 
                });
                
                if (targetTool?.toolData && targetMessageId) {
                  // Update the corresponding tool with results
                  const toolResult = typeof block.content === 'string' 
                    ? block.content 
                    : Array.isArray(block.content)
                      ? block.content.map((c: { text?: string }) => c.text || String(c)).join('')
                      : JSON.stringify(block.content);
                  
                  console.log('🔧 Updating tool with result in assistant message, setting isExecuting: false');
                  updateToolPartInMessage(targetMessageId, targetTool.toolData.id, {
                    toolResult,
                    isError: block.is_error || false,
                    isExecuting: false
                  });
                } else {
                  console.warn('🔧 No target tool found for tool_use_id in assistant message:', block.tool_use_id);
                }
              }
            }
          }
          else if (eventData.type === 'result') {
            console.log('Received result event:', { subtype: eventData.subtype, isSideChain: (eventData as any).isSideChain });

            // 只有主任务结束才停止 AI 输入状态（检查 isSideChain）
            const isSideChain = (eventData as any).isSideChain;
            if (!isSideChain) {
              console.log('Main task result received, stopping AI typing...');
              // Clear the abort controller and immediately stop typing
              abortControllerRef.current = null;
              setAiTyping(false);

              // Mark as successful response if result is successful
              if (eventData.subtype === 'success') {
                setHasSuccessfulResponse(true);
                console.log('✅ Marked session as having successful response for heartbeat');

                // 发送AI回复完成事件，通知其他组件刷新
                eventBus.emit(EVENTS.AI_RESPONSE_COMPLETE, {
                  agentId: agent.id,
                  sessionId: currentSessionId,
                  projectPath
                });
                console.log('📡 Emitted AI_RESPONSE_COMPLETE event');
              }
            } else {
              console.log('Side chain result received, continuing main task...');
            }
            
            // 只有主任务结束才处理最终消息（非 side chain）
            if (!isSideChain) {
              // If no AI message was created yet (e.g., only result event received), create one now
              if (!aiMessageId && eventData.subtype === 'success') {
                console.log('📝 Creating AI message from result event - no assistant messages received');
                const resultContent = (eventData as any).result;
                if (resultContent && typeof resultContent === 'string') {
                  const message = {
                    content: '',
                    role: 'assistant' as const
                  };
                  addMessage(message);
                  // Get the ID of the message we just added
                  const state = useAgentStore.getState();
                  aiMessageId = state.messages[state.messages.length - 1].id;

                  // Add the result content as text
                  if (aiMessageId) {
                    addTextPartToMessage(aiMessageId, resultContent);
                  }
                  console.log('📝 Added result content to new AI message:', resultContent.substring(0, 100));
                } else {
                  console.warn('📝 Result event with no content - creating empty success message');
                  const message = {
                    content: t('agentChat.taskComplete'),
                    role: 'assistant' as const
                  };
                  addMessage(message);
                  const state = useAgentStore.getState();
                  aiMessageId = state.messages[state.messages.length - 1].id;
                }
              }

              // Ensure all executing tools are marked as completed
              if (aiMessageId) {
                const state = useAgentStore.getState();
                const currentMessage = state.messages.find(m => m.id === aiMessageId);
                if (currentMessage?.messageParts) {
                  currentMessage.messageParts.forEach((part: any) => {
                    if (part.type === 'tool' && part.toolData?.isExecuting) {
                      console.log('Force completing tool:', part.toolData.toolName, 'claudeId:', part.toolData.claudeId);
                      updateToolPartInMessage(aiMessageId!, part.toolData.id, {
                        isExecuting: false,
                        toolResult: part.toolData.toolResult || t('agentChat.executionCompleted')
                      });
                    }
                  });
                }
              }

              // Handle different result types
              let finalMessage = '';
              if (eventData.subtype === 'success') {
                finalMessage = '';
              } else if (eventData.subtype === 'error_max_turns') {
                finalMessage = `\n\n${t('agentChat.maxTurnsReached')}`;
                if (eventData.permission_denials && eventData.permission_denials.length > 0) {
                  finalMessage += `\n\n${t('agentChat.permissionDenials')}`;
                  eventData.permission_denials.forEach((denial: { tool_name: string; tool_input: Record<string, unknown> }, index: number) => {
                    finalMessage += `\n${index + 1}. ${denial.tool_name}: \`${denial.tool_input.command || denial.tool_input.description || JSON.stringify(denial.tool_input)}\``;
                  });
                  finalMessage += `\n\n${t('agentChat.permissionNote')}`;
                }
              } else if (eventData.subtype === 'error_during_execution') {
                finalMessage = `\n\n${t('agentChat.executionError')}`;
              } else if (eventData.subtype === 'error') {
                // Generic error case
                finalMessage = `\n\n${t('agentChat.processingError')}`;
              } else {
                finalMessage = `\n\n${t('agentChat.processingComplete')}`;
              }

              // Update final message content
              if (aiMessageId && finalMessage) {
                addTextPartToMessage(aiMessageId, finalMessage);
              }

              // Refresh sessions list only if we had a session (don't refresh on new session creation)
              if (currentSessionId) {
                queryClient.invalidateQueries({ queryKey: ['agent-sessions', agent.id] });
              }
            }
          }
        },
        onError: (error) => {
          console.error('SSE error:', error);
          setAiTyping(false);
          setIsInitializingSession(false);
          abortControllerRef.current = null;
          
          // Check if error is due to user cancellation
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.log('Request was aborted by user');
            return;
          }
          
          // Determine specific error message
          let errorMessage = t('agentChat.genericError');
          
          if (error instanceof Error) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
              errorMessage = t('agentChatPanel.errors.networkError');
            } else if (error.message.includes('timeout')) {
              errorMessage = t('agentChatPanel.errors.requestTimeout');
            } else if (error.message.includes('rate limit') || error.message.includes('429')) {
              errorMessage = t('agentChatPanel.errors.rateLimit');
            } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
              errorMessage = t('agentChatPanel.errors.unauthorized');
            } else if (error.message.includes('forbidden') || error.message.includes('403')) {
              errorMessage = t('agentChatPanel.errors.forbidden');
            } else if (error.message.includes('500') || error.message.includes('internal server')) {
              errorMessage = t('agentChatPanel.errors.internalServerError');
            } else {
              errorMessage = `❌ **${t('agentChatPanel.errors.processingError')}**\n\n${error.message || t('agentChatPanel.errors.unknownErrorRetry')}`;
            }
          }
          
          // Add error message if no AI message was created yet
          if (!aiMessageId) {
            addMessage({
              content: errorMessage,
              role: 'assistant'
            });
          } else {
            // Update existing message with error
            addTextPartToMessage(aiMessageId, '\n\n' + errorMessage);
          }
        }
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
  };

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
