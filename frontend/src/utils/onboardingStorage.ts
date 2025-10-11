/**
 * Onboarding wizard completion tracking utilities
 * Manages completion status for both backend and Claude version setup wizards
 */

const BACKEND_ONBOARDING_KEY = 'backend_onboarding_completed';
const CLAUDE_SETUP_KEY = 'claude_setup_completed';

// Backend Onboarding Status
export interface BackendOnboardingStatus {
  completed: boolean;
  completedAt?: number;
  skipped?: boolean;
}

export const getBackendOnboardingStatus = (): BackendOnboardingStatus => {
  try {
    const data = localStorage.getItem(BACKEND_ONBOARDING_KEY);
    if (!data) {
      return { completed: false };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read backend onboarding status:', error);
    return { completed: false };
  }
};

export const setBackendOnboardingCompleted = (skipped: boolean = false): void => {
  const status: BackendOnboardingStatus = {
    completed: true,
    completedAt: Date.now(),
    skipped
  };
  localStorage.setItem(BACKEND_ONBOARDING_KEY, JSON.stringify(status));
};

export const resetBackendOnboarding = (): void => {
  localStorage.removeItem(BACKEND_ONBOARDING_KEY);
};

// Claude Setup Status (per backend service)
export interface ClaudeSetupStatus {
  [backendId: string]: {
    completed: boolean;
    completedAt?: number;
    skipped?: boolean;
  };
}

export const getClaudeSetupStatus = (backendId: string): boolean => {
  try {
    const data = localStorage.getItem(CLAUDE_SETUP_KEY);
    if (!data) {
      return false;
    }
    const allStatus: ClaudeSetupStatus = JSON.parse(data);
    return allStatus[backendId]?.completed || false;
  } catch (error) {
    console.error('Failed to read Claude setup status:', error);
    return false;
  }
};

export const setClaudeSetupCompleted = (backendId: string, skipped: boolean = false): void => {
  try {
    const data = localStorage.getItem(CLAUDE_SETUP_KEY);
    const allStatus: ClaudeSetupStatus = data ? JSON.parse(data) : {};

    allStatus[backendId] = {
      completed: true,
      completedAt: Date.now(),
      skipped
    };

    localStorage.setItem(CLAUDE_SETUP_KEY, JSON.stringify(allStatus));
  } catch (error) {
    console.error('Failed to save Claude setup status:', error);
  }
};

export const resetClaudeSetup = (backendId?: string): void => {
  if (!backendId) {
    // Reset all
    localStorage.removeItem(CLAUDE_SETUP_KEY);
    return;
  }

  try {
    const data = localStorage.getItem(CLAUDE_SETUP_KEY);
    if (!data) return;

    const allStatus: ClaudeSetupStatus = JSON.parse(data);
    delete allStatus[backendId];
    localStorage.setItem(CLAUDE_SETUP_KEY, JSON.stringify(allStatus));
  } catch (error) {
    console.error('Failed to reset Claude setup status:', error);
  }
};
