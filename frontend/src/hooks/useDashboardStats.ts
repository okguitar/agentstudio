import { useAgents } from './useAgents';
import { useProjects } from './useProjects';
import { useCommands } from './useCommands';
import { useSessions } from './useSessions';

export interface DashboardStats {
  agents: {
    total: number;
    enabled: number;
  };
  projects: {
    total: number;
  };
  commands: {
    total: number;
    project: number;
    user: number;
  };
  sessions: {
    total: number;
    active: number;
  };
}

export const useDashboardStats = () => {
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: commandsData, isLoading: commandsLoading } = useCommands();
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions();

  const isLoading = agentsLoading || projectsLoading || commandsLoading || sessionsLoading;

  const agents = agentsData?.agents || [];
  const projects = projectsData?.projects || [];
  const commands = commandsData || [];
  const sessions = sessionsData?.sessions || [];

  const stats: DashboardStats = {
    agents: {
      total: agents.length,
      enabled: agents.filter(a => a.enabled).length,
    },
    projects: {
      total: projects.length,
    },
    commands: {
      total: commands.length,
      project: commands.filter(c => c.scope === 'project').length,
      user: commands.filter(c => c.scope === 'user').length,
    },
    sessions: {
      total: sessions.length,
      active: sessionsData?.activeSessionCount || 0,
    },
  };

  return {
    stats,
    isLoading,
  };
};
