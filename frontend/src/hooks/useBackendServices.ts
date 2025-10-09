import { useState, useEffect } from 'react';
import { BackendService, BackendServicesState } from '../types/backendServices';
import {
  loadBackendServices,
  saveBackendServices,
  getCurrentService,
  addBackendService,
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

  const currentService = getCurrentService(state);

  const addService = (service: Omit<BackendService, 'id'>) => {
    setState(prev => addBackendService(prev, service));
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