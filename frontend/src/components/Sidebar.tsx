import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
import { useTranslation } from 'react-i18next';
import { ApiSettingsModal } from './ApiSettingsModal';
import { getCurrentHost } from '../lib/config';

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
    submenu: [
      {
        name: t('nav.settingsSubmenu.general'),
        href: '/settings/general',
        icon: Palette,
      },
      {
        name: t('nav.settingsSubmenu.versions'),
        href: '/settings/versions',
        icon: Terminal,
      },
      {
        name: t('nav.settingsSubmenu.memory'),
        href: '/settings/memory',
        icon: Brain,
      },
      {
        name: t('nav.settingsSubmenu.commands'),
        href: '/settings/commands',
        icon: Command,
      },
      {
        name: t('nav.settingsSubmenu.subagents'),
        href: '/settings/subagents',
        icon: Bot,
      },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    // Auto-expand the settings menu if we're on a settings page
    return location.pathname.startsWith('/settings') ? [t('nav.settings')] : [];
  });
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const navigationItems = getNavigationItems(t);

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

  const toggleMenu = (itemKey: string) => {
    setExpandedMenus(prev =>
      prev.includes(itemKey)
        ? prev.filter(key => key !== itemKey)
        : [...prev, itemKey]
    );
  };

  const isMenuExpanded = (itemKey: string) => expandedMenus.includes(itemKey);
  
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
          title: t('footer.apiServerStatus.connected')
        };
      case 'disconnected':
        return {
          iconClass: 'w-4 h-4 text-red-500',
          buttonClass: 'p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors',
          title: t('footer.apiServerStatus.disconnected')
        };
      case 'checking':
      default:
        return {
          iconClass: 'w-4 h-4 text-gray-400',
          buttonClass: 'p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors',
          title: t('footer.apiServerStatus.checking')
        };
    }
  };

  const renderNavItem = (item: any) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = isMenuExpanded(item.name);
    const isActive = isItemActive(item.href, hasSubmenu);

    if (hasSubmenu) {
      return (
        <li key={item.nameKey}>
          <div className="space-y-1">
            {/* Parent Menu Item */}
            <button
              onClick={() => toggleMenu(item.name)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
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
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
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
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
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
    <div className="w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 flex flex-col h-full z-40">
      {/* Logo */}
      <div className="px-6 py-8 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-3 w-full text-left hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <img src="/cc-studio.png" alt="CC Studio" className="w-10 h-10" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">CC Studio</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Claude Code Studio</p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <ul className="space-y-2">
          {navigationItems.map(renderNavItem)}
        </ul>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t('footer.version', { version: '1.0.0' })}
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
                {t('footer.serviceStatus.unavailable')}
              </span>
            )}
            {apiStatus === 'connected' && (
              <span className="text-xs text-green-600">
                {t('footer.serviceStatus.normal')}
              </span>
            )}
            {apiStatus === 'checking' && (
              <span className="text-xs text-gray-500">
                {t('footer.serviceStatus.checking')}
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