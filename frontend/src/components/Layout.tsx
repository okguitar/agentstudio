import React from 'react';
import { Menu } from 'lucide-react';
import { MobileSidebar } from './MobileSidebar';
import { Sidebar } from './Sidebar';
import { useMobileContext } from '../contexts/MobileContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isMobile, sidebarOpen, setSidebarOpen } = useMobileContext();

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Desktop Sidebar - Visible on md (768px) and above */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar - Overlay for all mobile sizes */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Mobile Header - Only on mobile (below md) */}
        {isMobile && (
          <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <img src="/cc-studio.png" alt="CC Studio" className="w-8 h-8" />
                </div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">CC Studio</h1>
              </div>
              <div className="w-9 h-9" /> {/* Spacer for balance */}
            </div>
          </header>
        )}

        {/* Page Content */}
        <div className={isMobile ? 'pb-4' : ''}>
          {children}
        </div>

        {/* Removed Mobile Bottom Navigation to avoid duplication */}
      </main>
    </div>
  );
};