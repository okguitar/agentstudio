import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { AgentsPage } from './pages/AgentsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { McpPage } from './pages/McpPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsLayout } from './components/SettingsLayout';
import { GeneralSettingsPage } from './pages/settings/GeneralSettingsPage';
import { VersionSettingsPage } from './pages/settings/VersionSettingsPage';
import { MemorySettingsPage } from './pages/settings/MemorySettingsPage';
import { SubagentsPage } from './pages/settings/SubagentsPage';
import { CommandsPage } from './pages/CommandsPage';
import { ChatPage } from './pages/ChatPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Chat page without layout (full screen) */}
        <Route path="/chat/:agentId" element={<ChatPage />} />
        
        {/* Admin pages with layout */}
        <Route path="/" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/agents" element={<Layout><AgentsPage /></Layout>} />
        <Route path="/projects" element={<Layout><ProjectsPage /></Layout>} />
        <Route path="/commands" element={<Layout><CommandsPage /></Layout>} />
        <Route path="/mcp" element={<Layout><McpPage /></Layout>} />
        <Route path="/analytics" element={<Layout><AnalyticsPage /></Layout>} />
        <Route path="/settings" element={<Layout><SettingsLayout /></Layout>}>
          <Route index element={<GeneralSettingsPage />} />
          <Route path="general" element={<GeneralSettingsPage />} />
          <Route path="versions" element={<VersionSettingsPage />} />
          <Route path="memory" element={<MemorySettingsPage />} />
          <Route path="subagents" element={<SubagentsPage />} />
        </Route>
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