let HOST = 'https://agentstudio.cc';

if (import.meta.env.DEV) {
  HOST = 'http://127.0.0.1:4936';
  
} else {
  // 检查localstorage 中是否有设置了 API_BASE
  const host = localStorage.getItem('HOST');
  if (host) {
    HOST = host;
  }
}

const MEDIA_BASE = HOST + '/media';
const API_BASE = HOST + '/api';

export { API_BASE, MEDIA_BASE };