/**
 * LAVS View Container
 *
 * Dynamically loads and displays LAVS view components for agents.
 * This component:
 * 1. Checks if agent has lavs.json
 * 2. Loads the manifest
 * 3. Loads the view component (local/CDN/npm)
 * 4. Injects LAVSClient
 */

import React, { useEffect, useState, useRef } from 'react';
import { LAVSClient, LAVSManifest, LAVSViewComponent } from '../lavs';
import type { AgentConfig } from '../types';

interface LAVSViewContainerProps {
  agent: AgentConfig;
  projectPath?: string;
}

export const LAVSViewContainer: React.FC<LAVSViewContainerProps> = ({
  agent,
  projectPath,
}) => {
  const [manifest, setManifest] = useState<LAVSManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [componentLoaded, setComponentLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lavsClientRef = useRef<LAVSClient | null>(null);

  // Initialize LAVS client
  useEffect(() => {
    lavsClientRef.current = new LAVSClient({
      agentId: agent.id,
    });
  }, [agent.id]);

  // Load manifest
  useEffect(() => {
    const loadManifest = async () => {
      if (!lavsClientRef.current) return;

      try {
        setLoading(true);
        setError(null);

        const manifestData = await lavsClientRef.current.getManifest();
        setManifest(manifestData);
      } catch (err: any) {
        console.error('[LAVS] Failed to load manifest:', err);
        setError(err.message || 'Failed to load LAVS manifest');
      } finally {
        setLoading(false);
      }
    };

    loadManifest();
  }, [agent.id]);

  // Load view component when manifest is available
  useEffect(() => {
    if (!manifest || !manifest.view || !containerRef.current) return;

    const loadComponent = async () => {
      try {
        const { component } = manifest.view!;

        switch (component.type) {
          case 'local': {
            // For local components, we'll load them as iframe
            // This is a PoC approach - in production, you'd want proper sandboxing
            await loadLocalComponent(component.path);
            break;
          }

          case 'cdn': {
            await loadCDNComponent(component.url, component.exportName);
            break;
          }

          case 'npm': {
            // For npm packages, you'd typically bundle them with your app
            // or use dynamic import if configured in your build system
            console.warn('[LAVS] NPM component loading not yet implemented');
            setError('NPM component loading not yet implemented');
            break;
          }

          case 'inline': {
            // Create component from inline code
            loadInlineComponent(component.code);
            break;
          }

          default:
            throw new Error(`Unknown component type: ${(component as any).type}`);
        }

        setComponentLoaded(true);
      } catch (err: any) {
        console.error('[LAVS] Failed to load component:', err);
        setError(err.message || 'Failed to load view component');
      }
    };

    loadComponent();
  }, [manifest]);

  // Inject LAVS client into component after it's loaded
  useEffect(() => {
    if (!componentLoaded || !containerRef.current || !lavsClientRef.current) return;

    // Find the custom element and inject client
    const customElement = containerRef.current.querySelector('*[data-lavs-component]');
    if (customElement && 'setLAVSClient' in customElement) {
      console.log('[LAVS] Injecting LAVS client into component');
      (customElement as LAVSViewComponent).setLAVSClient(lavsClientRef.current);
    }
  }, [componentLoaded]);

  /**
   * Load local component as iframe
   */
  const loadLocalComponent = async (path: string) => {
    if (!containerRef.current) return;

    // Construct the full URL to the component
    // In development, this will be relative to the agent directory
    const componentURL = `/api/agents/${agent.id}/lavs-view`;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = componentURL;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('data-lavs-component', 'true');

    // Wait for iframe to load
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => {
        // Inject LAVS client into iframe
        if (iframe.contentWindow && lavsClientRef.current) {
          // Create a message handler for cross-frame communication
          const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'lavs-call') {
              // Forward LAVS calls from iframe to client
              lavsClientRef.current!.call(event.data.endpoint, event.data.input)
                .then(result => {
                  iframe.contentWindow!.postMessage({
                    type: 'lavs-result',
                    id: event.data.id,
                    result,
                  }, '*');
                })
                .catch(error => {
                  iframe.contentWindow!.postMessage({
                    type: 'lavs-error',
                    id: event.data.id,
                    error: error.message,
                  }, '*');
                });
            }
          };

          window.addEventListener('message', handleMessage);
          resolve();
        }
      };
      iframe.onerror = reject;
    });

    containerRef.current.appendChild(iframe);
  };

  /**
   * Load component from CDN
   */
  const loadCDNComponent = async (url: string, exportName?: string) => {
    // Load script from CDN
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.type = 'module';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });

    // Component should auto-register as custom element
    // Wait a bit for registration
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  /**
   * Load inline component
   */
  const loadInlineComponent = (code: string) => {
    // Create script element with inline code
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = code;
    document.head.appendChild(script);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading LAVS view...</div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load View
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No manifest (agent doesn't have LAVS)
  if (!manifest) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-md text-center">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No LAVS View
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            This agent doesn't have a custom visualization interface.
          </p>
        </div>
      </div>
    );
  }

  // Render container for component
  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-white dark:bg-gray-900"
      data-lavs-container
    />
  );
};
