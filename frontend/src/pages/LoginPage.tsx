import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useBackendServices } from '../hooks/useBackendServices';
import { Server, ChevronDown, ChevronUp, Settings, Trash2, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { API_BASE } from '../lib/config.js';

export function LoginPage() {
  const { t } = useTranslation('pages');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();
  const {
    services,
    currentService,
    switchService,
    addService,
    updateService,
    removeService
  } = useBackendServices();
  const navigate = useNavigate();
  const location = useLocation();

  const [showServiceManagement, setShowServiceManagement] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name: '', url: '' });
  const [testingService, setTestingService] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'success' | 'error' | 'unknown'>>({});

  const from = (location.state as any)?.from?.pathname || '/';

  const testConnection = async (serviceUrl: string, serviceId?: string) => {
    if (serviceId) {
      setTestingService(serviceId);
    }

    try {
      const testUrl = `${serviceUrl}/api/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      const status = response.ok ? 'success' : 'error';
      if (serviceId) {
        setConnectionStatus(prev => ({ ...prev, [serviceId]: status }));
      }
      return status === 'success';
    } catch (error) {
      if (serviceId) {
        setConnectionStatus(prev => ({ ...prev, [serviceId]: 'error' }));
      }
      return false;
    } finally {
      setTestingService(null);
    }
  };

  const handleSwitchService = (serviceId: string) => {
    switchService(serviceId);
    window.location.reload();
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
    if (newService.name.trim() && newService.url.trim()) {
      updateService(serviceId, {
        name: newService.name.trim(),
        url: newService.url.trim()
      });
      setNewService({ name: '', url: '' });
      setIsEditing(null);
    }
  };

  const handleRemoveService = (serviceId: string) => {
    removeService(serviceId);
  };

  const startEditing = (serviceId: string, serviceName: string, serviceUrl: string) => {
    setIsEditing(serviceId);
    setNewService({ name: serviceName, url: serviceUrl });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const success = await login(password);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('login.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('login.subtitle')}
            </p>

            {/* Current Service Info */}
            {currentService && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                  <Server className="w-4 h-4" />
                  <span className="font-medium">{currentService.name}</span>
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span className="text-xs truncate max-w-40">{currentService.url}</span>
                </div>
              </div>
            )}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('login.passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500
                         transition-colors"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full py-3 px-4 rounded-lg font-medium text-white
                       bg-blue-600 hover:bg-blue-700
                       disabled:bg-gray-400 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       transition-colors"
            >
              {isLoading ? t('login.loggingIn') : t('login.loginButton')}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('login.footer')}
            </p>
          </div>

          {/* Service Management Section */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <button
              onClick={() => setShowServiceManagement(!showServiceManagement)}
              className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <span className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>{t('login.manageServices')}</span>
              </span>
              {showServiceManagement ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showServiceManagement && (
              <div className="mt-4 space-y-3">
                {/* Services List */}
                {services.map(service => (
                  <div
                    key={service.id}
                    className={`p-3 rounded-lg border ${
                      service.id === currentService?.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {isEditing === service.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newService.name}
                          onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                          placeholder={t('login.serviceName')}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <input
                          type="url"
                          value={newService.url}
                          onChange={e => setNewService(prev => ({ ...prev, url: e.target.value }))}
                          placeholder={t('login.serviceUrl')}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateService(service.id)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            {t('login.save')}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(null);
                              setNewService({ name: '', url: '' });
                            }}
                            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            {t('login.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {service.name}
                              </span>
                              {service.id === currentService?.id && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  {t('login.current')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                              {service.url}
                            </p>
                            {/* Connection Status */}
                            <div className="flex items-center space-x-2 mt-2">
                              {testingService === service.id ? (
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              ) : connectionStatus[service.id] === 'success' ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : connectionStatus[service.id] === 'error' ? (
                                <XCircle className="w-3 h-3 text-red-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-gray-400" />
                              )}
                              <button
                                onClick={() => testConnection(service.url, service.id)}
                                disabled={testingService === service.id}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                              >
                                {t('login.testConnection')}
                              </button>
                            </div>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            {service.id !== currentService?.id && (
                              <button
                                onClick={() => handleSwitchService(service.id)}
                                className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                title={t('login.switchTo')}
                              >
                                <Server className="w-3 h-3" />
                              </button>
                            )}
                            {!service.isDefault && (
                              <>
                                <button
                                  onClick={() => startEditing(service.id, service.name, service.url)}
                                  className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                  title={t('login.edit')}
                                >
                                  <Settings className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleRemoveService(service.id)}
                                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                  title={t('login.delete')}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Add Service Form */}
                {isAdding ? (
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 space-y-2">
                    <input
                      type="text"
                      value={newService.name}
                      onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('login.serviceName')}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      autoFocus
                    />
                    <input
                      type="url"
                      value={newService.url}
                      onChange={e => setNewService(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={t('login.serviceUrl')}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddService}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {t('login.add')}
                      </button>
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setNewService({ name: '', url: '' });
                        }}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        {t('login.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center space-x-2 p-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('login.addService')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
