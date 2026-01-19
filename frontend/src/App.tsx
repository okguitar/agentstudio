import React, { useEffect, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/toaster';
import { MobileProvider } from './contexts/MobileContext';
import { TelemetryProvider } from './components/TelemetryProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

// External redirect component for non-React routes
const ExternalRedirect: React.FC<{ url: string }> = ({ url }) => {
  useEffect(() => {
    window.location.href = url;
  }, [url]);
  return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
};

// 懒加载页面组件
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const AgentsPage = lazy(() => import('./pages/AgentsPage').then(module => ({ default: module.AgentsPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(module => ({ default: module.ProjectsPage })));
const McpPage = lazy(() => import('./pages/McpPage').then(module => ({ default: module.McpPage })));
const SettingsLayout = lazy(() => import('./components/SettingsLayout').then(module => ({ default: module.SettingsLayout })));
const GeneralSettingsPage = lazy(() => import('./pages/settings/GeneralSettingsPage').then(module => ({ default: module.GeneralSettingsPage })));
const SupplierSettingsPage = lazy(() => import('./pages/settings/VersionSettingsPage').then(module => ({ default: module.VersionSettingsPage })));
const MemorySettingsPage = lazy(() => import('./pages/settings/MemorySettingsPage').then(module => ({ default: module.MemorySettingsPage })));
const SubagentsPage = lazy(() => import('./pages/settings/SubagentsPage').then(module => ({ default: module.SubagentsPage })));
const McpAdminSettingsPage = lazy(() => import('./pages/settings/McpAdminSettingsPage').then(module => ({ default: module.McpAdminSettingsPage })));
const TelemetrySettingsPage = lazy(() => import('./pages/settings/TelemetrySettingsPage').then(module => ({ default: module.TelemetrySettingsPage })));
const SystemInfoPage = lazy(() => import('./pages/settings/SystemInfoPage').then(module => ({ default: module.SystemInfoPage })));
const WebSocketTunnelPage = lazy(() => import('./pages/settings/WebSocketTunnelPage').then(module => ({ default: module.WebSocketTunnelPage })));
const CommandsPage = lazy(() => import('./pages/CommandsPage').then(module => ({ default: module.CommandsPage })));
const SkillsPage = lazy(() => import('./pages/SkillsPage').then(module => ({ default: module.SkillsPage })));
const PluginsPage = lazy(() => import('./pages/PluginsPage').then(module => ({ default: module.PluginsPage })));
const ScheduledTasksPage = lazy(() => import('./pages/ScheduledTasksPage').then(module => ({ default: module.ScheduledTasksPage })));
const ChatPage = lazy(() => import('./pages/ChatPage').then(module => ({ default: module.ChatPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.default })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const ToastTestPage = lazy(() => import('./pages/ToastTestPage').then(module => ({ default: module.ToastTestPage })));

// 加载中组件
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

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
      <Suspense fallback={<LoadingFallback />}>
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
          <Route path="/skills" element={
            <ProtectedRoute>
              <Layout><SkillsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/plugins" element={
            <ProtectedRoute>
              <Layout><PluginsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/scheduled-tasks" element={
            <ProtectedRoute>
              <Layout><ScheduledTasksPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout><SettingsLayout /></Layout>
            </ProtectedRoute>
          }>
            <Route index element={<GeneralSettingsPage />} />
            <Route path="general" element={<GeneralSettingsPage />} />
            <Route path="suppliers" element={<SupplierSettingsPage />} />
            <Route path="memory" element={<MemorySettingsPage />} />
            <Route path="commands" element={<CommandsPage />} />
            <Route path="subagents" element={<SubagentsPage />} />
            <Route path="mcp-admin" element={<McpAdminSettingsPage />} />
            <Route path="telemetry" element={<TelemetrySettingsPage />} />
            <Route path="system-info" element={<SystemInfoPage />} />
            <Route path="tunnel" element={<WebSocketTunnelPage />} />
          </Route>

          {/* Toast Test Page */}
          <Route path="/toast-test" element={
            <ProtectedRoute>
              <Layout><ToastTestPage /></Layout>
            </ProtectedRoute>
          } />

          {/* Discord redirect */}
          <Route path="/discord" element={<ExternalRedirect url="https://discord.gg/6uYsrr66" />} />

          {/* Catch-all route for unmatched paths */}
          <Route path="*" element={
            <ProtectedRoute>
              <Layout><div className="p-4 text-center">Page not found</div></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </Router>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MobileProvider>
          <TelemetryProvider>
            <AppContent />
            <Toaster />
          </TelemetryProvider>
        </MobileProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;