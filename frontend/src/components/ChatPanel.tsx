import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useAIChat } from '../hooks/useAI';
import { readStreamingResponse } from '../utils/streamReader';

export const ChatPanel: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    messages,
    isAiTyping,
    currentSlideIndex,
    slides,
    addMessage,
    setAiTyping
  } = useAppStore();
  
  const aiChatMutation = useAIChat();

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

    // Prepare context
    const context = {
      currentSlide: currentSlideIndex,
      allSlides: slides
    };

    setAiTyping(true);

    try {
      const response = await aiChatMutation.mutateAsync({
        message: userMessage,
        context
      });

      let aiResponse = '';
      
      // Add initial AI message
      const messageId = Date.now().toString();
      addMessage({
        content: '',
        role: 'assistant'
      });

      // Read streaming response
      await readStreamingResponse(
        response,
        (chunk) => {
          aiResponse += chunk;
          // Update the last message (AI response)
          useAppStore.setState(state => ({
            messages: state.messages.map((msg, index) => 
              index === state.messages.length - 1 
                ? { ...msg, content: aiResponse }
                : msg
            )
          }));
        },
        () => {
          setAiTyping(false);
        },
        (error) => {
          console.error('Streaming error:', error);
          setAiTyping(false);
          // Update with error message
          useAppStore.setState(state => ({
            messages: state.messages.map((msg, index) => 
              index === state.messages.length - 1 
                ? { ...msg, content: '抱歉，处理您的请求时出现了错误。请稍后再试。' }
                : msg
            )
          }));
        }
      );
    } catch (error) {
      console.error('Chat error:', error);
      setAiTyping(false);
      addMessage({
        content: '抱歉，无法连接到AI服务。请检查网络连接或稍后再试。',
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-400 text-white">
        <h1 className="text-lg font-semibold mb-1">AI PPT助手</h1>
        <p className="text-sm opacity-90">与AI聊天来编辑你的演示文稿</p>
      </div>

      {/* Messages */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isAiTyping && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 p-3 rounded-lg rounded-bl-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
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
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAiTyping}
              style={{ maxHeight: '100px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isAiTyping}
            className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};