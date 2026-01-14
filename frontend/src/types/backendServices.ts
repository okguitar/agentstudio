export interface BackendService {
  id: string;
  name: string;
  url: string;
  isDefault?: boolean;
}

export interface BackendServicesState {
  services: BackendService[];
  currentServiceId: string | null;
}

export const DEFAULT_SERVICES: BackendService[] = [
  {
    id: 'default',
    name: '默认服务',
    url: 'http://127.0.0.1:4936',
    isDefault: true
  }
];