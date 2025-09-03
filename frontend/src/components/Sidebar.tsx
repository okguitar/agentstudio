import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  Server, 
  BarChart3, 
  Settings,
  FolderOpen,
  Command,
  ChevronDown,
  ChevronRight,
  Terminal,
  Brain,
  Palette
} from 'lucide-react';

const navigationItems = [
  {
    name: '仪表板',
    href: '/',
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
    name: '使用统计',
    href: '/analytics',
    icon: BarChart3,
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
        href: '/commands',
        icon: Command,
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
    return location.pathname === href || (href === '/' && location.pathname === '/');
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
          end={item.href === '/'}
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
    <div className="fixed top-0 left-0 w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col h-screen z-40">
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
        <div className="text-xs text-gray-500 text-center">
          版本 1.0.0
        </div>
      </div>
    </div>
  );
};