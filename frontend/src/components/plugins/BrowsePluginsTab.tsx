import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Package, Eye, Download, Trash2, CheckCircle } from 'lucide-react';
import { AvailablePlugin, PluginMarketplace } from '../../types/plugins';
import { useMobileContext } from '../../contexts/MobileContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PluginDetailModal } from './PluginDetailModal';

interface BrowsePluginsTabProps {
  plugins: AvailablePlugin[];
  isLoading: boolean;
  marketplaces: PluginMarketplace[];
  onInstallPlugin: (request: { pluginName: string; marketplaceName: string; marketplaceId: string }) => void;
  isInstalling: boolean;
  onUninstallPlugin: (params: { marketplaceName: string; pluginName: string }) => void;
  isUninstalling: boolean;
  selectedMarketplace: string | null;
  onMarketplaceChange: (marketplaceId: string | null) => void;
}

export const BrowsePluginsTab: React.FC<BrowsePluginsTabProps> = ({
  plugins,
  isLoading,
  marketplaces,
  onInstallPlugin,
  isInstalling,
  onUninstallPlugin,
  isUninstalling,
  selectedMarketplace,
  onMarketplaceChange,
}) => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState<{ marketplace: string; name: string } | null>(null);
  const [showOnlyInstalled, setShowOnlyInstalled] = useState(false);

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMarketplace = !selectedMarketplace || plugin.marketplaceId === selectedMarketplace;
    const matchesInstalled = !showOnlyInstalled || plugin.installed;
    return matchesSearch && matchesMarketplace && matchesInstalled;
  });

  // Get the display name for the selected marketplace
  const selectedMarketplaceDisplayName = React.useMemo(() => {
    if (!selectedMarketplace) return t('plugins.browse.filters.allMarketplaces');
    const marketplace = marketplaces.find(m => m.id === selectedMarketplace);
    return marketplace?.displayName || selectedMarketplace;
  }, [selectedMarketplace, marketplaces, t]);

  const handleInstall = (plugin: AvailablePlugin) => {
    onInstallPlugin({
      pluginName: plugin.name,
      marketplaceName: plugin.marketplaceName,
      marketplaceId: plugin.marketplaceId,
    });
  };

  const handleUninstall = (plugin: AvailablePlugin) => {
    if (window.confirm(t('plugins.browse.confirmUninstall', { name: plugin.name }))) {
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

  if (marketplaces.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
          {t('plugins.browse.noMarketplaces')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('plugins.browse.goAddMarketplace')}
        </p>
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
            placeholder={t('plugins.browse.searchPlaceholder')}
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
              <SelectItem value="all">{t('plugins.browse.filters.allMarketplaces')}</SelectItem>
              {marketplaces.map((marketplace) => (
                <SelectItem key={marketplace.id} value={marketplace.id}>
                  {marketplace.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={`${isMobile ? '' : ''} flex items-center space-x-2`}>
          <input
            type="checkbox"
            id="showOnlyInstalled"
            checked={showOnlyInstalled}
            onChange={(e) => setShowOnlyInstalled(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label
            htmlFor="showOnlyInstalled"
            className="text-sm font-medium text-gray-900 dark:text-gray-300 cursor-pointer whitespace-nowrap"
          >
            {t('plugins.browse.filters.showOnlyInstalled')}
          </label>
        </div>
      </div>

      {/* Plugins List */}
      {filteredPlugins.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {t('plugins.browse.noResults')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('plugins.browse.adjustSearch')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlugins.map((plugin) => (
            <div
              key={`${plugin.name}@${plugin.marketplace}`}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {plugin.name}
                    </h3>
                    {plugin.installed && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{t('plugins.browse.card.installed')}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {plugin.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{t('plugins.browse.card.from')} {plugin.marketplace}</span>
                    <span>•</span>
                    <span>{t('plugins.browse.card.version', { version: plugin.version })}</span>
                    {plugin.components.commands > 0 && (
                      <>
                        <span>•</span>
                        <span>{t('plugins.browse.components.commands', { count: plugin.components.commands })}</span>
                      </>
                    )}
                    {plugin.components.skills > 0 && (
                      <>
                        <span>•</span>
                        <span>{t('plugins.browse.components.skills', { count: plugin.components.skills })}</span>
                      </>
                    )}
                    {plugin.components.agents > 0 && (
                      <>
                        <span>•</span>
                        <span>{t('plugins.browse.components.agents', { count: plugin.components.agents })}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPlugin({ marketplace: plugin.marketplaceName, name: plugin.name })}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {t('plugins.browse.actions.details')}
                  </Button>
                  {plugin.installed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUninstall(plugin)}
                      disabled={isUninstalling}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isInstalling}
                      onClick={() => handleInstall(plugin)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t('plugins.browse.actions.install')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plugin Detail Modal */}
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

