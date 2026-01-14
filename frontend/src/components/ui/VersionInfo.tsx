import React, { useState, useEffect } from 'react';
import { getApiBase } from '../../lib/config.js';

interface VersionInfo {
  frontend: string;
  backend?: {
    version: string;
    name: string;
    status: string;
  };
}

interface VersionInfoProps {
  className?: string;
  showIcon?: boolean;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({ 
  className = '', 
  showIcon = true 
}) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    frontend: '0.1.0' // default frontend version
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBackendVersion = async () => {
      try {
        const apiBase = getApiBase();
        const response = await fetch(`${apiBase}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        if (response.ok) {
          const data = await response.json();
          setVersionInfo(prev => ({
            ...prev,
            backend: {
              version: data.version || 'unknown',
              name: data.name || 'backend',
              status: data.status || 'unknown'
            }
          }));
        }
      } catch (error) {
        console.warn('Could not fetch backend version:', error);
        setVersionInfo(prev => ({
          ...prev,
          backend: undefined
        }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBackendVersion(); // Initial check

    // Check every 30 seconds to match Sidebar component
    const interval = setInterval(fetchBackendVersion, 30000);

    return () => clearInterval(interval);
  }, []);

  const getPackageVersion = () => {
    try {
      // Use the version injected by Vite at build time
      return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0';
    } catch {
      return '0.1.0';
    }
  };

  useEffect(() => {
    setVersionInfo(prev => ({
      ...prev,
      frontend: getPackageVersion()
    }));
  }, []);

  if (isLoading) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        {showIcon && <span className="mr-1">ℹ️</span>}
        Loading version...
      </div>
    );
  }

  return (
    <div className={`text-xs text-gray-500 space-y-1 ${className}`}>
      {showIcon && <div className="font-medium mb-1">Version Info</div>}
      <div>
        <span className="font-medium">Frontend:</span> v{versionInfo.frontend}
      </div>
      {versionInfo.backend ? (
        <div>
          <span className="font-medium">Backend:</span> v{versionInfo.backend.version}
          <span className={`ml-2 inline-block w-2 h-2 rounded-full ${
            versionInfo.backend.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
          }`}></span>
        </div>
      ) : (
        <div>
          <span className="font-medium">Backend:</span> 
          <span className="text-red-500 ml-1">disconnected</span>
        </div>
      )}
    </div>
  );
};

export default VersionInfo;