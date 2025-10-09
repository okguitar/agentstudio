import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { AgentsPage } from './pages/AgentsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { McpPage } from './pages/McpPage';
import { SettingsLayout } from './components/SettingsLayout';
import { GeneralSettingsPage } from './pages/settings/GeneralSettingsPage';
import { VersionSettingsPage } from './pages/settings/VersionSettingsPage';
import { MemorySettingsPage } from './pages/settings/MemorySettingsPage';
import { SubagentsPage } from './pages/settings/SubagentsPage';
import { CommandsPage } from './pages/CommandsPage';
import { ChatPage } from './pages/ChatPage';
import LandingPage from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  // Initialize theme on app startup
  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem('theme') || 'auto';

      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // Auto theme - follow system preference
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // Listen for system theme changes
        const handleChange = (e: MediaQueryListEvent) => {
          if (localStorage.getItem('theme') === 'auto') {
            if (e.matches) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    };

    applyTheme();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route path="/chat/:agentId" element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        } />

        {/* Admin pages with layout (protected) */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/agents" element={
          <ProtectedRoute>
            <Layout><AgentsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <Layout><ProjectsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/mcp" element={
          <ProtectedRoute>
            <Layout><McpPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout><SettingsLayout /></Layout>
          </ProtectedRoute>
        }>
          <Route index element={<GeneralSettingsPage />} />
          <Route path="general" element={<GeneralSettingsPage />} />
          <Route path="versions" element={<VersionSettingsPage />} />
          <Route path="memory" element={<MemorySettingsPage />} />
          <Route path="commands" element={<CommandsPage />} />
          <Route path="subagents" element={<SubagentsPage />} />
        </Route>

        {/* Catch-all route for unmatched paths */}
        <Route path="*" element={
          <ProtectedRoute>
            <Layout><div className="p-4 text-center">Page not found</div></Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;