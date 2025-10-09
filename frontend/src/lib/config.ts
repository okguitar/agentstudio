import { loadBackendServices, getCurrentService, saveBackendServices } from '../utils/backendServiceStorage';

// 获取当前选中的后端服务URL
const getCurrentBackendServiceUrl = (): string => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  // 从后端服务配置中获取当前选中的服务
  const backendServices = loadBackendServices();
  const currentService = getCurrentService(backendServices);

  if (currentService) {
    return currentService.url;
  }

  // 开发环境默认配置
  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:4936';
  }

  // 生产环境默认使用本地开发服务器
  return 'http://127.0.0.1:4936';
};

let HOST = getCurrentBackendServiceUrl();

// 监听后端服务变化并更新HOST
if (typeof window !== 'undefined') {
  // 在页面加载时重新获取当前服务
  window.addEventListener('storage', (event) => {
    if (event.key === 'backendServices') {
      HOST = getCurrentBackendServiceUrl();
    }
  });
}

const MEDIA_BASE = HOST + '/media';
const API_BASE = HOST + '/api';

// Helper function to build API URLs
export const buildApiUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE}/${cleanPath}`;
};

// Helper function to get the current HOST setting
export const getCurrentHost = (): string => {
  return HOST;
};

// Helper function to update HOST setting (保持向后兼容性)
export const setHost = (newHost: string): void => {
  // 向后兼容：将旧版HOST设置转换为新的后端服务
  const backendServices = loadBackendServices();
  const currentService = getCurrentService(backendServices);

  if (currentService) {
    // 更新当前服务的URL
    const updatedServices = backendServices.services.map(service =>
      service.id === currentService.id ? { ...service, url: newHost } : service
    );

    saveBackendServices({
      ...backendServices,
      services: updatedServices
    });
  }

  // Force reload to apply new settings
  window.location.reload();
};

// Helper function to check if error is due to API server being unavailable
export const isApiUnavailableError = (error: any): boolean => {
  if (!error) return false;
  
  // Network errors (fetch failed, connection refused, etc.)
  if (error.name === 'TypeError' && error.message?.includes('fetch')) {
    return true;
  }
  
  // Connection timeout or abort errors
  if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
    return true;
  }
  
  // Connection refused or network unreachable
  if (error.message?.includes('ERR_CONNECTION_REFUSED') || 
      error.message?.includes('ERR_NETWORK') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError')) {
    return true;
  }
  
  // HTTP status codes that indicate server unavailable
  if (error.status && (
    error.status === 0 ||      // Network error
    error.status === 502 ||    // Bad Gateway
    error.status === 503 ||    // Service Unavailable
    error.status === 504       // Gateway Timeout
  )) {
    return true;
  }
  
  return false;
};

export { API_BASE, MEDIA_BASE, HOST };