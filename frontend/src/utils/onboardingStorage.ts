/**
 * Onboarding wizard completion tracking utilities
 * Manages completion status for backend onboarding wizard
 */

const BACKEND_ONBOARDING_KEY = 'backend_onboarding_completed';

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

