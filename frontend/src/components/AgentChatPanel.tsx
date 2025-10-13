import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Clock, Square, Image, Wrench, X, Plus, Zap, Cpu, ChevronDown, Terminal, RefreshCw } from 'lucide-react';
import { ImagePreview } from './ImagePreview';
import { CommandSelector } from './CommandSelector';
import { ConfirmDialog } from './ConfirmDialog';
import { SettingsDropdown } from './SettingsDropdown';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgentChat, useAgentSessions, useAgentSessionMessages, useInterruptSession } from '../hooks/useAgents';
import { useCommands, useProjectCommands } from '../hooks/useCommands';
import { useClaudeVersions } from '../hooks/useClaudeVersions';
import { useSessionHeartbeatOnSuccess } from '../hooks/useSessionHeartbeatOnSuccess';
import { useSessions } from '../hooks/useSessions';
import { useResponsiveSettings } from '../hooks/useResponsiveSettings';
import { tabManager } from '../utils/tabManager';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessageRenderer } from './ChatMessageRenderer';
import { SessionsDropdown } from './SessionsDropdown';
import { UnifiedToolSelector } from './UnifiedToolSelector';
import { MobileChatToolbar } from './MobileChatToolbar';
import { useMobileContext } from '../contexts/MobileContext';
import type { AgentConfig } from '../types/index.js';
import {
  isCommandTrigger,
  extractCommandSearch,
  formatCommandMessage,
  type CommandType
} from '../utils/commandFormatter';
import { createCommandHandler, SystemCommand } from '../utils/commandHandler';
import { eventBus, EVENTS } from '../utils/eventBus';
import { useTranslation } from 'react-i18next';
import { showInfo } from '../utils/toast';
import { loadBackendServices, getCurrentService } from '../utils/backendServiceStorage';

interface AgentChatPanelProps {
  agent: AgentConfig;
  projectPath?: string;
  onSessionChange?: (sessionId: string | null) => void;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ agent, projectPath, onSessionChange }) => {
  const { t } = useTranslation('components');
  const { isCompactMode } = useResponsiveSettings();
  const { isMobile } = useMobileContext();
  const [inputMessage, setInputMessage] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{ id: string; file: File; preview: string }>>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCommandSelector, setShowCommandSelector] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<CommandType | null>(null);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [selectedRegularTools, setSelectedRegularTools] = useState<string[]>([]);
  const [permissionMode, setPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions'>('acceptEdits');
  const [selectedModel, setSelectedModel] = useState<string>('sonnet');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedClaudeVersion, setSelectedClaudeVersion] = useState<string | undefined>(undefined);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [commandWarning, setCommandWarning] = useState<string | null>(null);
  const [hasSuccessfulResponse, setHasSuccessfulResponse] = useState(false);
  const [isNewSession, setIsNewSession] = useState(false);
  const [isVersionLocked, setIsVersionLocked] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isInitializingSession, setIsInitializingSession] = useState(false);
