let HOST = 'https://agentstudio.cc';

if (import.meta.env.DEV) {
  HOST = 'http://127.0.0.1:4936';
  
} else {
  // 检查localstorage 中是否有设置了 HOST
  const host = localStorage.getItem('HOST');
  if (host) {
    HOST = host;
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