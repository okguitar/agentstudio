import { useState } from 'react';

export const useAgentState = () => {
  // Basic component state
  const [inputMessage, setInputMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [isInitializingSession, setIsInitializingSession] = useState(false);
  const [currentServiceName, setCurrentServiceName] = useState<string>('默认服务');

  return {
    // State values
    inputMessage,
    showConfirmDialog,
    confirmMessage,
    confirmAction,
    isStopping,
    isInitializingSession,
    currentServiceName,
    
    // State setters
    setInputMessage,
    setShowConfirmDialog,
    setConfirmMessage,
    setConfirmAction,
    setIsStopping,
    setIsInitializingSession,
    setCurrentServiceName
  };
};