const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Get current backend service name
  const [currentServiceName, setCurrentServiceName] = useState<string>('默认服务');
  useEffect(() => {
    const backendServices = loadBackendServices();
    const currentService = getCurrentService(backendServices);
    if (currentService) {
      setCurrentServiceName(currentService.name);
    }
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const {
    messages,
    isAiTyping,
    currentSessionId,
    addMessage,
    addTextPartToMessage,
    addThinkingPartToMessage,
    // addCompactSummaryPartToMessage,
    addToolPartToMessage,
    updateToolPartInMessage,
    setAiTyping,
    setCurrentSessionId,
    clearMessages,
    loadSessionMessages,

  } = useAgentStore();
  
  const queryClient = useQueryClient();
  const agentChatMutation = useAgentChat();
  const interruptSessionMutation = useInterruptSession();
  const { data: sessionsData } = useAgentSessions(agent.id, searchTerm, projectPath);
  const { data: sessionMessagesData, isLoading: isQueryLoading } = useAgentSessionMessages(agent.id, currentSessionId, projectPath);
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
  
  // Fetch commands for keyboard navigation
  const { data: userCommands = [] } = useCommands({ scope: 'user', search: commandSearch });
  const { data: projectCommands = [] } = useProjectCommands({
    projectId: projectPath || '', // Pass projectPath directly as it will be detected as path
    search: commandSearch
  });
  
  // Claude版本数据
  const { data: claudeVersionsData } = useClaudeVersions();

  // 根据选择的版本获取可用模型
  const availableModels = useMemo(() => {
    if (!claudeVersionsData?.versions) return [];

    // 如果选择了版本，返回该版本的模型
    if (selectedClaudeVersion) {
      const version = claudeVersionsData.versions.find(v => v.id === selectedClaudeVersion);
      return version?.models || [];
    }

    // 如果没有选择版本，使用默认版本的模型
    const defaultVersion = claudeVersionsData.versions.find(
      v => v.id === claudeVersionsData.defaultVersionId
    ) || claudeVersionsData.versions[0];

    return defaultVersion?.models || [];
  }, [claudeVersionsData, selectedClaudeVersion]);

  // 当可用模型变化时，确保当前选择的模型仍然有效
  useEffect(() => {
    if (availableModels.length > 0) {
      const currentModelValid = availableModels.some(m => m.id === selectedModel);
      if (!currentModelValid) {
        // 当前选择的模型不在可用列表中，切换到第一个可用模型
        setSelectedModel(availableModels[0].id);
      }
    }
  }, [availableModels, selectedModel]);

  // System commands definition
  const SYSTEM_COMMANDS: SystemCommand[] = [
    {
      id: 'init',
      name: 'init',
      description: t('systemCommands.init.description'),
      content: '/init',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'clear',
      name: 'clear',
      description: t('systemCommands.clear.description'),
      content: '/clear',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'compact',
      name: 'compact',
      description: t('systemCommands.compact.description'),
      content: '/compact',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'agents',
      name: 'agents',
      description: t('systemCommands.agents.description'),
      content: '/agents',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'settings',
      name: 'settings',
      description: t('systemCommands.settings.description'),
      content: '/settings',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'help',
      name: 'help',
      description: t('systemCommands.help.description'),
      content: '/help',
      scope: 'system',
      isSystem: true
    },
  ];

  // Helper function to check if a command is defined
  const isCommandDefined = (commandName: string) => {
    const systemCommand = SYSTEM_COMMANDS.find(cmd => cmd.name === commandName);
    const projectCommand = projectCommands.find(cmd => cmd.name === commandName);
    const userCommand = userCommands.find(cmd => cmd.name === commandName);
    return !!(systemCommand || projectCommand || userCommand);
  };

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

  // Memoize allCommands to prevent unnecessary re-renders
  const allCommands = useMemo(() => {
    // Filter system commands based on search term
    const filteredSystemCommands = SYSTEM_COMMANDS.filter(cmd =>
      cmd.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
      cmd.description.toLowerCase().includes(commandSearch.toLowerCase())
    );

    // Combine all commands
    return [
      ...filteredSystemCommands,
      ...projectCommands,
      ...userCommands,
    ];
  }, [userCommands, projectCommands, commandSearch]);

  // Memoize rendered messages to prevent unnecessary re-renders
  const renderedMessages = useMemo(() => {
    return messages.map((message) => (
      <div
        key={message.id}
        className="px-4"
      >
        <div
          className={`text-sm leading-relaxed break-words overflow-hidden ${
            message.role === 'user'
              ? 'text-white p-3 rounded-lg'
              : 'text-gray-800 dark:text-gray-200'
          }`}
          style={message.role === 'user' ? { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } : {}}
        >
          <ChatMessageRenderer message={message as any} />
        </div>
      </div>
    ));
  }, [messages]);

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

  // Initialize tool selector with agent's preset tools
  useEffect(() => {
    if (agent?.allowedTools?.length > 0) {
      const enabledTools = agent.allowedTools.filter(tool => tool.enabled);
      
      // Separate regular tools and MCP tools
      const regularTools: string[] = [];
      const mcpTools: string[] = [];
      
      enabledTools.forEach(tool => {
        if (tool.name.includes('.') && !tool.name.startsWith('mcp__')) {
          // MCP tool format: serverName.toolName -> mcp__serverName__toolName
          const [serverName, toolName] = tool.name.split('.');
          const mcpToolId = `mcp__${serverName}__${toolName}`;
          mcpTools.push(mcpToolId);
        } else if (!tool.name.startsWith('mcp__')) {
          // Regular tool
          regularTools.push(tool.name);
        } else {
          // Already in mcp__ format
          mcpTools.push(tool.name);
        }
      });
      
      // Initialize selected tools with agent's preset tools
      setSelectedRegularTools(prev => {
        const newTools = [...new Set([...prev, ...regularTools])];
        return newTools;
      });
      
      if (mcpTools.length > 0) {
        setMcpToolsEnabled(true);
        setSelectedMcpTools(prev => {
          const newTools = [...new Set([...prev, ...mcpTools])];
          return newTools;
        });
      }
    }
  }, [agent?.allowedTools]);


  // Image handling functions
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    );
    
    imageFiles.forEach(file => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedImages(prev => [...prev, {
            id,
            file,
            preview: e.target!.result as string
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleImageRemove = (id: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleImagePreview = (preview: string) => {
    setPreviewImage(preview);
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              setSelectedImages(prev => [...prev, {
                id,
                file,
                preview: e.target!.result as string
              }]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer?.files;
    if (!files) return;
    
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    );
    
    imageFiles.forEach(file => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedImages(prev => [...prev, {
            id,
            file,
            preview: e.target!.result as string
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

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
        setCommandWarning(t('agentChat.unknownCommandWarning', {
          command: commandName,
          commands: SYSTEM_COMMANDS.map(cmd => cmd.content).join(', ')
        }));
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
          // 发送到后端：使用原始用户输入
          userMessage = inputMessage.trim();
          
          // 前端显示：使用格式化的命令消息
          const commandArgs = inputMessage.slice(command.content.length).trim() || undefined;
          const formattedCommand = formatCommandMessage(command, commandArgs, projectPath);
          
          // 添加用户消息（前端显示用格式化版本）
          addMessage({
            content: formattedCommand,
            role: 'user',
            images: imageData
          });
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
          setSelectedImages([]);
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
    setSelectedImages([]);
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
                  console.log('🔧 Processing tool_result for tool_use_id:', block.tool_use_id);
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
                  addTextPartToMessage(aiMessageId, resultContent);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key for both command selector and regular input
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // If command selector is showing and has commands
      if (showCommandSelector && allCommands.length > 0) {
        // Auto-complete to selected command if available
        const selectedCmd = allCommands[selectedCommandIndex];
        if (selectedCmd) {
          handleCommandSelect(selectedCmd);
        } else {
          handleSendMessage();
        }
        return;
      }
      
      // Regular enter key handling or command selector with no results
      // Check for undefined command and show warning
      if (isCommandTrigger(inputMessage)) {
        const commandName = inputMessage.slice(1).split(' ')[0].toLowerCase();
        if (!isCommandDefined(commandName)) {
          setCommandWarning(t('agentChat.unknownCommandWarning', {
            command: commandName,
            commands: SYSTEM_COMMANDS.map(cmd => cmd.content).join(', ')
          }));
          return;
        }
      }
      
      handleSendMessage();
      return;
    }

    // Handle command selector navigation (non-Enter keys)
    if (showCommandSelector && allCommands.length > 0) {
      // Arrow keys or Ctrl+P/N for navigation
      if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault();
        setSelectedCommandIndex(prev => 
          prev > 0 ? prev - 1 : allCommands.length - 1
        );
        return;
      }
      
      if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
        e.preventDefault();
        setSelectedCommandIndex(prev => 
          prev < allCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandSelector(false);
        return;
      }
    }
  };

  const handleKeyPress = useCallback((_e: React.KeyboardEvent) => {
    // Enter key is now fully handled in handleKeyDown
    // This function is kept for potential future use
  }, []);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputMessage(value);
    
    // Clear command warning when input changes
    if (commandWarning) {
      setCommandWarning(null);
    }
    
    // Check if we should show command selector
    if (isCommandTrigger(value)) {
      const search = extractCommandSearch(value);
      // Only update if search term actually changed
      if (search !== commandSearch) {
        setCommandSearch(search);
        setSelectedCommandIndex(0);
      }
      if (!showCommandSelector) {
        setShowCommandSelector(true);
      }
    } else {
      if (showCommandSelector) {
        setShowCommandSelector(false);
        setSelectedCommand(null);
        setSelectedCommandIndex(0);
      }
    }
  }, [commandWarning, commandSearch, showCommandSelector]);
  
  const handleCommandSelect = (command: CommandType) => {
    // 命令选择器只是帮助填入命令，不立即执行
    setSelectedCommand(command);
    setInputMessage(command.content);
    setShowCommandSelector(false);
    
    // 让用户手动点击发送来执行命令
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  
  const handleCommandSelectorClose = () => {
    setShowCommandSelector(false);
  };
  
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
  
  const getInputPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    
    const rect = textareaRef.current.getBoundingClientRect();
    return {
      top: rect.top, // CommandSelector will calculate the actual position
      left: rect.left
    };
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
        // 会话没有指定版本，使用默认版本但不锁定
        setIsVersionLocked(false);
        console.log(`🔓 Session has no specific version, unlocked`);
      }
    } else {
      // 会话不在活跃列表中，不锁定
      setIsVersionLocked(false);
      console.log(`🔓 Session ${currentSessionId} not in active sessions, unlocked`);
    }
  }, [currentSessionId, activeSessionsData]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header - Fixed */}
      <div
        className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between min-h-[36px]">
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
              disabled={!currentSessionId || isLoadingMessages || isQueryLoading}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('agentChat.refreshMessages')}
            >
              <RefreshCw className={`w-5 h-5 ${(isLoadingMessages || isQueryLoading) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 - 聊天视图 - Scrollable */}
      <div className="flex-1 px-5 py-5 overflow-y-auto space-y-4 min-h-0">
        {/* Welcome message */}
        <div className="px-4">
          <div className="text-sm leading-relaxed break-words overflow-hidden text-gray-600 dark:text-gray-400">
            {agent.ui.welcomeMessage || agent.description}
          </div>
        </div>

        {(isLoadingMessages || (isQueryLoading && currentSessionId)) ? (
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
          renderedMessages
        )}

        {(isAiTyping || isStopping || isInitializingSession) && (
          <div className="flex flex-col items-center py-2 space-y-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            {isStopping && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('agentChat.stopping')}
              </div>
            )}
            {!isStopping && isInitializingSession && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('agentChat.initializingSession')}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mobile vs Desktop Input Area */}
    {isMobile ? (
      /* Mobile Chat Toolbar */
      <div
        className={`flex-shrink-0 ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Over Indicator */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/50 bg-opacity-75 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-blue-600 dark:text-blue-300 text-lg font-medium flex items-center space-x-2">
              <Image className="w-6 h-6" />
              <span>{t('agentChat.dropImageHere')}</span>
            </div>
          </div>
        )}

        {/* Command Warning */}
        {commandWarning && (
          <div className="px-3 pt-2 pb-1">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-2 flex items-start space-x-2">
              <div className="flex-shrink-0">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-red-800 dark:text-red-300">{commandWarning}</p>
              </div>
            </div>
          </div>
        )}

        <MobileChatToolbar
          inputMessage={inputMessage}
          onInputChange={(value) => setInputMessage(value)}
          onSend={handleSendMessage}
          selectedImages={selectedImages}
          onImageRemove={handleImageRemove}
          onImageSelect={(files) => files && handleImageSelect({ target: { files } } as any)}
          isAiTyping={isAiTyping}
          showToolSelector={showToolSelector}
          onToolSelectorToggle={() => setShowToolSelector(!showToolSelector)}
          hasSelectedTools={selectedRegularTools.length > 0 || (mcpToolsEnabled && selectedMcpTools.length > 0)}
        />

        {/* Mobile Settings */}
        <div className="px-3 pb-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between py-2">
            <SettingsDropdown
              permissionMode={permissionMode}
              onPermissionModeChange={setPermissionMode}
              selectedClaudeVersion={selectedClaudeVersion}
              onClaudeVersionChange={setSelectedClaudeVersion}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              availableModels={availableModels}
              claudeVersionsData={claudeVersionsData}
              isVersionLocked={isVersionLocked}
              isAiTyping={isAiTyping}
            />

            {isAiTyping || isStopping ? (
              <button
                onClick={handleStopGeneration}
                disabled={isStopping}
                className={`flex items-center space-x-1 px-3 py-1.5 text-white rounded-lg transition-colors text-xs font-medium ${
                  isStopping
                    ? 'bg-red-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                title={isStopping ? t('agentChatPanel.stopping') : t('agentChatPanel.stopGeneration')}
              >
                <Square className="w-3 h-3" />
                <span>{isStopping ? t('agentChatPanel.stopping') : t('agentChatPanel.stop')}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Tool Selector */}
        <UnifiedToolSelector
          isOpen={showToolSelector}
          onClose={() => setShowToolSelector(false)}
          selectedRegularTools={selectedRegularTools}
          onRegularToolsChange={setSelectedRegularTools}
          selectedMcpTools={selectedMcpTools}
          onMcpToolsChange={setSelectedMcpTools}
          mcpToolsEnabled={mcpToolsEnabled}
          onMcpEnabledChange={setMcpToolsEnabled}
          presetTools={agent.allowedTools}
        />
      </div>
    ) : (
      /* Desktop Input Area - Fixed */
      <div
        className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700 ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Selected Images Preview */}
        {selectedImages.length > 0 && (
          <div className="p-4 pb-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {selectedImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.preview}
                    alt={t('agentChat.imagePreview')}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImagePreview(img.preview)}
                  />
                  <button
                    onClick={() => handleImageRemove(img.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                    title={t('agentChat.deleteImage')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drag Over Indicator */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/50 bg-opacity-75 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-blue-600 dark:text-blue-300 text-lg font-medium flex items-center space-x-2">
              <Image className="w-6 h-6" />
              <span>{t('agentChat.dropImageHere')}</span>
            </div>
          </div>
        )}

        {/* Command Warning */}
        {commandWarning && (
          <div className="px-4 pt-3 pb-2">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start space-x-2">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-300">{commandWarning}</p>
              </div>
            </div>
          </div>
        )}

        {/* Text Input */}
        <div className="p-4 pb-2">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder={
              selectedImages.length > 0
                ? t('agentChat.addDescription')
                : t('agentChat.inputPlaceholder')
            }
            rows={1}
            className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            style={{
              '--focus-ring-color': 'hsl(var(--primary))',
              minHeight: '44px',
              maxHeight: '120px'
            } as React.CSSProperties}
            disabled={isAiTyping}
          />
        </div>

        {/* Toolbar */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* 工具选择按钮 */}
              <div className="relative">
                <button
                  onClick={() => setShowToolSelector(!showToolSelector)}
                  className={`p-2 transition-colors rounded-lg ${
                    showToolSelector || (selectedRegularTools.length > 0 || selectedMcpTools.length > 0)
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={t('agentChat.toolSelection')}
                  disabled={isAiTyping}
                >
                  <Wrench className="w-4 h-4" />
                </button>

                {/* 显示工具数量标识 */}
                {(selectedRegularTools.length > 0 || (mcpToolsEnabled && selectedMcpTools.length > 0)) && (
                  <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center bg-blue-600 dark:bg-blue-500">
                    {selectedRegularTools.length + (mcpToolsEnabled ? selectedMcpTools.filter(t => t.startsWith('mcp__') && t.split('__').length === 3).length : 0)}
                  </span>
                )}

                {/* 工具选择器 - 使用新的UnifiedToolSelector */}
                <UnifiedToolSelector
                  isOpen={showToolSelector}
                  onClose={() => setShowToolSelector(false)}
                  selectedRegularTools={selectedRegularTools}
                  onRegularToolsChange={setSelectedRegularTools}
                  selectedMcpTools={selectedMcpTools}
                  onMcpToolsChange={setSelectedMcpTools}
                  mcpToolsEnabled={mcpToolsEnabled}
                  onMcpEnabledChange={setMcpToolsEnabled}
                  presetTools={agent.allowedTools}
                />
              </div>

              {/* Tool buttons */}
              <div className="relative">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 transition-colors rounded-lg ${
                    selectedImages.length > 0
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={selectedImages.length > 0 ? t('agentChat.imageSelection') + ` (${t('agentChat.selectedCount', { count: selectedImages.length })})` : t('agentChat.imageSelection')}
                  disabled={isAiTyping}
                >
                  <Image className="w-4 h-4" />
                </button>
                {selectedImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center bg-blue-600 dark:bg-blue-500">
                    {selectedImages.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* 窄屏模式：设置下拉菜单 */}
              {isCompactMode ? (
                <SettingsDropdown
                  permissionMode={permissionMode}
                  onPermissionModeChange={setPermissionMode}
                  selectedClaudeVersion={selectedClaudeVersion}
                  onClaudeVersionChange={setSelectedClaudeVersion}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  availableModels={availableModels}
                  claudeVersionsData={claudeVersionsData}
                  isVersionLocked={isVersionLocked}
                  isAiTyping={isAiTyping}
                />
              ) : (
                <>
                  {/* 权限模式下拉 */}
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                      className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                        permissionMode !== 'default'
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                          : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      disabled={isAiTyping}
                    >
                      <Zap className="w-4 h-4" />
                      <span className="text-xs">{t(`agentChat.permissionMode.${permissionMode}`)}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showPermissionDropdown && (
                      <div className="absolute bottom-full left-0 mb-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                        {[
                          { value: 'default', label: t('agentChat.permissionMode.default') },
                          { value: 'acceptEdits', label: t('agentChat.permissionMode.acceptEdits') },
                          { value: 'bypassPermissions', label: t('agentChat.permissionMode.bypassPermissions') },
                          // { value: 'plan', label: t('agentChat.permissionMode.plan') }
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setPermissionMode(option.value as any);
                              setShowPermissionDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                              permissionMode === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Claude版本选择下拉 - 只在有多个版本时显示，位置移到模型选择之前 */}
                  {claudeVersionsData?.versions && claudeVersionsData.versions.length > 1 && (
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => !isVersionLocked && setShowVersionDropdown(!showVersionDropdown)}
                        className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                          isVersionLocked
                            ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                            : selectedClaudeVersion
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        disabled={isAiTyping || isVersionLocked}
                        title={
                          isVersionLocked
                            ? t('agentChat.claudeVersion.locked')
                            : t('agentChat.claudeVersion.title')
                        }
                      >
                        <Terminal className="w-4 h-4" />
                        <span className="text-xs">
                          {selectedClaudeVersion
                            ? claudeVersionsData.versions.find(v => v.id === selectedClaudeVersion)?.name || t('agentChat.claudeVersion.custom')
                            : t('agentChat.claudeVersion.default')
                          }
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showVersionDropdown && (
                        <div className="absolute bottom-full left-0 mb-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                          {/* 默认版本选项 */}
                          <button
                            onClick={() => {
                              setSelectedClaudeVersion(undefined);
                              setShowVersionDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg ${
                              !selectedClaudeVersion ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {t('agentChat.claudeVersion.default')}
                          </button>

                          {/* 其他版本选项 */}
                          {claudeVersionsData.versions
                            .filter(version => version.id !== claudeVersionsData.defaultVersionId)
                            .map(version => (
                              <button
                                key={version.id}
                                onClick={() => {
                                  setSelectedClaudeVersion(version.id);
                                  setShowVersionDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 last:rounded-b-lg ${
                                  selectedClaudeVersion === version.id
                                    ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span>{version.name}</span>
                                  {version.isSystem && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">({t('agentChat.claudeVersion.system')})</span>
                                  )}
                                </div>
                              </button>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {/* 模型切换下拉 - 只在可用模型数量大于等于2时显示 */}
                  {availableModels.length >= 2 && (
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                          selectedModel === 'opus'
                            ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        disabled={isAiTyping}
                      >
                        <Cpu className="w-4 h-4" />
                        <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]" title={availableModels.find(m => m.id === selectedModel)?.name || t(`agentChat.model.${selectedModel}`)}>
                          {availableModels.find(m => m.id === selectedModel)?.name || t(`agentChat.model.${selectedModel}`)}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showModelDropdown && (
                        <div className="absolute bottom-full left-0 mb-2 min-w-[160px] max-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                          {availableModels.map(model => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model.id);
                                setShowModelDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                                selectedModel === model.id
                                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                              title={model.description}
                            >
                              <div className="flex items-center justify-between">
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 pr-2" title={model.name}>{model.name}</span>
                                {model.isVision && (
                                  <span className="text-xs text-gray-400 flex-shrink-0">👁️</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {isAiTyping || isStopping ? (
                <button
                  onClick={handleStopGeneration}
                  disabled={isStopping}
                  className={`flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium shadow-sm ${
                    isStopping
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title={isStopping ? t('agentChatPanel.stopping') : t('agentChatPanel.stopGeneration')}
                >
                  <Square className="w-4 h-4" />
                  <span>{isStopping ? t('agentChatPanel.stopping') : t('agentChatPanel.stop')}</span>
                </button>
              ) : (
                <button
                  onClick={handleSendMessage}
                  disabled={isSendDisabled()}
                  className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm"
                  style={{ backgroundColor: !isSendDisabled() ? 'hsl(var(--primary))' : undefined }}
                  title={
                    isAiTyping ? t('agentChatPanel.aiTyping') :
                    !inputMessage.trim() && selectedImages.length === 0 ? t('agentChatPanel.noContentToSend') :
                    isCommandTrigger(inputMessage) && !isCommandDefined(inputMessage.slice(1).split(' ')[0].toLowerCase()) ? t('agentChatPanel.unknownCommand') :
                    t('agentChatPanel.sendMessage')
                  }
                >
                  <Send className="w-4 h-4" />
                  <span>{t('agentChatPanel.send')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      <CommandSelector
        isOpen={showCommandSelector}
        onSelect={handleCommandSelect}
        onClose={handleCommandSelectorClose}
        searchTerm={commandSearch}
        position={getInputPosition()}
        projectId={projectPath} // Pass projectPath as projectId, will be detected as path
        selectedIndex={selectedCommandIndex}
        onSelectedIndexChange={setSelectedCommandIndex}
      />
      
      <ConfirmDialog
        isOpen={showConfirmDialog}
        message={confirmMessage}
        onConfirm={handleConfirmDialog}
        onCancel={handleCancelDialog}
      />
      
      <ImagePreview
        images={previewImage ? [previewImage] : []}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};