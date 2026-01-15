/**
 * LAVS Client SDK
 *
 * Client library for calling LAVS endpoints from frontend applications.
 */

import { LAVSManifest, LAVSError } from './types';

/**
 * LAVS Client configuration
 */
export interface LAVSClientOptions {
  agentId: string;
  baseURL?: string; // Default: window.location.origin
}

/**
 * LAVS Client for calling agent endpoints
 */
export class LAVSClient {
  private agentId: string;
  private baseURL: string;
  private manifest: LAVSManifest | null = null;

  constructor(options: LAVSClientOptions) {
    this.agentId = options.agentId;
    this.baseURL = options.baseURL || window.location.origin;
  }

  /**
   * Get auth token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Get LAVS manifest for the agent
   */
  async getManifest(): Promise<LAVSManifest> {
    if (this.manifest) {
      return this.manifest;
    }

    const url = `${this.baseURL}/api/agents/${this.agentId}/lavs/manifest`;

    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include', // Include cookies for auth
      });

      if (!response.ok) {
        const error = await response.json();
        throw new LAVSError(
          error.code || -1,
          error.error || `HTTP ${response.status}: ${response.statusText}`,
          error.data
        );
      }

      this.manifest = await response.json();
      return this.manifest!;
    } catch (error: any) {
      if (error instanceof LAVSError) {
        throw error;
      }
      throw new LAVSError(-1, `Failed to fetch manifest: ${error.message}`);
    }
  }

  /**
   * Call a LAVS endpoint
   *
   * @param endpointId - Endpoint ID from manifest
   * @param input - Input data for the endpoint
   * @returns Endpoint result
   */
  async call<TResult = any>(
    endpointId: string,
    input?: any
  ): Promise<TResult> {
    const url = `${this.baseURL}/api/agents/${this.agentId}/lavs/${endpointId}`;

    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(input || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new LAVSError(
          error.code || -1,
          error.error || `HTTP ${response.status}: ${response.statusText}`,
          error.data
        );
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof LAVSError) {
        throw error;
      }
      throw new LAVSError(-1, `Failed to call endpoint: ${error.message}`);
    }
  }

  /**
   * Clear manifest cache (force reload on next getManifest)
   */
  clearCache(): void {
    this.manifest = null;
  }
}

/**
 * Interface that view components should implement
 */
export interface LAVSViewComponent extends HTMLElement {
  /**
   * Called when component is mounted
   */
  connectedCallback?(): void;

  /**
   * Set the LAVS client (injected by container)
   */
  setLAVSClient(client: LAVSClient): void;

  /**
   * Optional: receive notifications when agent performs actions
   */
  onAgentAction?(action: any): void;

  /**
   * Called when component is unmounted
   */
  disconnectedCallback?(): void;
}
