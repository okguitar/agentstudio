import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../lib/config';

interface VersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  checkedAt: number;
  error?: string;
}

interface SystemInfo {
  app: {
    name: string;
    version: string;
    latestVersion: string | null;
    hasUpdate: boolean;
  };
  runtime: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  sdk: {
    engine: string;
    directory: string;
    dirName: string;
  };
  links: {
    npm: string;
    github: string;
    releases: string;
    changelog: string;
  };
}

// LocalStorage keys
const DISMISSED_VERSION_KEY = 'agentstudio_dismissed_version';

// Check interval: 1 hour
const CHECK_INTERVAL = 60 * 60 * 1000;

/**
 * Hook for checking version updates
 */
export function useVersionCheck() {
  const queryClient = useQueryClient();

  // Query for version info
  const {
    data: versionInfo,
    isLoading,
    error,
    refetch,
  } = useQuery<VersionInfo>({
    queryKey: ['version'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/version`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch version info');
      }
      return response.json();
    },
    staleTime: CHECK_INTERVAL,
    refetchInterval: CHECK_INTERVAL,
    refetchOnWindowFocus: false,
  });

  // Check if update should be shown
  const shouldShowUpdate = useCallback(() => {
    if (!versionInfo?.hasUpdate || !versionInfo.latestVersion) {
      return false;
    }

    const dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY);
    if (dismissedVersion === versionInfo.latestVersion) {
      return false;
    }

    return true;
  }, [versionInfo]);

  // Dismiss update notification for current latest version
  const dismissUpdate = useCallback(() => {
    if (versionInfo?.latestVersion) {
      localStorage.setItem(DISMISSED_VERSION_KEY, versionInfo.latestVersion);
      // Force re-render by invalidating the query
      queryClient.invalidateQueries({ queryKey: ['version'] });
    }
  }, [versionInfo, queryClient]);

  // Force check mutation
  const forceCheckMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/version/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['version'], data);
    },
  });

  return {
    currentVersion: versionInfo?.currentVersion || null,
    latestVersion: versionInfo?.latestVersion || null,
    hasUpdate: versionInfo?.hasUpdate || false,
    showUpdateNotification: shouldShowUpdate(),
    isLoading,
    error: error || (versionInfo?.error ? new Error(versionInfo.error) : null),
    dismissUpdate,
    forceCheck: forceCheckMutation.mutate,
    isChecking: forceCheckMutation.isPending,
    refetch,
  };
}

/**
 * Hook for fetching detailed system information
 */
export function useSystemInfo() {
  const {
    data: systemInfo,
    isLoading,
    error,
    refetch,
  } = useQuery<SystemInfo>({
    queryKey: ['systemInfo'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/version/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch system info');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    systemInfo,
    isLoading,
    error,
    refetch,
  };
}
