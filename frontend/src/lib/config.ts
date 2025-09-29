// 获取环境变量中的API基础URL
const getApiBaseFromEnv = (): string => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  // 开发环境默认配置
  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:4936';
  }
  
  // 生产环境默认使用本地开发服务器（可通过localStorage覆盖）
  return 'http://127.0.0.1:4936';
};

let HOST = getApiBaseFromEnv();

// 在生产环境中，允许通过localStorage覆盖HOST设置
if (!import.meta.env.DEV && typeof window !== 'undefined') {
  const savedHost = localStorage.getItem('HOST');
  if (savedHost) {
    HOST = savedHost;
  }
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

// Helper function to update HOST setting
export const setHost = (newHost: string): void => {
  localStorage.setItem('HOST', newHost);
  // Force reload to apply new settings
  window.location.reload();
};

export { API_BASE, MEDIA_BASE, HOST };