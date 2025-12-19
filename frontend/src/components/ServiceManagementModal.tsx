import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Plus,
  Settings,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
  TestTube,
  Save,
  CheckCircle,
  XCircle,
  LogOut
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BackendService } from '../types/backendServices';
import { useBackendServices } from '../hooks/useBackendServices';
import { useAuth } from '../hooks/useAuth';
import { showSuccess, showError } from '../utils/toast';

interface ServiceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceWithStatus extends BackendService {
  isOnline?: boolean;
  version?: string;
  backendName?: string;
  isTesting?: boolean;
}

export const ServiceManagementModal: React.FC<ServiceManagementModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { t } = useTranslation('components');
  const {
    services,
    currentService,
    switchService,
    addService,
    updateService,
    removeService
  } = useBackendServices();
  const { logout, isAuthenticated } = useAuth();

  const [servicesWithStatus, setServicesWithStatus] = useState<ServiceWithStatus[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name: '', url: '' });
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [pendingService, setPendingService] = useState<ServiceWithStatus | null>(null);

  // Update services with status information
  const updateServicesStatus = async () => {
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        try {
          const testUrl = `${service.url}/api/health`;
          const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const data = await response.json();
            return {
              ...service,
              isOnline: true,
              version: data.version,
              backendName: data.name,
              isTesting: false
            };
          } else {
            return {
              ...service,
              isOnline: false,
              isTesting: false
            };
          }
        } catch (error) {
          return {
            ...service,
            isOnline: false,
            isTesting: false
          };
        }
      })
    );

    setServicesWithStatus(updatedServices);
  };

  // Test connection for a specific service
  const testServiceConnection = async (serviceId: string) => {
    setServicesWithStatus(prev => 
      prev.map(s => s.id === serviceId ? { ...s, isTesting: true } : s)
    );

    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      const testUrl = `${service.url}/api/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        setServicesWithStatus(prev => 
          prev.map(s => s.id === serviceId ? {
            ...s,
            isOnline: true,
            version: data.version,
            backendName: data.name,
            isTesting: false
          } : s)
        );
        showSuccess(t('serviceManagementModal.connectionTest.success'));
      } else {
        setServicesWithStatus(prev => 
          prev.map(s => s.id === serviceId ? {
            ...s,
            isOnline: false,
            isTesting: false
          } : s)
        );
        showError(t('serviceManagementModal.connectionTest.failed'));
      }
    } catch (error) {
      setServicesWithStatus(prev => 
        prev.map(s => s.id === serviceId ? {
          ...s,
          isOnline: false,
          isTesting: false
        } : s)
      );
      showError(t('serviceManagementModal.connectionTest.error'));
    }
  };

  // Initialize services with status
  useEffect(() => {
    if (isOpen) {
      updateServicesStatus();
    }
  }, [isOpen, services]);

  const handleSwitchService = async (service: ServiceWithStatus) => {
    if (!service.isOnline) {
      setPendingService(service);
      setShowSwitchWarning(true);
    } else {
      switchService(service.id);
      showSuccess(t('serviceManagementModal.switchSuccess', { name: service.name }));
      window.location.reload();
    }
  };

  const confirmSwitch = () => {
    if (pendingService) {
      switchService(pendingService.id);
      setShowSwitchWarning(false);
      setPendingService(null);
      showSuccess(t('serviceManagementModal.switchSuccess', { name: pendingService.name }));
      window.location.reload();
    }
  };

  const handleAddService = () => {
    if (newService.name.trim() && newService.url.trim()) {
      addService({
        name: newService.name.trim(),
        url: newService.url.trim()
      });
      setNewService({ name: '', url: '' });
      setIsAddingService(false);
      showSuccess(t('serviceManagementModal.addSuccess'));
    }
  };

  const handleUpdateService = () => {
    if (editingServiceId && newService.name.trim() && newService.url.trim()) {
      updateService(editingServiceId, {
        name: newService.name.trim(),
        url: newService.url.trim()
      });
      setNewService({ name: '', url: '' });
      setEditingServiceId(null);
      showSuccess(t('serviceManagementModal.updateSuccess'));
    }
  };

  const handleRemoveService = (serviceId: string) => {
    removeService(serviceId);
    showSuccess(t('serviceManagementModal.removeSuccess'));
  };

  const handleLogout = async () => {
    await logout();
    showSuccess(t('serviceManagementModal.logoutSuccess'));
    onClose();
    // Redirect to login page
    window.location.href = '/login';
  };

  const startEditingService = (service: ServiceWithStatus) => {
    setEditingServiceId(service.id);
    setNewService({ name: service.name, url: service.url });
  };

  const cancelEditing = () => {
    setEditingServiceId(null);
    setNewService({ name: '', url: '' });
  };

  const cancelAdding = () => {
    setIsAddingService(false);
    setNewService({ name: '', url: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Server className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('serviceManagementModal.title')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Services List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('serviceManagementModal.servicesList')}
              </h4>
              <button
                onClick={() => setIsAddingService(true)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 
                         text-white text-sm rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('serviceManagementModal.addService')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {servicesWithStatus.map(service => (
                <div
                  key={service.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    service.id === currentService?.id
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {editingServiceId === service.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newService.name}
                        onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('serviceManagementModal.namePlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                                 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="url"
                        value={newService.url}
                        onChange={e => setNewService(prev => ({ ...prev, url: e.target.value }))}
                        placeholder={t('serviceManagementModal.urlPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                                 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleUpdateService}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 
                                   text-white text-sm rounded-md transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          <span>{t('serviceManagementModal.save')}</span>
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm 
                                   rounded-md transition-colors"
                        >
                          {t('serviceManagementModal.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                            {service.name}
                          </h5>
                          {service.id === currentService?.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs 
                                           font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {t('serviceManagementModal.current')}
                            </span>
                          )}
                          <div className="flex items-center space-x-1">
                            {service.isTesting ? (
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : service.isOnline ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {service.url}
                        </p>
                        {service.isOnline && (
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                            {service.version && (
                              <span>{t('serviceManagementModal.version')}: v{service.version}</span>
                            )}
                            {service.backendName && (
                              <span>{service.backendName}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => testServiceConnection(service.id)}
                          disabled={service.isTesting}
                          className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 
                                   hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title={t('serviceManagementModal.testConnection')}
                        >
                          <TestTube className="w-4 h-4" />
                        </button>
                        
                        {service.id !== currentService?.id && (
                          <button
                            onClick={() => handleSwitchService(service)}
                            className="p-1.5 text-gray-500 hover:text-green-600 dark:hover:text-green-400 
                                     hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title={t('serviceManagementModal.switchToService')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}

                        {!service.isDefault && (
                          <>
                            <button
                              onClick={() => startEditingService(service)}
                              className="p-1.5 text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 
                                       hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                              title={t('serviceManagementModal.editService')}
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveService(service.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 
                                       hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title={t('serviceManagementModal.removeService')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add New Service Form */}
              {isAddingService && (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('serviceManagementModal.addNewService')}
                    </h5>
                    <input
                      type="text"
                      value={newService.name}
                      onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('serviceManagementModal.namePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                               rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="url"
                      value={newService.url}
                      onChange={e => setNewService(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={t('serviceManagementModal.urlPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                               rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddService}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 
                                 text-white text-sm rounded-md transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{t('serviceManagementModal.add')}</span>
                      </button>
                      <button
                        onClick={cancelAdding}
                        className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm 
                                 rounded-md transition-colors"
                      >
                        {t('serviceManagementModal.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={updateServicesStatus}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 
                           dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 
                           text-sm rounded-md transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('serviceManagementModal.refreshStatus')}</span>
                </button>

                {/* Logout Button */}
                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 
                             dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 
                             text-sm rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('serviceManagementModal.logout')}</span>
                  </button>
                )}
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                {servicesWithStatus.filter(s => s.isOnline).length} {t('serviceManagementModal.servicesOnline')} / {servicesWithStatus.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Switch Warning Modal */}
      {showSwitchWarning && pendingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('serviceManagementModal.switchWarning.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {t('serviceManagementModal.switchWarning.message', {
                    name: pendingService.name,
                    url: pendingService.url
                  })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('serviceManagementModal.switchWarning.consequence')}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSwitchWarning(false);
                  setPendingService(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                {t('serviceManagementModal.switchWarning.cancel')}
              </button>
              <button
                onClick={confirmSwitch}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md"
              >
                {t('serviceManagementModal.switchWarning.continue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};