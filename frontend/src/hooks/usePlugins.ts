import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../lib/authFetch';
import { API_BASE } from '../lib/config';
import { 
  AvailablePlugin, 
  InstalledPlugin, 
  PluginInstallRequest, 
  PluginDetailResponse,
  FileContentResponse,
} from '../types/plugins';
import { showSuccess, showError, showInfo } from '../utils/toast';

export const usePlugins = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('pages');

  // Get all available plugins
  const {
    data: availablePlugins = [],
    isLoading: isLoadingAvailable,
    error: availableError,
    refetch: refetchAvailable,
  } = useQuery({
    queryKey: ['plugins-available'],
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/plugins/available`);
      if (!response.ok) {
        throw new Error('Failed to fetch available plugins');
      }
      const data = await response.json();
      return data.plugins as AvailablePlugin[];
    },
  });

  // Get all installed plugins
  const {
    data: installedPlugins = [],
    isLoading: isLoadingInstalled,
    error: installedError,
    refetch: refetchInstalled,
  } = useQuery({
    queryKey: ['plugins-installed'],
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/plugins/installed`);
      if (!response.ok) {
        throw new Error('Failed to fetch installed plugins');
      }
      const data = await response.json();
      return data.plugins as InstalledPlugin[];
    },
  });

  // Install plugin mutation
  const installPlugin = useMutation({
    mutationFn: async (request: PluginInstallRequest) => {
      const response = await authFetch(`${API_BASE}/plugins/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to install plugin');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins-available'] });
      queryClient.invalidateQueries({ queryKey: ['plugins-installed'] });
      showInfo(t('plugins.messages.installSuccess'));
    },
    onError: (error: Error) => {
      showError(t('plugins.messages.installError'), error.message);
    },
  });

  // Enable plugin mutation
  const enablePlugin = useMutation({
    mutationFn: async ({ marketplaceName, pluginName }: { marketplaceName: string; pluginName: string }) => {
      const response = await authFetch(
        `${API_BASE}/plugins/${marketplaceName}/${pluginName}/enable`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enable plugin');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins-available'] });
      queryClient.invalidateQueries({ queryKey: ['plugins-installed'] });
      showInfo(t('plugins.messages.enableSuccess'));
    },
    onError: (error: Error) => {
      showError(t('plugins.messages.enableError'), error.message);
    },
  });

  // Disable plugin mutation
  const disablePlugin = useMutation({
    mutationFn: async ({ marketplaceName, pluginName }: { marketplaceName: string; pluginName: string }) => {
      const response = await authFetch(
        `${API_BASE}/plugins/${marketplaceName}/${pluginName}/disable`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disable plugin');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins-available'] });
      queryClient.invalidateQueries({ queryKey: ['plugins-installed'] });
      showSuccess(t('plugins.messages.disableSuccess'));
    },
    onError: (error: Error) => {
      showError(t('plugins.messages.disableError'), error.message);
    },
  });

  // Uninstall plugin mutation
  const uninstallPlugin = useMutation({
    mutationFn: async ({ marketplaceName, pluginName }: { marketplaceName: string; pluginName: string }) => {
      const response = await authFetch(
        `${API_BASE}/plugins/${marketplaceName}/${pluginName}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to uninstall plugin');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins-available'] });
      queryClient.invalidateQueries({ queryKey: ['plugins-installed'] });
      showSuccess(t('plugins.messages.uninstallSuccess'));
    },
    onError: (error: Error) => {
      showError(t('plugins.messages.uninstallError'), error.message);
    },
  });

  return {
    // Available plugins
    availablePlugins,
    isLoadingAvailable,
    availableError,
    refetchAvailable,

    // Installed plugins
    installedPlugins,
    isLoadingInstalled,
    installedError,
    refetchInstalled,

    // Mutations
    installPlugin: installPlugin.mutate,
    isInstallingPlugin: installPlugin.isPending,
    enablePlugin: enablePlugin.mutate,
    isEnablingPlugin: enablePlugin.isPending,
    disablePlugin: disablePlugin.mutate,
    isDisablingPlugin: disablePlugin.isPending,
    uninstallPlugin: uninstallPlugin.mutate,
    isUninstallingPlugin: uninstallPlugin.isPending,
  };
};

// Hook for getting plugin details
export const usePluginDetail = (marketplaceName: string | null, pluginName: string | null) => {
  return useQuery({
    queryKey: ['plugin-detail', marketplaceName, pluginName],
    queryFn: async () => {
      if (!marketplaceName || !pluginName) {
        return null;
      }

      const response = await authFetch(
        `${API_BASE}/plugins/${marketplaceName}/${pluginName}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch plugin details');
      }

      const data = await response.json();
      return data as PluginDetailResponse;
    },
    enabled: !!marketplaceName && !!pluginName,
  });
};

// Hook for getting file content
export const useFileContent = (
  marketplaceName: string | null,
  pluginName: string | null,
  filePath: string | null
) => {
  return useQuery({
    queryKey: ['plugin-file-content', marketplaceName, pluginName, filePath],
    queryFn: async () => {
      if (!marketplaceName || !pluginName || !filePath) {
        return null;
      }

      const response = await authFetch(
        `${API_BASE}/plugins/${marketplaceName}/${pluginName}/files/${filePath}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch file content');
      }

      const data = await response.json();
      return data as FileContentResponse;
    },
    enabled: !!marketplaceName && !!pluginName && !!filePath,
  });
};

