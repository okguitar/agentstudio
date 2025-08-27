import React, { useState, useRef, useEffect } from 'react';
import { Send, Clock, Plus, Square } from 'lucide-react';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgentChat, useAgentSessions, useCreateAgentSession, useDeleteAgentSession, useAgentSessionMessages } from '../hooks/useAgents';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessageRenderer } from './ChatMessageRenderer';
import { SessionsDropdown } from './SessionsDropdown';
import type { AgentConfig } from '../types/index.js';

interface AgentChatPanelProps {
  agent: AgentConfig;
  projectPath?: string;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ agent, projectPath }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    buildContext
  } = useAgentStore();
  
  const queryClient = useQueryClient();
  const agentChatMutation = useAgentChat();
  const { data: sessionsData } = useAgentSessions(agent.id, searchTerm, projectPath);
  const createSession = useCreateAgentSession();
  const deleteSession = useDeleteAgentSession();
  const { data: sessionMessagesData } = useAgentSessionMessages(agent.id, currentSessionId, projectPath);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAiTyping) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    addMessage({
      content: userMessage,
      role: 'user'
    });

    // Build context based on current agent and state
    const context = buildContext();

    setAiTyping(true);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Add initial AI message placeholder
      let aiMessageId: string | null = null;
      let currentToolId: string | null = null;
      
      // console.log('Sending agent chat request:', { agentId: agent.id, message: userMessage, context, sessionId: currentSessionId, projectPath });

      // Use agent-specific SSE streaming chat
      await agentChatMutation.mutateAsync({
        agentId: agent.id,
        message: userMessage,
        context,
        sessionId: currentSessionId,
        projectPath,
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
          
          if (eventData.type === 'connected') {
            console.log('Setting session ID:', eventData.sessionId);
            setCurrentSessionId(eventData.sessionId || null);
          } 
          else if (eventData.type === 'system' && eventData.subtype === 'init') {
            // Claude Code SDK initialization
            if (!aiMessageId) {
              const message = {
                content: '🔄 正在初始化 Claude Code SDK...',
                role: 'assistant' as const
              };
              addMessage(message);
              // Get the ID of the message we just added
              const state = useAgentStore.getState();
              aiMessageId = state.messages[state.messages.length - 1].id;
            }
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
              for (const block of eventData.message.content as Array<{ type: string; text?: string; name?: string; input?: unknown }>) {
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
                      isExecuting: true
                    };
                    addToolPartToMessage(aiMessageId, toolData);
                  }
                  
                  // Store the tool ID for later updates
                  const state = useAgentStore.getState();
                  const currentMessage = state.messages.find(m => m.id === aiMessageId);
                  if (currentMessage?.messageParts) {
                    const lastPart = currentMessage.messageParts[currentMessage.messageParts.length - 1];
                    if (lastPart.type === 'tool' && lastPart.toolData) {
                      currentToolId = lastPart.toolData.id;
                    }
                  }
                }
              }
            }
          }
          else if (eventData.type === 'user') {
            // Tool results
            if (eventData.message?.content && aiMessageId) {
              for (const block of eventData.message.content as Array<{ type: string; content?: unknown; is_error?: boolean }>) {
                if (block.type === 'tool_result' && currentToolId) {
                  // Update the corresponding tool with results
                  const toolResult = typeof block.content === 'string' 
                    ? block.content 
                    : Array.isArray(block.content)
                      ? block.content.map((c: { text?: string }) => c.text || String(c)).join('')
                      : JSON.stringify(block.content);
                  
                  updateToolPartInMessage(aiMessageId, currentToolId, {
                    toolResult,
                    isError: block.is_error || false,
                    isExecuting: false
                  });
                  
                  currentToolId = null; // Reset for next tool
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
            
            // Refresh sessions list
            queryClient.invalidateQueries({ queryKey: ['agent-sessions', agent.id] });
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

  const handleNewSession = async () => {
    try {
      const result = await createSession.mutateAsync({ agentId: agent.id, projectPath });
      setCurrentSessionId(result.sessionId);
      clearMessages();
      setShowSessions(false);
      queryClient.invalidateQueries({ queryKey: ['agent-sessions', agent.id] });
    } catch (error) {
      console.error('Failed to create session:', error);
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

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const sessionToDelete = sessionsData?.sessions?.find((s: any) => s.id === sessionId);
    const sessionTitle = sessionToDelete?.title || '未知会话';
    
    const confirmed = window.confirm(`确定要删除会话"${sessionTitle}"吗？\n\n此操作无法撤销。`);
    if (!confirmed) {
      return;
    }
    
    try {
      await deleteSession.mutateAsync({ agentId: agent.id, sessionId, projectPath });
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        clearMessages();
      }
      queryClient.invalidateQueries({ queryKey: ['agent-sessions', agent.id] });
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('删除会话失败，请重试。');
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
            </h1>
            <p className="text-sm opacity-90">
              {currentSessionId ? 
                (sessionsData?.sessions?.find((s: any) => s.id === currentSessionId)?.title || '当前会话') : 
                agent.ui.headerDescription
              }
            </p>
          </div>
          <div className="flex space-x-2 relative">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors relative"
              title="会话历史"
            >
              <Clock className="w-5 h-5" />
            </button>
            <button
              onClick={handleNewSession}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="新建会话"
            >
              <Plus className="w-5 h-5" />
            </button>
            
            {/* Sessions Dropdown */}
            <SessionsDropdown
              isOpen={showSessions}
              onToggle={() => setShowSessions(!showSessions)}
              sessions={sessionsData?.sessions || []}
              currentSessionId={currentSessionId}
              onSwitchSession={handleSwitchSession}
              onNewSession={handleNewSession}
              onDeleteSession={handleDeleteSession}
              isLoading={false}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-5 py-5 overflow-y-auto space-y-4">
        {/* Welcome message */}
        <div className="px-4">
          <div className="text-sm leading-relaxed break-words overflow-hidden text-gray-800">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{agent.ui.icon}</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-2">{agent.name}</div>
                <div className="text-gray-600">{agent.description}</div>
              </div>
            </div>
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

      {/* Input */}
      <div className="p-5 border-t border-gray-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的消息..."
              rows={1}
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--focus-ring-color': agent.ui.primaryColor } as React.CSSProperties}
              disabled={isAiTyping}
            />
          </div>
          {isAiTyping ? (
            <button
              onClick={handleStopGeneration}
              className="flex-shrink-0 w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors"
              title="停止生成"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="flex-shrink-0 w-10 h-10 text-white rounded-lg flex items-center justify-center hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: inputMessage.trim() ? agent.ui.primaryColor : undefined }}
              title={`发送消息 (输入: ${inputMessage.trim() ? '有' : '无'})`}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};