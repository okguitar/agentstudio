import { useState, useEffect, useMemo } from 'react';
import { BackendService, BackendServicesState } from '../types/backendServices';
import {
  loadBackendServices,
  saveBackendServices,
  getCurrentService,
  updateBackendService,
  removeBackendService,
  switchBackendService
} from '../utils/backendServiceStorage';

export const useBackendServices = () => {
  const [state, setState] = useState<BackendServicesState>(loadBackendServices());

  // Update localStorage when state changes
  useEffect(() => {
    saveBackendServices(state);
  }, [state]);

  // Memoize currentService to avoid unnecessary re-renders
  const currentService = useMemo(() => getCurrentService(state), [state.currentServiceId, state.services]);

  const addService = (service: Omit<BackendService, 'id'>): BackendService => {
    const newService: BackendService = {
      ...service,
      id: Date.now().toString()
    };

    setState(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));

    return newService;
  };

  const updateService = (serviceId: string, updates: Partial<BackendService>) => {
    setState(prev => updateBackendService(prev, serviceId, updates));
  };

  const removeService = (serviceId: string) => {
    setState(prev => removeBackendService(prev, serviceId));
  };

  const switchService = (serviceId: string) => {
    setState(prev => switchBackendService(prev, serviceId));
  };

  return {
    services: state.services,
    currentService,
    currentServiceId: state.currentServiceId,
    addService,
    updateService,
    removeService,
    switchService
  };
};