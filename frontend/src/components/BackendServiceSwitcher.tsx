import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Server, Check, Plus, Settings, Trash2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BackendService } from '../types/backendServices';
import { useBackendServices } from '../hooks/useBackendServices';
import { API_BASE } from '../lib/config.js';

interface BackendServiceSwitcherProps {
  className?: string;
}

export const BackendServiceSwitcher: React.FC<BackendServiceSwitcherProps> = ({ className = '' }) => {
  const { t } = useTranslation('components');
  const {
    services,
    currentService,
    switchService,
    addService,
    updateService,
    removeService
  } = useBackendServices();

  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name: '', url: '' });
  const [showWarning, setShowWarning] = useState(false);
  const [pendingService, setPendingService] = useState<BackendService | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setIsEditing(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const testConnection = async (serviceUrl: string): Promise<boolean> => {
    setIsTesting(true);
    try {
      const testUrl = `${serviceUrl}/api/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch (error) {
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleSwitchService = async (service: BackendService) => {
    // Test connection first
    const isConnected = await testConnection(service.url);

    if (!isConnected) {
      // Show warning dialog
      setPendingService(service);
      setShowWarning(true);
    } else {
      // Connection successful, switch immediately
      switchService(service.id);
      setIsOpen(false);
      // Reload to apply new service - user won't need to re-login as token is stored per service
      window.location.reload();
    }
  };

  const confirmSwitch = () => {
    if (pendingService) {
      switchService(pendingService.id);
      setShowWarning(false);
      setPendingService(null);
      setIsOpen(false);
      // Reload to apply new service - user won't need to re-login as token is stored per service
      window.location.reload();
    }
  };

  const cancelSwitch = () => {
    setShowWarning(false);
    setPendingService(null);
  };

  const handleAddService = () => {
    if (newService.name.trim() && newService.url.trim()) {
      addService({
        name: newService.name.trim(),
        url: newService.url.trim()
      });
      setNewService({ name: '', url: '' });
      setIsAdding(false);
    }
  };

  const handleUpdateService = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service && newService.name.trim() && newService.url.trim()) {
      updateService(serviceId, {
        name: newService.name.trim(),
        url: newService.url.trim()
      });
      setNewService({ name: '', url: '' });
      setIsEditing(null);
    }
  };

  const handleRemoveService = (serviceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeService(serviceId);
  };

  const startEditing = (service: BackendService, event: React.MouseEvent) => {
    event.stopPropagation();
    setIsEditing(service.id);
    setNewService({ name: service.name, url: service.url });
  };

  const cancelEditing = () => {
    setIsEditing(null);
    setNewService({ name: '', url: '' });
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewService({ name: '', url: '' });
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Current Service Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300
                 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors
                 border border-gray-200 dark:border-gray-600"
      >
        <Server className="w-4 h-4" />
        <span className="font-medium truncate max-w-32">
          {currentService?.name || t('backendServiceSwitcher.noService')}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-800
                      rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {t('backendServiceSwitcher.title')}
            </h3>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Service List */}
            {services.map(service => (
              <div
                key={service.id}
                className={`flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700
                         cursor-pointer transition-colors ${
                           service.id === currentService?.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                         }`}
                onClick={() => handleSwitchService(service)}
              >
                {isEditing === service.id ? (
                  <div className="flex-1 space-y-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={newService.name}
                      onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('backendServiceSwitcher.namePlaceholder')}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600
                               rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      autoFocus
                    />
                    <input
                      type="url"
                      value={newService.url}
                      onChange={e => setNewService(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={t('backendServiceSwitcher.urlPlaceholder')}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600
                               rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateService(service.id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {t('backendServiceSwitcher.save')}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        {t('backendServiceSwitcher.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-3 flex-1">
                      {service.id === currentService?.id && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {service.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {service.url}
                        </div>
                      </div>
                    </div>
                    {!service.isDefault && (
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => startEditing(service, e)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title={t('backendServiceSwitcher.edit')}
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleRemoveService(service.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title={t('backendServiceSwitcher.delete')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Add Service Form */}
            {isAdding ? (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newService.name}
                    onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('backendServiceSwitcher.namePlaceholder')}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600
                             rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  />
                  <input
                    type="url"
                    value={newService.url}
                    onChange={e => setNewService(prev => ({ ...prev, url: e.target.value }))}
                    placeholder={t('backendServiceSwitcher.urlPlaceholder')}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600
                             rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddService}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {t('backendServiceSwitcher.add')}
                    </button>
                    <button
                      onClick={cancelAdding}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      {t('backendServiceSwitcher.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center space-x-2 p-3 text-sm text-gray-600 dark:text-gray-300
                         hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
              >
                <Plus className="w-4 h-4" />
                <span>{t('backendServiceSwitcher.addNew')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warning Dialog */}
      {showWarning && pendingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('backendServiceSwitcher.connectionWarning.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {t('backendServiceSwitcher.connectionWarning.message', {
                    name: pendingService.name,
                    url: pendingService.url
                  })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('backendServiceSwitcher.connectionWarning.consequence')}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelSwitch}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                {t('backendServiceSwitcher.connectionWarning.cancel')}
              </button>
              <button
                onClick={confirmSwitch}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md"
              >
                {t('backendServiceSwitcher.connectionWarning.continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Testing Overlay */}
      {isTesting && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[99]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('backendServiceSwitcher.testingConnection')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};