import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  Server, 
  Settings,
  FolderOpen,
  Command,
  ChevronDown,
  ChevronRight,
  Terminal,
  Brain,
  Palette
} from 'lucide-react';
import { ApiSettingsModal } from './ApiSettingsModal';
import { getCurrentHost } from '../lib/config';

const navigationItems = [
  {
    name: '仪表板',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: '项目管理',
    href: '/projects',
    icon: FolderOpen,
  },
  {
    name: 'Agent管理',
    href: '/agents',
    icon: Bot,
  },
  {
    name: 'MCP服务',
    href: '/mcp',
    icon: Server,
  },
  {
    name: '系统设置',
    href: '/settings',
    icon: Settings,
    submenu: [
      {
        name: '通用设置',
        href: '/settings/general',
        icon: Palette,
      },
      {
        name: '版本管理',
        href: '/settings/versions',
        icon: Terminal,
      },
      {
        name: '全局记忆',
        href: '/settings/memory',
        icon: Brain,
      },
      {
        name: '自定义命令',
        href: '/settings/commands',
        icon: Command,
      },
      {
        name: 'Subagent管理',
        href: '/settings/subagents',
        icon: Bot,
      },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    // Auto-expand the settings menu if we're on a settings page
    return location.pathname.startsWith('/settings') ? ['系统设置'] : [];
  });
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Check API health status
  const checkApiHealth = async () => {
    try {
      const currentHost = getCurrentHost();
      if (!currentHost) {
        setApiStatus('disconnected');
        return;
      }

      const healthUrl = `${currentHost}/api/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });

      if (response.ok) {
        setApiStatus('connected');
      } else {
        setApiStatus('disconnected');
      }
    } catch (error) {
      setApiStatus('disconnected');
    }
  };

  // Initial health check and periodic checks
  useEffect(() => {
    checkApiHealth(); // Initial check

    // Check every 30 seconds
    const interval = setInterval(checkApiHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  // Also check when modal closes (in case settings were changed)
  useEffect(() => {
    if (!showApiModal && apiStatus !== 'checking') {
      setTimeout(checkApiHealth, 1000); // Check 1 second after modal closes
    }
  }, [showApiModal, apiStatus]);

  const toggleMenu = (itemName: string) => {
    setExpandedMenus(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isMenuExpanded = (itemName: string) => expandedMenus.includes(itemName);
  
  const isItemActive = (href: string, hasSubmenu: boolean) => {
    if (hasSubmenu) {
      return location.pathname.startsWith(href);
    }
    return location.pathname === href;
  };

  // Get API status button styles
  const getApiButtonStyles = () => {
    switch (apiStatus) {
      case 'connected':
        return {
          iconClass: 'w-4 h-4 text-green-500',
          buttonClass: 'p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors',
          title: 'API服务器设置 - 连接正常'
        };
      case 'disconnected':
        return {
          iconClass: 'w-4 h-4 text-red-500',
          buttonClass: 'p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors',
          title: 'API服务器设置 - 连接失败'
        };
      case 'checking':
      default:
        return {
          iconClass: 'w-4 h-4 text-gray-400',
          buttonClass: 'p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors',
          title: 'API服务器设置 - 检查中...'
        };
    }
  };

  const renderNavItem = (item: any) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = isMenuExpanded(item.name);
    const isActive = isItemActive(item.href, hasSubmenu);

    if (hasSubmenu) {
      return (
        <li key={item.name}>
          <div className="space-y-1">
            {/* Parent Menu Item */}
            <button
              onClick={() => toggleMenu(item.name)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium flex-1 text-left">{item.name}</span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {/* Submenu */}
            {isExpanded && (
              <ul className="ml-6 space-y-1">
                {item.submenu.map((subItem: any) => (
                  <li key={subItem.name}>
                    <NavLink
                      to={subItem.href}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <subItem.icon className="w-4 h-4" />
                      <span className="font-medium">{subItem.name}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      );
    }

    return (
      <li key={item.name}>
        <NavLink
          to={item.href}
          className={({ isActive }) =>
            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.name}</span>
        </NavLink>
      </li>
    );
  };

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col h-full z-40">
      {/* Logo */}
      <div className="px-6 py-8 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <img src="/cc-studio.png" alt="CC Studio" className="w-10 h-10" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900">CC Studio</h1>
            <p className="text-sm text-gray-500">Claude Code Studio</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <ul className="space-y-2">
          {navigationItems.map(renderNavItem)}
        </ul>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            版本 1.0.0
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowApiModal(true)}
              className={getApiButtonStyles().buttonClass}
              title={getApiButtonStyles().title}
            >
              <Server className={getApiButtonStyles().iconClass} />
            </button>
            {apiStatus === 'disconnected' && (
              <span className="text-xs text-red-500 api-text-breathing cursor-pointer" 
                    onClick={() => setShowApiModal(true)}>
                服务不可用
              </span>
            )}
            {apiStatus === 'connected' && (
              <span className="text-xs text-green-600">
                服务正常
              </span>
            )}
            {apiStatus === 'checking' && (
              <span className="text-xs text-gray-500">
                检查中...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* API Settings Modal */}
      <ApiSettingsModal 
        isOpen={showApiModal}
        onClose={() => setShowApiModal(false)}
      />
    </div>
  );
};