import React, { useState, useRef, useEffect } from 'react';
import { Send, Clock, Square, Image, Wrench, X } from 'lucide-react';
import { ImagePreview } from './ImagePreview';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgentChat, useAgentSessions, useAgentSessionMessages } from '../hooks/useAgents';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessageRenderer } from './ChatMessageRenderer';
import { SessionsDropdown } from './SessionsDropdown';
import { McpToolSelector } from './McpToolSelector';
import type { AgentConfig } from '../types/index.js';

interface AgentChatPanelProps {
  agent: AgentConfig;
  projectPath?: string;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ agent, projectPath }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMcpSelector, setShowMcpSelector] = useState(false);
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{ id: string; file: File; preview: string }>>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
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

  // Calculate the actual number of tools represented by the selection
  const getActualToolCount = () => {
    // 现在只需要计算单个工具选择的数量
    return selectedMcpTools.filter(t => t.startsWith('mcp__') && t.split('__').length === 3).length;
  };

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

    const userMessage = inputMessage.trim();
    const images = [...selectedImages];
    setInputMessage('');
    setSelectedImages([]);
    
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

      // Use agent-specific SSE streaming chat - pass null as sessionId if no current session
      await agentChatMutation.mutateAsync({
        agentId: agent.id,
        message: userMessage,
        images: imageData.length > 0 ? imageData : undefined,
        context,
        sessionId: currentSessionId, // Keep existing session or null for new session
        projectPath,
        mcpTools: mcpToolsEnabled && selectedMcpTools.length > 0 ? selectedMcpTools : undefined,
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
    clearMessages();
    setCurrentSessionId(sessionId);
    setShowSessions(false);
    queryClient.invalidateQueries({ queryKey: ['agent-session-messages', agent.id, sessionId] });
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
    if (sessionMessagesData?.messages && currentSessionId && sessionMessagesData.messages.length > 0) {
      loadSessionMessages(sessionMessagesData.messages);
    }
  }, [sessionMessagesData, currentSessionId, loadSessionMessages]);

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
        
        {messages.map((message) => (
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
        ))}
        
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
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder={selectedImages.length > 0 ? "添加描述文字... (可选)" : "输入你的消息... (Shift+Enter 换行，Enter 发送)"}
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
              <div className="relative">
                <button
                onClick={() => setShowMcpSelector(!showMcpSelector)}
                className={`relative p-2 transition-colors rounded-lg ${
                  mcpToolsEnabled && selectedMcpTools.length > 0
                    ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                    : selectedMcpTools.length > 0
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={`MCP工具 ${selectedMcpTools.length > 0 ? `(已选择${getActualToolCount()}个${mcpToolsEnabled ? '，已启用' : '，未启用'})` : '(未选择)'}`}
                disabled={isAiTyping}
              >
                <Wrench className="w-4 h-4" />
                {selectedMcpTools.length > 0 && (
                  <span className={`absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ${
                    mcpToolsEnabled ? 'bg-green-600' : 'bg-blue-600'
                  }`}>
                    {getActualToolCount()}
                  </span>
                )}
                </button>
                
                {/* MCP Tool Selector Tooltip */}
                <McpToolSelector
                  isOpen={showMcpSelector}
                  onClose={() => setShowMcpSelector(false)}
                  selectedTools={selectedMcpTools}
                  onToolsChange={setSelectedMcpTools}
                  enabled={mcpToolsEnabled}
                  onEnabledChange={setMcpToolsEnabled}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
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

      <ImagePreview 
        imageUrl={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />
    </div>
  );
};