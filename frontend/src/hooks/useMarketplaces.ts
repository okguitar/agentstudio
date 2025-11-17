import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../lib/authFetch';
import { API_BASE } from '../lib/config';
import { PluginMarketplace, MarketplaceAddRequest } from '../types/plugins';
import { showSuccess, showError } from '../utils/toast';

export const useMarketplaces = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('pages');

  // Get all marketplaces
  const {
    data: marketplaces = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['plugin-marketplaces'],
    queryFn: async () => {
      const response = await authFetch(`${API_BASE}/plugins/marketplaces`);
      if (!response.ok) {
        throw new Error('Failed to fetch marketplaces');
      }
      const data = await response.json();
      return data.marketplaces as PluginMarketplace[];
    },
  });

  // Add marketplace mutation
  const addMarketplace = useMutation({
    mutationFn: async (request: MarketplaceAddRequest) => {
      const response = await authFetch(`${API_BASE}/plugins/marketplaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add marketplace');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-marketplaces'] });
      queryClient.invalidateQueries({ queryKey: ['plugins-available'] });
      showSuccess(t('plugins.messages.marketplaceAddSuccess'));
    },
    onError: (error: Error) => {
      showError(t('plugins.messages.marketplaceAddError'), error.message);
    },
  });

  // Sync marketplace mutation
  const syncMarketplace = useMutation({
    mutationFn: async (marketplaceId: string) => {
      const response = await authFetch(`${API_BASE}/plugins/marketplaces/${marketplaceId}/sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync marketplace');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-marketplaces'] });
      queryClient.invalidateQueries({ queryKey: ['plugins-available'] });
      showSuccess(t('plugins.messages.marketplaceSyncSuccess'));
    },
    onError: (error: Error) => {
      showError(t('plugins.messages.marketplaceSyncError'), error.message);
    },
  });

  // Remove marketplace mutation
  const removeMarketplace = useMutation({
    mutationFn: async (marketplaceId: string) => {
      const response = await authFetch(`${API_BASE}/plugins/marketplaces/${marketplaceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove marketplace');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-marketplaces'] });
      queryClient.invalidateQueries({ queryKey: ['plugins-available'] });
      queryClient.invalidateQueries({ queryKey: ['plugins-installed'] });
      showSuccess(t('plugins.messages.marketplaceRemoveSuccess'));
    },
    onError: (error: Error) => {
      showError(t('plugins.messages.marketplaceRemoveError'), error.message);
    },
  });

  return {
    marketplaces,
    isLoading,
    error,
    refetch,
    addMarketplace: addMarketplace.mutate,
    isAddingMarketplace: addMarketplace.isPending,
    syncMarketplace: syncMarketplace.mutate,
    isSyncingMarketplace: syncMarketplace.isPending,
    removeMarketplace: removeMarketplace.mutate,
    isRemovingMarketplace: removeMarketplace.isPending,
  };
};

