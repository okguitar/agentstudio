import React, { useState, useEffect, useRef } from 'react';
import { Server, Settings, CheckCircle, XCircle, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBackendServices } from '../hooks/useBackendServices';
import { getApiBase } from '../lib/config';

interface ServiceStatusIndicatorProps {
  className?: string;
  onManageServices?: () => void;
}

interface ServiceStatus {
  isConnected: boolean;
  isLoading: boolean;
  version?: string;
  name?: string;
}

interface ServiceWithStatus {
  id: string;
  name: string;
  url: string;
  isOnline?: boolean;
  isCurrent?: boolean;
  isDefault?: boolean;
}

export const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({ 
  className = '', 
  onManageServices 
}) => {
  const { t } = useTranslation('components');
  const { services, currentService, switchService } = useBackendServices();
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    isConnected: false,
    isLoading: true
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);
  const [servicesWithStatus, setServicesWithStatus] = useState<ServiceWithStatus[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check service health
  const checkServiceHealth = async () => {
    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        setServiceStatus({
          isConnected: true,
          isLoading: false,
          version: data.version,
          name: data.name
        });
      } else {
        setServiceStatus({
          isConnected: false,
          isLoading: false
        });
      }
    } catch (error) {
      setServiceStatus({
        isConnected: false,
        isLoading: false
      });
    }
  };

  // Check all services status for quick switch
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
            signal: AbortSignal.timeout(3000)
          });

          return {
            ...service,
            isOnline: response.ok,
            isCurrent: service.id === currentService?.id
          };
        } catch (error) {
          return {
            ...service,
            isOnline: false,
            isCurrent: service.id === currentService?.id
          };
        }
      })
    );

    setServicesWithStatus(updatedServices);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowQuickSwitch(false);
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial checks and periodic updates
  useEffect(() => {
    checkServiceHealth(); // Check current service
    updateServicesStatus(); // Update all services for quick switch

    // Check every 30 seconds
    const interval = setInterval(() => {
      checkServiceHealth();
      updateServicesStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [services, currentService]);

  const handleQuickSwitch = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service && service.id !== currentService?.id) {
      // Test connection before switching
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
          switchService(service.id);
          setShowQuickSwitch(false);
          window.location.reload();
        }
      } catch (error) {
        // If connection fails, still allow switching but show warning
        switchService(service.id);
        setShowQuickSwitch(false);
        window.location.reload();
      }
    }
  };

  const getStatusIcon = () => {
    if (serviceStatus.isLoading) {
      return <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />;
    }

    if (serviceStatus.isConnected) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }

    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (serviceStatus.isLoading) {
      return t('serviceStatusIndicator.checking');
    }

    if (serviceStatus.isConnected) {
      return currentService?.name || t('serviceStatusIndicator.connected');
    }

    return currentService?.name || t('serviceStatusIndicator.disconnected');
  };

  const getStatusColor = () => {
    if (serviceStatus.isLoading) {
      return 'text-gray-500';
    }

    if (serviceStatus.isConnected) {
      return 'text-green-600 dark:text-green-400';
    }

    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div className="flex items-center justify-between w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-md">
        {/* Status Display */}
        <div 
          className="flex items-center space-x-2 flex-1"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Server className="w-4 h-4 text-gray-500" />
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            <span className={`font-medium text-sm truncate ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {getStatusIcon()}
          </div>
        </div>

        {/* Switch Button */}
        <button
          onClick={() => setShowQuickSwitch(!showQuickSwitch)}
          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 
                   hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
          title={t('serviceStatusIndicator.quickSwitch')}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onManageServices?.();
          }}
          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 
                   hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
          title={t('serviceStatusIndicator.manageServices')}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Switch Dropdown */}
      {showQuickSwitch && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1 mb-1">
              {t('serviceStatusIndicator.quickSwitch')}
            </div>
            {servicesWithStatus.map(service => (
              <button
                key={service.id}
                onClick={() => handleQuickSwitch(service.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors ${
                  service.isCurrent 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span className="truncate">{service.name}</span>
                  {service.isCurrent && (
                    <CheckCircle className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {service.isOnline !== undefined && (
                    service.isOnline ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && !showQuickSwitch && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-900 dark:bg-gray-100 
                      text-white dark:text-gray-900 text-xs rounded-lg shadow-lg z-50 w-64">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{currentService?.name || 'Unknown Service'}</span>
              {getStatusIcon()}
            </div>
            
            {currentService?.url && (
              <div className="text-gray-300 dark:text-gray-600 break-all">
                {currentService.url}
              </div>
            )}

            {serviceStatus.version && (
              <div className="flex justify-between">
                <span>{t('serviceStatusIndicator.version')}:</span>
                <span>v{serviceStatus.version}</span>
              </div>
            )}

            {serviceStatus.name && (
              <div className="flex justify-between">
                <span>{t('serviceStatusIndicator.backendName')}:</span>
                <span>{serviceStatus.name}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>{t('serviceStatusIndicator.status')}:</span>
              <span className={serviceStatus.isConnected ? 'text-green-400 dark:text-green-600' : 'text-red-400 dark:text-red-600'}>
                {serviceStatus.isConnected 
                  ? t('serviceStatusIndicator.connected') 
                  : t('serviceStatusIndicator.disconnected')
                }
              </span>
            </div>

            <div className="text-gray-400 dark:text-gray-500 text-xs pt-1 border-t border-gray-700 dark:border-gray-300 space-y-1">
              <div>{t('serviceStatusIndicator.clickToSwitch')}</div>
              <div>{t('serviceStatusIndicator.clickToManage')}</div>
            </div>
          </div>
          
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 
                        border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
        </div>
      )}
    </div>
  );
};