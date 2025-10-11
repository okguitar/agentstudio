import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Server,
  Settings,
  FolderOpen,
  Home
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const getNavigationItems = (t: (key: string) => string) => [
  {
    name: t('nav.dashboard'),
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: t('nav.projects'),
    href: '/projects',
    icon: FolderOpen,
  },
  {
    name: t('nav.agents'),
    href: '/agents',
    icon: Bot,
  },
  {
    name: t('nav.mcp'),
    href: '/mcp',
    icon: Server,
  },
  {
    name: t('nav.settings'),
    href: '/settings',
    icon: Settings,
  },
];

interface MobileNavigationProps {
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ className = '' }) => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const navigationItems = getNavigationItems(t);

  const isLinkActive = (href: string) => {
    if (href === '/settings') {
      return location.pathname.startsWith('/settings');
    }
    return location.pathname === href;
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 ${className}`}>
      <div className="flex justify-around items-center h-16 px-2">
        {/* Home Button */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1 ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-xs mt-1 truncate">Home</span>
        </NavLink>

        {/* Navigation Items */}
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive || isLinkActive(item.href)
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs mt-1 truncate">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};