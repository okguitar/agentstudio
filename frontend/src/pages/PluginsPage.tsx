import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMarketplaces } from '../hooks/useMarketplaces';
import { usePlugins } from '../hooks/usePlugins';
import { MarketplacesTab } from '../components/plugins/MarketplacesTab';
import { BrowsePluginsTab } from '../components/plugins/BrowsePluginsTab';
import { useMobileContext } from '../contexts/MobileContext';

export const PluginsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const [activeTab, setActiveTab] = useState('marketplaces');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);

  const handleMarketplaceClick = (marketplaceId: string) => {
    setSelectedMarketplace(marketplaceId);
    setActiveTab('browse');
  };

  // Load data
  const {
    marketplaces,
    isLoading: isLoadingMarketplaces,
    addMarketplace,
    isAddingMarketplace,
    syncMarketplace,
    isSyncingMarketplace,
    removeMarketplace,
    isRemovingMarketplace,
  } = useMarketplaces();

  const {
    availablePlugins,
    isLoadingAvailable,
    installPlugin,
    isInstallingPlugin,
    uninstallPlugin,
    isUninstallingPlugin,
  } = usePlugins();

  return (
    <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>
          {t('plugins.title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('plugins.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-2 max-w-xl'}`}>
          <TabsTrigger value="marketplaces">
            {t('plugins.tabs.marketplaces')}
          </TabsTrigger>
          <TabsTrigger value="browse">
            {t('plugins.tabs.browse')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplaces" className="mt-6">
          <MarketplacesTab
            marketplaces={marketplaces}
            isLoading={isLoadingMarketplaces}
            onAddMarketplace={addMarketplace}
            isAdding={isAddingMarketplace}
            onSyncMarketplace={syncMarketplace}
            isSyncing={isSyncingMarketplace}
            onRemoveMarketplace={removeMarketplace}
            isRemoving={isRemovingMarketplace}
            onMarketplaceClick={handleMarketplaceClick}
          />
        </TabsContent>

        <TabsContent value="browse" className="mt-6">
          <BrowsePluginsTab
            plugins={availablePlugins}
            isLoading={isLoadingAvailable}
            marketplaces={marketplaces}
            onInstallPlugin={installPlugin}
            isInstalling={isInstallingPlugin}
            onUninstallPlugin={uninstallPlugin}
            isUninstalling={isUninstallingPlugin}
            selectedMarketplace={selectedMarketplace}
            onMarketplaceChange={setSelectedMarketplace}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PluginsPage;

