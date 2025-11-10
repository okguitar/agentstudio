import { useState, useCallback } from 'react';

export interface UseUIStateReturn {
  // Dialog states
  showSessions: boolean;
  showConfirmDialog: boolean;
  showMobileSettings: boolean;
  showMcpStatusModal: boolean;
  confirmMessage: string;
  confirmAction: (() => void) | null;

  // Search state
  searchTerm: string;

  // Generation control state
  isStopping: boolean;
  isInitializingSession: boolean;

  // Setters
  setShowSessions: (show: boolean) => void;
  setShowConfirmDialog: (show: boolean) => void;
  setShowMobileSettings: (show: boolean) => void;
  setShowMcpStatusModal: (show: boolean) => void;
  setConfirmMessage: (message: string) => void;
  setConfirmAction: (action: (() => void) | null) => void;
  setSearchTerm: (term: string) => void;
  setIsStopping: (stopping: boolean) => void;
  setIsInitializingSession: (init: boolean) => void;

  // Handlers
  handleConfirmDialog: () => void;
  handleCancelDialog: () => void;
}

/**
 * Hook for managing UI state (dialogs, modals, etc.)
 * Centralizes all UI-related state management
 */
export const useUIState = (): UseUIStateReturn => {
  // Dialog states
  const [showSessions, setShowSessions] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showMcpStatusModal, setShowMcpStatusModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Generation control state
  const [isStopping, setIsStopping] = useState(false);
  const [isInitializingSession, setIsInitializingSession] = useState(false);

  /**
   * Execute the confirm action and close dialog
   */
  const handleConfirmDialog = useCallback(() => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmDialog(false);
    setConfirmMessage('');
    setConfirmAction(null);
  }, [confirmAction]);

  /**
   * Cancel and close the confirm dialog
   */
  const handleCancelDialog = useCallback(() => {
    setShowConfirmDialog(false);
    setConfirmMessage('');
    setConfirmAction(null);
  }, []);

  return {
    // States
    showSessions,
    showConfirmDialog,
    showMobileSettings,
    showMcpStatusModal,
    confirmMessage,
    confirmAction,
    searchTerm,
    isStopping,
    isInitializingSession,

    // Setters
    setShowSessions,
    setShowConfirmDialog,
    setShowMobileSettings,
    setShowMcpStatusModal,
    setConfirmMessage,
    setConfirmAction,
    setSearchTerm,
    setIsStopping,
    setIsInitializingSession,

    // Handlers
    handleConfirmDialog,
    handleCancelDialog
  };
};
