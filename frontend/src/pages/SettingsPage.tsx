import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Key, 
  Database, 
  Bell, 
  Shield, 
  Globe,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({});

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    { id: 'general', name: '通用设置', icon: Settings },
    { id: 'profile', name: '个人资料', icon: User },
    { id: 'api', name: 'API配置', icon: Key },
    { id: 'storage', name: '存储设置', icon: Database },
    { id: 'notifications', name: '通知设置', icon: Bell },
    { id: 'security', name: '安全设置', icon: Shield },
    { id: 'advanced', name: '高级设置', icon: Globe }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">界面设置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">主题</label>
              <p className="text-sm text-gray-500">选择界面主题</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>自动</option>
              <option>浅色</option>
              <option>深色</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">语言</label>
              <p className="text-sm text-gray-500">选择界面语言</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>中文</option>
              <option>English</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">个人信息</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              defaultValue="jeffkit"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <input
              type="email"
              defaultValue="bbmyth@gmail.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GitHub</label>
            <input
              type="url"
              defaultValue="https://github.com/jeffkit"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderApiSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI服务配置</h3>
        <div className="space-y-6">
          {[
            { name: 'OpenAI API Key', key: 'openai', placeholder: 'sk-...', current: 'sk-proj-***...***abc' },
            { name: 'Anthropic API Key', key: 'anthropic', placeholder: 'sk-ant-...', current: 'sk-ant-***...***xyz' },
            { name: 'Azure OpenAI Endpoint', key: 'azure', placeholder: 'https://...', current: '' }
          ].map((api) => (
            <div key={api.key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium text-gray-900">{api.name}</label>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  api.current ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {api.current ? '已配置' : '未配置'}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showApiKeys[api.key] ? 'text' : 'password'}
                  placeholder={api.placeholder}
                  defaultValue={api.current}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => toggleApiKeyVisibility(api.key)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKeys[api.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStorageSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">存储配置</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">幻灯片存储目录</label>
            <div className="flex space-x-2">
              <input
                type="text"
                defaultValue="../slides"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                浏览
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">相对于后端服务的路径</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">缓存清理</label>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">自动清理缓存</p>
                <p className="text-sm text-gray-500">定期清理临时文件和缓存数据</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知偏好</h3>
        <div className="space-y-4">
          {[
            { name: '系统通知', desc: '系统状态和重要更新', checked: true },
            { name: '任务完成通知', desc: 'Agent完成任务时通知', checked: true },
            { name: '错误通知', desc: '系统错误和异常情况', checked: true },
            { name: '使用统计', desc: '每周使用统计报告', checked: false }
          ].map((notification) => (
            <div key={notification.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{notification.name}</p>
                <p className="text-sm text-gray-500">{notification.desc}</p>
              </div>
              <input type="checkbox" defaultChecked={notification.checked} className="rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">安全选项</h3>
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">会话管理</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">自动登出时间</span>
                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option>1小时</option>
                  <option>8小时</option>
                  <option>24小时</option>
                  <option>永不</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">数据保护</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">加密敏感数据</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">记录操作日志</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">高级配置</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">服务端口</label>
            <input
              type="number"
              defaultValue="3002"
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">后端服务监听端口</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">最大并发请求</label>
            <input
              type="number"
              defaultValue="10"
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">同时处理的最大请求数</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">请求超时时间</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                defaultValue="30"
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500">秒</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general': return renderGeneralSettings();
      case 'profile': return renderProfileSettings();
      case 'api': return renderApiSettings();
      case 'storage': return renderStorageSettings();
      case 'notifications': return renderNotificationSettings();
      case 'security': return renderSecuritySettings();
      case 'advanced': return renderAdvancedSettings();
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
            
            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
              <button className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Save className="w-4 h-4" />
                <span>保存设置</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};