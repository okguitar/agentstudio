import React, { useState, useEffect } from 'react';
import { 
  Save,
  Moon,
  Sun,
  Monitor,
  // Terminal
} from 'lucide-react';

export const GeneralSettingsPage: React.FC = () => {
  const [theme, setTheme] = useState('auto');
  const [language, setLanguage] = useState('zh');

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

  const saveSettings = () => {
    localStorage.setItem('language', language);
    alert('设置已保存');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">通用设置</h2>
        <p className="text-gray-600">配置界面主题和基本设置</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
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
            <h4 className="font-medium text-gray-900 mb-3">应用信息</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>AI PPT Editor</span>
                <span>v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>构建日期</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              查看详细版本信息和更新请转至"版本管理"页面
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
          <button 
            onClick={saveSettings}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>保存设置</span>
          </button>
        </div>
      </div>
    </div>
  );
};