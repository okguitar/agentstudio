import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Clock, Square, Image, Wrench, X, Plus, Zap, Cpu, ChevronDown } from 'lucide-react';
import { ImagePreview } from './ImagePreview';
import { CommandSelector } from './CommandSelector';
import { ConfirmDialog } from './ConfirmDialog';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgentChat, useAgentSessions, useAgentSessionMessages } from '../hooks/useAgents';
import { useCommands, useProjectCommands } from '../hooks/useCommands';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessageRenderer } from './ChatMessageRenderer';
import { SessionsDropdown } from './SessionsDropdown';
import { UnifiedToolSelector } from './UnifiedToolSelector';
import type { AgentConfig } from '../types/index.js';
import { 
  isCommandTrigger, 
  extractCommandSearch, 
  formatCommandMessage, 
  type CommandType
} from '../utils/commandFormatter';
import { createCommandHandler, SystemCommand } from '../utils/commandHandler';

interface AgentChatPanelProps {
  agent: AgentConfig;
  projectPath?: string;
  onSessionChange?: (sessionId: string | null) => void;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ agent, projectPath, onSessionChange }) => {
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
  const [permissionMode, setPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'>('default');
  const [selectedModel, setSelectedModel] = useState<'sonnet' | 'opus'>('sonnet');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const {
    messages,
    isAiTyping,
    currentSessionId,
    addMessage,
    updateMessage,
    addTextPartToMessage,
    addToolPartToMessage,
    updateToolPartInMessage,
    setAiTyping,
    setCurrentSessionId,
    clearMessages,
    loadSessionMessages,

  } = useAgentStore();
  
  const queryClient = useQueryClient();
  const agentChatMutation = useAgentChat();
  const { data: sessionsData } = useAgentSessions(agent.id, searchTerm, projectPath);
  const { data: sessionMessagesData } = useAgentSessionMessages(agent.id, currentSessionId, projectPath);
  
  // Fetch commands for keyboard navigation
  const { data: userCommands = [] } = useCommands({ scope: 'user', search: commandSearch });
  const { data: projectCommands = [] } = useProjectCommands({
    projectId: projectPath || '', // Pass projectPath directly as it will be detected as path
    search: commandSearch
  });

  // System commands definition
  const SYSTEM_COMMANDS: SystemCommand[] = [
    {
      id: 'init',
      name: 'init',
      description: '初始化项目或重置对话上下文',
      content: '/init',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'clear',
      name: 'clear',
      description: '清空当前对话历史',
      content: '/clear',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'compact',
      name: 'compact',
      description: '压缩对话历史，保留关键信息',
      content: '/compact',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'agents',
      name: 'agents',
      description: '管理AI代理和子代理',
      content: '/agents',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'settings',
      name: 'settings',
      description: '打开设置页面',
      content: '/settings',
      scope: 'system',
      isSystem: true
    },
    {
      id: 'help',
      name: 'help',
      description: '显示帮助信息',
      content: '/help',
      scope: 'system',
      isSystem: true
    },
  ];

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
    
    // Check if this is a command and handle routing
    if (isCommandTrigger(inputMessage)) {
      const commandName = inputMessage.slice(1).split(' ')[0].toLowerCase();
      
      // 创建命令处理器
      const commandHandler = createCommandHandler({
        agentStore: useAgentStore.getState(),
        onNewSession: handleNewSession,
        onNavigate: (path: string) => {
          alert(`导航到: ${path}`);
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
        // 用户手动输入的命令，创建系统命令对象
        const SYSTEM_COMMANDS = [
          { id: 'init', name: 'init', description: '初始化项目或重置对话上下文', content: '/init', scope: 'system' as const, isSystem: true },
          { id: 'clear', name: 'clear', description: '清空当前对话历史', content: '/clear', scope: 'system' as const, isSystem: true },
          { id: 'compact', name: 'compact', description: '压缩对话历史，保留关键信息', content: '/compact', scope: 'system' as const, isSystem: true },
          { id: 'agents', name: 'agents', description: '管理AI代理和子代理', content: '/agents', scope: 'system' as const, isSystem: true },
          { id: 'settings', name: 'settings', description: '打开设置页面', content: '/settings', scope: 'system' as const, isSystem: true },
          { id: 'help', name: 'help', description: '显示帮助信息', content: '/help', scope: 'system' as const, isSystem: true },
        ];
        command = SYSTEM_COMMANDS.find(cmd => cmd.name === commandName);
      }
      
      if (command) {
        // 执行命令路由
        const result = await commandHandler.executeCommand(command);
        
        if (result.shouldSendToBackend) {
          // 继续发送到后端，格式化消息
          const commandArgs = inputMessage.slice(command.content.length).trim() || undefined;
          userMessage = formatCommandMessage(command, commandArgs, projectPath);
        } else {
          // 前端处理完成，清空输入并返回
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
    }
    
    setInputMessage('');
    setSelectedImages([]);
    setSelectedCommand(null);
    setShowCommandSelector(false);
    
    // Convert images to backend format
    const imageData = images.map(img => ({
      id: img.id,
      data: img.preview.split(',')[1], // Remove data:image/type;base64, prefix
      mediaType: img.file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      filename: img.file.name
    }));
    
    // Add user message with images
    addMessage({
      content: userMessage || '发送了图片',
      role: 'user',
      images: imageData
    });

    // Build context - now simplified since each agent manages its own state
    const context = {};

    setAiTyping(true);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Add initial AI message placeholder
      let aiMessageId: string | null = null;
      
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
        abortController,
        onMessage: (data) => {
          console.log('Received SSE message:', data);
          const eventData = data as { 
            type: string; 
            sessionId?: string; 
            subtype?: string; 
            message?: { content: unknown[] }; 
            permission_denials?: Array<{ tool_name: string; tool_input: Record<string, unknown> }> 
          };
          
          if (eventData.type === 'connected' && eventData.sessionId) {
            console.log('Setting session ID from AI response:', eventData.sessionId);
            // Only set session ID if we don't have one (new session created by AI)
            if (!currentSessionId) {
              setCurrentSessionId(eventData.sessionId);
              // Update URL with new session ID
              if (onSessionChange) {
                onSessionChange(eventData.sessionId);
              }
              // Refresh sessions list when new session is created
              queryClient.invalidateQueries({ queryKey: ['agent-sessions', agent.id] });
            }
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
            }

            // Handle tool use and text content
            if (eventData.message?.content && aiMessageId) {
              for (const block of eventData.message.content as Array<{ type: string; text?: string; name?: string; input?: unknown; id?: string }>) {
                if (block.type === 'text') {
                  // Add text as a separate part
                  if (block.text) {
                    addTextPartToMessage(aiMessageId, block.text);
                  }
                } else if (block.type === 'tool_use') {
                  // Add tool usage as a separate part
                  if (block.name) {
                    const toolData = {
                      toolName: block.name,
                      toolInput: (block.input as Record<string, unknown>) || {},
                      isExecuting: true,
                      claudeId: block.id // Store Claude's tool use ID for matching with results
                    };
                    addToolPartToMessage(aiMessageId, toolData);
                  }
                }
              }
            }
          }
          else if (eventData.type === 'user') {
            // Tool results
            if (eventData.message?.content && aiMessageId) {
              for (const block of eventData.message.content as Array<{ type: string; content?: unknown; is_error?: boolean; tool_use_id?: string }>) {
                if (block.type === 'tool_result' && block.tool_use_id) {
                  // Find the tool by tool_use_id
                  const state = useAgentStore.getState();
                  const currentMessage = state.messages.find(m => m.id === aiMessageId);
                  if (currentMessage?.messageParts) {
                    const targetTool = currentMessage.messageParts.find((part: any) =>
                      part.type === 'tool' && part.toolData?.claudeId === block.tool_use_id
                    );
                    
                    if (targetTool?.toolData) {
                      // Update the corresponding tool with results
                      const toolResult = typeof block.content === 'string' 
                        ? block.content 
                        : Array.isArray(block.content)
                          ? block.content.map((c: { text?: string }) => c.text || String(c)).join('')
                          : JSON.stringify(block.content);
                      
                      updateToolPartInMessage(aiMessageId, targetTool.toolData.id, {
                        toolResult,
                        isError: block.is_error || false,
                        isExecuting: false
                      });
                    }
                  }
                }
              }
            }
          }
          else if (eventData.type === 'result') {
            console.log('Received result, stopping AI typing...');
            // Clear the abort controller
            abortControllerRef.current = null;
            // Force state update immediately
            setTimeout(() => {
              setAiTyping(false);
              console.log('AI typing status should be false now');
            }, 0);
            
            // Handle different result types
            let finalMessage = '';
            if (eventData.subtype === 'success') {
              finalMessage = '';
            } else if (eventData.subtype === 'error_max_turns') {
              finalMessage = '\n\n⏱️ **达到最大轮次限制**';
              if (eventData.permission_denials && eventData.permission_denials.length > 0) {
                finalMessage += '\n\n⚠️ **权限拒绝的操作**:';
                eventData.permission_denials.forEach((denial: { tool_name: string; tool_input: Record<string, unknown> }, index: number) => {
                  finalMessage += `\n${index + 1}. ${denial.tool_name}: \`${denial.tool_input.command || denial.tool_input.description || JSON.stringify(denial.tool_input)}\``;
                });
                finalMessage += '\n\n💡 某些操作需要用户权限确认才能执行。';
              }
            } else if (eventData.subtype === 'error_during_execution') {
              finalMessage = '\n\n❌ **执行过程中出现错误**';
            } else {
              finalMessage = '\n\n✅ **处理完成**';
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
        },
        onError: (error) => {
          console.error('SSE error:', error);
          setAiTyping(false);
          abortControllerRef.current = null;
          
          // Check if error is due to user cancellation
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.log('Request was aborted by user');
            return;
          }
          
          // Add error message if no AI message was created yet
          if (!aiMessageId) {
            addMessage({
              content: '抱歉，处理您的请求时出现了错误。请稍后再试。',
              role: 'assistant'
            });
          } else {
            // Update existing message with error
            updateMessage(aiMessageId, {
              content: '抱歉，处理您的请求时出现了错误。请稍后再试。'
            });
          }
        }
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      setAiTyping(false);
      abortControllerRef.current = null;
      
      // Check if error is due to user cancellation
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request was aborted by user');
        return;
      }
      
      addMessage({
        content: '抱歉，无法连接到AI服务。请检查网络连接或稍后再试。',
        role: 'assistant'
      });
    }
  };

  const handleSwitchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowSessions(false);
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
    // Update URL to remove session ID
    if (onSessionChange) {
      onSessionChange(null);
    }
    // Clear search term
    setSearchTerm('');
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setAiTyping(false);
      
      // Add a message indicating the generation was stopped
      addMessage({
        content: '⏹️ 生成已停止',
        role: 'assistant'
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle command selector navigation
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
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        
        // Auto-complete to selected command if available
        const selectedCmd = allCommands[selectedCommandIndex];
        if (selectedCmd) {
          handleCommandSelect(selectedCmd);
        } else {
          handleSendMessage();
        }
        return;
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Regular enter key handling (only when command selector is not open)
    if (e.key === 'Enter' && !e.shiftKey && !showCommandSelector) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputMessage(value);
    
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
  };
  
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
      messagesLength: sessionMessagesData?.messages?.length
    });
    
    if (sessionMessagesData?.messages && currentSessionId) {
      console.log('✅ Loading session messages:', sessionMessagesData.messages.length);
      loadSessionMessages(sessionMessagesData.messages);
    } else if (currentSessionId && sessionMessagesData && sessionMessagesData.messages?.length === 0) {
      console.log('🗑️ Loading empty session messages');
      // Handle empty session - clear messages
      loadSessionMessages([]);
    }
  }, [sessionMessagesData, currentSessionId, loadSessionMessages]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowPermissionDropdown(false);
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div 
        className="px-5 py-4 border-b border-gray-200 text-white"
        style={{ background: `linear-gradient(135deg, ${agent.ui.primaryColor}, ${agent.ui.primaryColor}dd)` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-semibold mb-1 flex items-center space-x-2">
              <span className="text-2xl">{agent.ui.icon}</span>
              <span>{agent.ui.headerTitle}</span>
              {projectPath && (
                <span className="text-xs opacity-75 font-normal truncate" title={projectPath}>
                  📁 {projectPath.split('/').pop() || projectPath}
                </span>
              )}
            </h1>
            <p className="text-sm opacity-90">
              {currentSessionId ? 
                (sessionsData?.sessions?.find((s: any) => s.id === currentSessionId)?.title || '当前会话') : 
                agent.ui.headerDescription
              }
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleNewSession}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="新建会话"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="会话历史"
              >
                <Clock className="w-5 h-5" />
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
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-5 py-5 overflow-y-auto space-y-4">
        {/* Welcome message */}
        <div className="px-4">
          <div className="text-sm leading-relaxed break-words overflow-hidden text-gray-600">
            {agent.ui.welcomeMessage || agent.description}
          </div>
        </div>
        
        {(() => {
          console.log('🎨 Rendering messages:', {
            messageCount: messages.length,
            firstMessage: messages[0]?.id ? {
              id: messages[0].id,
              role: messages[0].role,
              hasContent: !!messages[0].content,
              hasMessageParts: !!messages[0].messageParts?.length
            } : null
          });
          return messages.map((message) => (
            <div
              key={message.id}
              className="px-4"
            >
              <div
                className={`text-sm leading-relaxed break-words overflow-hidden ${
                  message.role === 'user'
                    ? 'text-white p-3 rounded-lg'
                    : 'text-gray-800'
                }`}
                style={message.role === 'user' ? { backgroundColor: agent.ui.primaryColor } : {}}
              >
                <ChatMessageRenderer message={message as any} />
              </div>
            </div>
          ));
        })()}
        
        {isAiTyping && (
          <div className="flex justify-center py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div 
        className={`border-t border-gray-200 ${isDragOver ? 'bg-blue-50 border-blue-300' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Selected Images Preview */}
        {selectedImages.length > 0 && (
          <div className="p-4 pb-2 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {selectedImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.preview}
                    alt="预览"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImagePreview(img.preview)}
                  />
                  <button
                    onClick={() => handleImageRemove(img.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                    title="删除图片"
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
          <div className="absolute inset-0 bg-blue-100 bg-opacity-75 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-blue-600 text-lg font-medium flex items-center space-x-2">
              <Image className="w-6 h-6" />
              <span>拖放图片到这里</span>
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
                ? "添加描述文字... (可选)"
                : "输入你的消息... (Shift+Enter 换行，Enter 发送，/ 触发命令)"
            }
            rows={1}
            className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-500"
            style={{ 
              '--focus-ring-color': agent.ui.primaryColor,
              minHeight: '44px',
              maxHeight: '120px'
            } as React.CSSProperties}
            disabled={isAiTyping}
          />
        </div>
        
        {/* Toolbar */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
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
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title="工具选择"
                  disabled={isAiTyping}
                >
                  <Wrench className="w-4 h-4" />
                </button>
                
                {/* 显示工具数量标识 */}
                {(selectedRegularTools.length > 0 || (mcpToolsEnabled && selectedMcpTools.length > 0)) && (
                  <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center bg-blue-600">
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
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title={`选择图片${selectedImages.length > 0 ? ` (已选择${selectedImages.length}张)` : ''}`}
                  disabled={isAiTyping}
                >
                  <Image className="w-4 h-4" />
                </button>
                {selectedImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center bg-blue-600">
                    {selectedImages.length}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 权限模式下拉 */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                  className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                    permissionMode !== 'default'
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                  }`}
                  disabled={isAiTyping}
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-xs">{permissionMode === 'default' ? '默认' : permissionMode === 'acceptEdits' ? '接受编辑' : permissionMode === 'bypassPermissions' ? '绕过权限' : '计划模式'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showPermissionDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {[
                      { value: 'default', label: '默认' },
                      { value: 'acceptEdits', label: '接受编辑' },
                      { value: 'bypassPermissions', label: '绕过权限' },
                      { value: 'plan', label: '计划模式' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setPermissionMode(option.value as any);
                          setShowPermissionDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                          permissionMode === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 模型切换下拉 */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedModel === 'opus'
                      ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                      : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                  }`}
                  disabled={isAiTyping}
                >
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs">{selectedModel === 'opus' ? 'Opus' : 'Sonnet'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showModelDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 w-24 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {[
                      { value: 'sonnet', label: 'Sonnet' },
                      { value: 'opus', label: 'Opus' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedModel(option.value as any);
                          setShowModelDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                          selectedModel === option.value 
                            ? (option.value === 'opus' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-700')
                            : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {isAiTyping ? (
                <button
                  onClick={handleStopGeneration}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                  title="停止生成"
                >
                  <Square className="w-4 h-4" />
                  <span>停止</span>
                </button>
              ) : (
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() && selectedImages.length === 0}
                  className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm"
                  style={{ backgroundColor: (inputMessage.trim() || selectedImages.length > 0) ? agent.ui.primaryColor : undefined }}
                  title={`发送消息 (${inputMessage.trim() || selectedImages.length > 0 ? '有内容' : '无内容'})`}
                >
                  <Send className="w-4 h-4" />
                  <span>发送</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
        imageUrl={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />
    </div>
  );
};