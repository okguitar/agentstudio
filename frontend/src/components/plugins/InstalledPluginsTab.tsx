import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Power, PowerOff, Trash2, Package, Eye } from 'lucide-react';
import { InstalledPlugin, PluginMarketplace } from '../../types/plugins';
import { useMobileContext } from '../../contexts/MobileContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PluginDetailModal } from './PluginDetailModal';

interface InstalledPluginsTabProps {
  plugins: InstalledPlugin[];
  isLoading: boolean;
  marketplaces: PluginMarketplace[];
  onEnablePlugin: (params: { marketplaceName: string; pluginName: string }) => void;
  isEnabling: boolean;
  onDisablePlugin: (params: { marketplaceName: string; pluginName: string }) => void;
  isDisabling: boolean;
  onUninstallPlugin: (params: { marketplaceName: string; pluginName: string }) => void;
  isUninstalling: boolean;
  selectedMarketplace: string | null;
  onMarketplaceChange: (marketplaceId: string | null) => void;
}

export const InstalledPluginsTab: React.FC<InstalledPluginsTabProps> = ({
  plugins,
  isLoading,
  marketplaces,
  onEnablePlugin,
  isEnabling,
  onDisablePlugin,
  isDisabling,
  onUninstallPlugin,
  isUninstalling,
  selectedMarketplace,
  onMarketplaceChange,
}) => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState<{ marketplace: string; name: string } | null>(null);

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.manifest.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMarketplace = !selectedMarketplace ||
      marketplaces.find(m => m.id === selectedMarketplace)?.name === plugin.marketplaceName;
    return matchesSearch && matchesMarketplace;
  });

  // Get the display name for the selected marketplace
  const selectedMarketplaceDisplayName = React.useMemo(() => {
    if (!selectedMarketplace) return t('plugins.installed.filters.allMarketplaces');
    const marketplace = marketplaces.find(m => m.id === selectedMarketplace);
    return marketplace?.displayName || selectedMarketplace;
  }, [selectedMarketplace, marketplaces, t]);

  const handleUninstall = (plugin: InstalledPlugin) => {
    if (window.confirm(t('plugins.installed.confirmUninstall', { name: plugin.name }))) {
      onUninstallPlugin({
        marketplaceName: plugin.marketplaceName,
        pluginName: plugin.name,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter */}
      <div className={`${isMobile ? 'space-y-3' : 'flex items-center gap-4'} mb-6`}>
        <div className={`${isMobile ? '' : 'flex-1 max-w-md'} relative`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder={t('plugins.installed.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className={`${isMobile ? '' : 'w-64'}`}>
          <Select
            value={selectedMarketplace ?? 'all'}
            onValueChange={(value) => onMarketplaceChange(value === 'all' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue>
                {selectedMarketplaceDisplayName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('plugins.installed.filters.allMarketplaces')}</SelectItem>
              {marketplaces.map((marketplace) => (
                <SelectItem key={marketplace.id} value={marketplace.id}>
                  {marketplace.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plugins List */}
      {filteredPlugins.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? t('plugins.installed.noResults') : t('plugins.installed.noPlugins')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {!searchQuery && t('plugins.installed.goBrowse')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {plugin.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        plugin.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {plugin.enabled
                        ? t('plugins.installed.status.enabled')
                        : t('plugins.installed.status.disabled')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {plugin.manifest.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{t('plugins.installed.table.marketplace')}: {plugin.marketplace}</span>
                    <span>•</span>
                    <span>{t('plugins.installed.table.version')}: {plugin.version}</span>
                    {plugin.components.commands.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{plugin.components.commands.length} commands</span>
                      </>
                    )}
                    {plugin.components.skills.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{plugin.components.skills.length} skills</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedPlugin({
                        marketplace: plugin.marketplaceName,
                        name: plugin.name,
                      })
                    }
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {t('plugins.installed.actions.details')}
                  </Button>
                  {plugin.enabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onDisablePlugin({
                          marketplaceName: plugin.marketplaceName,
                          pluginName: plugin.name,
                        })
                      }
                      disabled={isDisabling}
                    >
                      <PowerOff className="w-4 h-4 mr-1" />
                      {t('plugins.installed.actions.disable')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onEnablePlugin({
                          marketplaceName: plugin.marketplaceName,
                          pluginName: plugin.name,
                        })
                      }
                      disabled={isEnabling}
                    >
                      <Power className="w-4 h-4 mr-1" />
                      {t('plugins.installed.actions.enable')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUninstall(plugin)}
                    disabled={isUninstalling}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPlugin && (
        <PluginDetailModal
          isOpen={!!selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
          marketplaceName={selectedPlugin.marketplace}
          pluginName={selectedPlugin.name}
        />
      )}
    </div>
  );
};

