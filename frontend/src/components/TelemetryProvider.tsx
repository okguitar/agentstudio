/**
 * TelemetryProvider
 * 
 * Wraps the app to initialize PostHog for anonymous telemetry.
 * - Default: enabled (anonymous data collection)
 * - Can be disabled via settings
 */

import React, { useEffect, useState } from 'react';
import posthog from 'posthog-js';

// PostHog configuration (hardcoded for distribution)
const POSTHOG_API_KEY = 'phc_5knpC9zvXXFaTJw4EMwrRBSYHIYW7b8ig6E14N8jYDp';
const POSTHOG_HOST = 'https://app.posthog.com';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.2.0';

// Storage key for telemetry settings
const TELEMETRY_STORAGE_KEY = 'agentstudio_telemetry_enabled';

interface TelemetryProviderProps {
  children: React.ReactNode;
}

/**
 * Check if telemetry is enabled
 * Default: true (opt-out model for frontend)
 */
export function isTelemetryEnabled(): boolean {
  if (!POSTHOG_API_KEY) {
    return false;
  }
  const stored = localStorage.getItem(TELEMETRY_STORAGE_KEY);
  return stored !== 'false';
}

/**
 * Set telemetry enabled/disabled
 */
export function setTelemetryEnabled(enabled: boolean): void {
  localStorage.setItem(TELEMETRY_STORAGE_KEY, enabled ? 'true' : 'false');
  if (enabled) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

/**
 * Track a feature usage event
 */
export function trackFeature(feature: string, action?: string, properties?: Record<string, string | number | boolean>): void {
  if (!isTelemetryEnabled()) return;
  posthog.capture('feature_used', {
    feature,
    action: action || 'use',
    ...properties,
  });
}

/**
 * Track an error
 */
export function trackError(error: Error, component?: string): void {
  if (!isTelemetryEnabled()) return;
  
  // Sanitize error message and stack
  const sanitizeMessage = (msg: string) => {
    return msg
      .replace(/(?:\/[^\s:]+)+/g, '[PATH]')
      .replace(/(?:[A-Za-z]:\\[^\s:]+)+/g, '[PATH]')
      .replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]')
      .substring(0, 256);
  };
  
  posthog.capture('app_error', {
    message: sanitizeMessage(error.message),
    errorType: error.name,
    component: component || 'unknown',
  });
}

export const TelemetryProvider: React.FC<TelemetryProviderProps> = ({ children }) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only initialize if API key is configured
    if (!POSTHOG_API_KEY) {
      console.log('[Telemetry] PostHog API key not configured, telemetry disabled');
      setInitialized(true);
      return;
    }

    // Initialize PostHog
    posthog.init(POSTHOG_API_KEY, {
      api_host: POSTHOG_HOST,
      persistence: 'localStorage',
      autocapture: false, // We'll manually track events
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true,
      loaded: (ph) => {
        // Set super properties for all events
        ph.register({
          platform: 'frontend',
          app_version: APP_VERSION,
        });

        // Check if user has opted out
        if (!isTelemetryEnabled()) {
          ph.opt_out_capturing();
        }

        console.log('[Telemetry] PostHog initialized');
        setInitialized(true);

        // Track app start
        ph.capture('app_start', {
          platform: 'frontend',
          app_version: APP_VERSION,
        });
      },
    });

    // Cleanup
    return () => {
      // PostHog doesn't need explicit cleanup
    };
  }, []);

  // Set up global error handler
  useEffect(() => {
    if (!initialized) return;

    const handleError = (event: ErrorEvent) => {
      trackError(event.error || new Error(event.message), 'global');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      trackError(error, 'unhandledRejection');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [initialized]);

  return <>{children}</>;
};

export default TelemetryProvider;
