import React, { useRef, useEffect } from 'react';
import { Clock, Plus, Trash2, Search } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  messageCount: number;
  lastUpdated: string;
}

interface SessionsDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: Session[];
  currentSessionId: string | null;
  onSwitchSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  isLoading?: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const SessionsDropdown: React.FC<SessionsDropdownProps> = ({
  isOpen,
  onToggle,
  sessions,
  currentSessionId,
  onSwitchSession,
  onNewSession,
  onDeleteSession,
  isLoading = false,
  searchTerm,
  onSearchChange
}) => {
  // Remove local searchTerm state since it's now passed as props
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Sessions are already filtered by backend, no need for client-side filtering
  const filteredSessions = sessions;

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">会话历史</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onNewSession}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="新建会话"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索会话..."
            className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="py-2">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSwitchSession(session.id)}
                className={`flex items-center justify-between mx-2 px-3 py-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                  currentSessionId === session.id ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {session.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {session.messageCount} 条消息 • {new Date(session.lastUpdated).toLocaleString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <button
                  onClick={(e) => onDeleteSession(session.id, e)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                  title="删除会话"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            {searchTerm ? (
              <div>
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">未找到匹配的会话</p>
              </div>
            ) : (
              <div>
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-2">暂无会话历史</p>
                <button
                  onClick={onNewSession}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  创建第一个会话
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};