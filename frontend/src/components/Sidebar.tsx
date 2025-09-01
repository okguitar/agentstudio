import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  Server, 
  BarChart3, 
  Settings,
  FolderOpen
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
  },
];

export const Sidebar: React.FC = () => {
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
          {navigationItems.map((item) => (
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
          ))}
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