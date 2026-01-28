import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { useBackendServices } from '../hooks/useBackendServices';
import { setBackendOnboardingCompleted } from '../utils/onboardingStorage';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { BackendDetectingStep } from './onboarding/BackendDetectingStep';
import { BackendFoundStep } from './onboarding/BackendFoundStep';
import { BackendNotFoundStep } from './onboarding/BackendNotFoundStep';
import { OnboardingCompleteStep } from './onboarding/OnboardingCompleteStep';

type Step = 'welcome' | 'detecting' | 'found' | 'not-found' | 'add-service' | 'complete';

interface BackendOnboardingWizardProps {
  onComplete: () => void;
}

export const BackendOnboardingWizard: React.FC<BackendOnboardingWizardProps> = ({ onComplete }) => {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const { services, addService, switchService } = useBackendServices();
  const [step, setStep] = useState<Step>('welcome');
  const [detectedService, setDetectedService] = useState<{ name: string; url: string } | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Step 2: Auto-detect local backend after welcome
  useEffect(() => {
    if (step === 'detecting') {
      detectLocalBackend();
    }
  }, [step]);

  const detectLocalBackend = async () => {
    // Get current port from window location
    // If we're on default frontend dev ports (3000, 5173, etc.), use 4936
    // Otherwise, use the current port (assuming backend is on same port)
    const currentPort = window.location.port;
    const frontendDevPorts = ['3000', '5173', '5174', '8080'];
    const backendPort = currentPort && !frontendDevPorts.includes(currentPort) ? currentPort : '4936';
    
    const candidateUrls = [
      `http://127.0.0.1:${backendPort}`,
      `http://localhost:${backendPort}`
    ];

    for (const url of candidateUrls) {
      try {
        const response = await fetch(`${url}/api/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          setDetectedService({ name: 'Local Development Server', url });
          setStep('found');
          return;
        }
      } catch (error) {
        // Continue to next URL
      }
    }

    // No local service found
    setStep('not-found');
  };

  const handleUseDetectedService = () => {
    if (!detectedService) return;

    // Add service if not exists
    const existingService = services.find(s => s.url === detectedService.url);
    if (!existingService) {
      const newService = addService({
        name: detectedService.name,
        url: detectedService.url
      });
      switchService(newService.id);
    } else {
      switchService(existingService.id);
    }

    // Mark as completed
    setBackendOnboardingCompleted(false);
    setStep('complete');
  };

  const handleAddOtherService = () => {
    setStep('add-service');
  };

  const handleRetryDetection = () => {
    setStep('detecting');
  };

  const handleBackToFound = () => {
    setStep('found');
  };

  const handleAddRemoteService = async (name: string, url: string): Promise<boolean> => {
    try {
      const newService = addService({ name, url });
      switchService(newService.id);
      setDetectedService({ name, url });
      setBackendOnboardingCompleted(false);
      setStep('complete');
      return true;
    } catch (error) {
      console.error('Failed to add remote service:', error);
      return false;
    }
  };

  const handleSkipConfirm = () => {
    setShowSkipConfirm(true);
  };

  const handleSkipCancel = () => {
    setShowSkipConfirm(false);
  };

  const handleSkipProceed = () => {
    setBackendOnboardingCompleted(true);
    onComplete();
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleManageServices = () => {
    // Close wizard and navigate to login page
    onComplete();
    navigate('/login');
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeStep onNext={() => setStep('detecting')} onSkip={handleSkipConfirm} />;

      case 'detecting':
        return <BackendDetectingStep />;

      case 'found':
        return detectedService ? (
          <BackendFoundStep
            serviceUrl={detectedService.url}
            onUseService={handleUseDetectedService}
            onAddOther={handleAddOtherService}
          />
        ) : null;

      case 'not-found':
        return (
          <BackendNotFoundStep
            onRetry={handleRetryDetection}
            onAddRemote={handleAddRemoteService}
            showWarning={true}
          />
        );

      case 'add-service':
        return (
          <BackendNotFoundStep
            onAddRemote={handleAddRemoteService}
            onBack={handleBackToFound}
            showWarning={false}
          />
        );

      case 'complete':
        return detectedService ? (
          <OnboardingCompleteStep
            serviceName={detectedService.name}
            serviceUrl={detectedService.url}
            onGoToLogin={handleComplete}
            onManageServices={handleManageServices}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <>
      {/* Main Wizard Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Close button - only show on welcome step */}
          {step === 'welcome' && (
            <button
              onClick={handleSkipConfirm}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {renderStep()}
        </div>
      </div>

      {/* Skip Confirmation Modal */}
      {showSkipConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full">
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('backend.skipConfirm.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('backend.skipConfirm.warning')}
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-3 list-disc list-inside">
                  <li>{t('backend.skipConfirm.consequences.noAi')}</li>
                  <li>{t('backend.skipConfirm.consequences.noStorage')}</li>
                  <li>{t('backend.skipConfirm.consequences.noFeatures')}</li>
                </ul>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('backend.skipConfirm.reconfigure')}
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>{t('backend.skipConfirm.locations.loginPage')}</li>
                  <li>{t('backend.skipConfirm.locations.settingsPage')}</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSkipCancel}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('backend.skipConfirm.back')}
              </button>
              <button
                onClick={handleSkipProceed}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('backend.skipConfirm.skip')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
