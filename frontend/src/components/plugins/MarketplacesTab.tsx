import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, RefreshCw, Trash2, Github, GitBranch, FolderOpen } from 'lucide-react';
import { PluginMarketplace, MarketplaceAddRequest } from '../../types/plugins';
import { useMobileContext } from '../../contexts/MobileContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AddMarketplaceModal } from './AddMarketplaceModal';

interface MarketplacesTabProps {
  marketplaces: PluginMarketplace[];
  isLoading: boolean;
  onAddMarketplace: (request: MarketplaceAddRequest) => void;
  isAdding: boolean;
  onSyncMarketplace: (id: string) => void;
  isSyncing: boolean;
  onRemoveMarketplace: (id: string) => void;
  isRemoving: boolean;
  onMarketplaceClick?: (marketplaceId: string) => void;
}

export const MarketplacesTab: React.FC<MarketplacesTabProps> = ({
  marketplaces,
  isLoading,
  onAddMarketplace,
  isAdding,
  onSyncMarketplace,
  isSyncing,
  onRemoveMarketplace,
  isRemoving,
  onMarketplaceClick,
}) => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredMarketplaces = marketplaces.filter(marketplace =>
    marketplace.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    marketplace.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(t('plugins.marketplaces.confirmDelete', { name }))) {
      onRemoveMarketplace(id);
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
      {/* Search and Add */}
      <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'} mb-6`}>
        <div className={`${isMobile ? '' : 'flex-1 max-w-md'} relative`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder={t('plugins.marketplaces.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)} className={isMobile ? 'w-full' : ''}>
          <Plus className="w-4 h-4 mr-2" />
          {t('plugins.marketplaces.addButton')}
        </Button>
      </div>

      {/* Marketplaces List */}
      {filteredMarketplaces.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? t('plugins.marketplaces.noResults') : t('plugins.marketplaces.noMarketplaces')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('plugins.marketplaces.addFirst')}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('plugins.marketplaces.addButton')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMarketplaces.map((marketplace) => (
            <div
              key={marketplace.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onMarketplaceClick?.(marketplace.id)}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                      {marketplace.displayName}
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex items-center space-x-1">
                      {marketplace.type === 'github' && <Github className="w-3 h-3" />}
                      {marketplace.type === 'git' && <GitBranch className="w-3 h-3" />}
                      {marketplace.type === 'local' && <FolderOpen className="w-3 h-3" />}
                      <span>{t(`plugins.marketplaces.types.${marketplace.type}`)}</span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {marketplace.source}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{marketplace.pluginCount} plugins</span>
                    {marketplace.lastSync && (
                      <span>Last sync: {new Date(marketplace.lastSync).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSyncMarketplace(marketplace.id)}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(marketplace.id, marketplace.displayName)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Marketplace Modal */}
      <AddMarketplaceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={onAddMarketplace}
        isAdding={isAdding}
      />
    </div>
  );
};

