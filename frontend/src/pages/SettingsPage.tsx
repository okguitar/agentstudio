import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save,
  Moon,
  Sun,
  Monitor,
  Brain,
  Edit,
  FileText
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [theme, setTheme] = useState('auto');
  const [language, setLanguage] = useState('zh');
  const [globalMemory, setGlobalMemory] = useState('');
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

  const sections = [
    { id: 'general', name: '通用设置', icon: Settings },
    { id: 'memory', name: '全局记忆', icon: Brain }
  ];

  // Load saved settings
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    const savedLanguage = localStorage.getItem('language') || 'zh';
    setTheme(savedTheme);
    setLanguage(savedLanguage);
  }, []);

  // Apply theme changes
  useEffect(() => {
    const applyTheme = () => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // Auto theme
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load global memory
  useEffect(() => {
    loadGlobalMemory();
  }, []);

  const loadGlobalMemory = async () => {
    setIsLoadingMemory(true);
    try {
      const response = await fetch('/api/settings/global-memory');
      if (response.ok) {
        const data = await response.text();
        setGlobalMemory(data);
      }
    } catch (error) {
      console.error('Failed to load global memory:', error);
    } finally {
      setIsLoadingMemory(false);
    }
  };

  const saveGlobalMemory = async () => {
    try {
      const response = await fetch('/api/settings/global-memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: globalMemory,
      });
      
      if (response.ok) {
        setIsEditingMemory(false);
        alert('全局记忆已保存');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save global memory:', error);
      alert('保存失败，请重试');
    }
  };

  const saveSettings = () => {
    localStorage.setItem('language', language);
    alert('设置已保存');
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">界面设置</h3>
        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <label className="block font-medium text-gray-900 mb-3">主题</label>
            <p className="text-sm text-gray-500 mb-4">选择界面主题模式</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'auto', label: '跟随系统', icon: Monitor },
                { value: 'light', label: '浅色模式', icon: Sun },
                { value: 'dark', label: '深色模式', icon: Moon }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-all ${
                    theme === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <option.icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">语言</label>
            <p className="text-sm text-gray-500 mb-3">选择界面语言</p>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Version Info */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">版本信息</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Claude Code Studio</span>
                <span>v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>构建日期</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMemorySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">全局记忆设置</h3>
        <p className="text-sm text-gray-600 mb-6">
          全局记忆是所有AI助手共享的背景信息，包含您的工作偏好、项目信息等。
          内容来自用户目录下的 <code className="bg-gray-100 px-1 rounded">claude.md</code> 文件。
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block font-medium text-gray-900">记忆内容</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditingMemory(!isEditingMemory)}
                className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                <span>{isEditingMemory ? '取消编辑' : '编辑'}</span>
              </button>
              <button
                onClick={loadGlobalMemory}
                disabled={isLoadingMemory}
                className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>{isLoadingMemory ? '刷新中...' : '刷新'}</span>
              </button>
            </div>
          </div>
          
          {isEditingMemory ? (
            <div className="space-y-3">
              <textarea
                value={globalMemory}
                onChange={(e) => setGlobalMemory(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="在这里编写您的全局记忆内容..."
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsEditingMemory(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={saveGlobalMemory}
                  className="flex items-center space-x-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  <span>保存记忆</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[300px]">
              {isLoadingMemory ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">正在加载全局记忆...</div>
                </div>
              ) : globalMemory ? (
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {globalMemory}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>暂无全局记忆内容</p>
                    <p className="text-xs mt-1">点击"编辑"按钮开始添加</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>• 全局记忆将在每次对话时自动加载，为AI提供背景信息</p>
            <p>• 建议包含：工作偏好、项目背景、个人信息等</p>
            <p>• 文件位置：<code className="bg-gray-100 px-1 rounded">~/claude.md</code></p>
          </div>
        </div>
      </div>
    </div>
  );



  const renderContent = () => {
    switch (activeSection) {
      case 'general': return renderGeneralSettings();
      case 'memory': return renderMemorySettings();
      default: return renderGeneralSettings();
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
        <p className="text-gray-600 mt-2">配置系统参数和个人偏好</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-2">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  <span className="font-medium">{section.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {renderContent()}
            
            {/* Save Button - Only show for general settings */}
            {activeSection === 'general' && (
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                <button 
                  onClick={saveSettings}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>保存设置</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};