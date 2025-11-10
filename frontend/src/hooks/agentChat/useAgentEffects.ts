import { useEffect } from 'react';
import { tabManager } from '../../utils/tabManager';
import { loadBackendServices, getCurrentService } from '../../utils/backendServiceStorage';

export interface UseAgentEffectsProps {
  currentSessionId: string | null;
  agentId: string;
  setCurrentServiceName: (name: string) => void;
}

export const useAgentEffects = ({
  currentSessionId,
  agentId,
  setCurrentServiceName
}: UseAgentEffectsProps) => {
  
  // Backend service name effect
  useEffect(() => {
    const backendServices = loadBackendServices();
    const currentService = getCurrentService(backendServices);
    if (currentService) {
      setCurrentServiceName(currentService.name);
    }
  }, [setCurrentServiceName]);

  // TabManager smart monitoring effect
  useEffect(() => {
    const cleanup = tabManager.startSmartMonitoring();
    return cleanup;
  }, []);

  // Session wakeup listener effect
  useEffect(() => {
    if (currentSessionId && agentId) {
      const cleanup = tabManager.setupWakeupListener(agentId, currentSessionId);
      return cleanup;
    }
  }, [currentSessionId, agentId]);
};