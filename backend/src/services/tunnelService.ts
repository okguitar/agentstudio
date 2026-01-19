/**
 * Tunnel Service
 *
 * Manages WebSocket tunnel connection to allow external access to local Agent Studio.
 * Uses tunely library for tunnel client functionality.
 *
 * Features:
 * - Auto-connect on startup if configured
 * - Automatic reconnection on disconnect
 * - Connection status tracking
 * - Configuration persistence
 */

import { TunnelClient, TunnelClientConfig } from 'tunely';
import fs from 'fs/promises';
import path from 'path';
import { CLAUDE_AGENT_DIR } from '../config/paths.js';

// Configuration file paths
// Port-specific config takes priority, then falls back to default config
const getPortConfigFile = (port: number) => path.join(CLAUDE_AGENT_DIR, `tunnel-config-${port}.json`);
const DEFAULT_CONFIG_FILE = path.join(CLAUDE_AGENT_DIR, 'tunnel-config.json');

/**
 * Tunnel configuration stored on disk
 */
export interface TunnelConfig {
  /** Whether tunnel should auto-connect on startup */
  enabled: boolean;
  /** Tunnel server WebSocket URL */
  serverUrl: string;
  /** Tunnel authentication token */
  token: string;
  /** Reconnect interval in milliseconds */
  reconnectInterval?: number;
  /** Maximum reconnect attempts (0 = infinite) */
  maxReconnectAttempts?: number;
}

/**
 * Tunnel connection status
 */
export interface TunnelStatus {
  /** Whether tunnel is enabled in config */
  enabled: boolean;
  /** Whether currently connected */
  connected: boolean;
  /** Assigned tunnel domain (e.g., "my-dev.tunnel") */
  domain: string | null;
  /** Last error message if any */
  lastError: string | null;
  /** Connection timestamp */
  connectedAt: string | null;
  /** Number of reconnect attempts */
  reconnectCount: number;
  /** Config source: 'port-specific' or 'default' */
  configSource: 'port-specific' | 'default' | 'none';
  /** Local port this tunnel forwards to */
  localPort: number;
}

/**
 * Default tunnel configuration
 */
const DEFAULT_CONFIG: TunnelConfig = {
  enabled: false,
  serverUrl: 'wss://hitl.woa.com/ws/tunnel',
  token: '',
  reconnectInterval: 5000,
  maxReconnectAttempts: 0, // Infinite
};

/**
 * Tunnel Service singleton
 */
class TunnelService {
  private client: TunnelClient | null = null;
  private config: TunnelConfig = { ...DEFAULT_CONFIG };
  private status: TunnelStatus = {
    enabled: false,
    connected: false,
    domain: null,
    lastError: null,
    connectedAt: null,
    reconnectCount: 0,
    configSource: 'none',
    localPort: 4936,
  };
  private localPort: number = 4936; // Default Agent Studio port
  private initialized = false;
  private configSource: 'port-specific' | 'default' | 'none' = 'none';

  /**
   * Initialize the tunnel service
   * Loads config and auto-connects if enabled
   */
  async initialize(localPort?: number): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (localPort) {
      this.localPort = localPort;
    }

    // Load saved configuration
    await this.loadConfig();
    this.initialized = true;

    // Auto-connect if enabled
    if (this.config.enabled && this.config.token) {
      console.log('[Tunnel] Auto-connecting (enabled in config)...');
      await this.connect();
    } else {
      console.log('[Tunnel] Not auto-connecting (disabled or no token)');
    }
  }

  /**
   * Load tunnel configuration from disk
   * Priority: port-specific config > default config
   */
  async loadConfig(): Promise<TunnelConfig> {
    const portConfigFile = getPortConfigFile(this.localPort);
    
    // Try port-specific config first
    try {
      const data = await fs.readFile(portConfigFile, 'utf-8');
      const savedConfig = JSON.parse(data) as Partial<TunnelConfig>;
      this.config = { ...DEFAULT_CONFIG, ...savedConfig };
      this.configSource = 'port-specific';
      console.log(`[Tunnel] Loaded port-specific config from: ${portConfigFile}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Port-specific config not found, try default config
        try {
          const data = await fs.readFile(DEFAULT_CONFIG_FILE, 'utf-8');
          const savedConfig = JSON.parse(data) as Partial<TunnelConfig>;
          this.config = { ...DEFAULT_CONFIG, ...savedConfig };
          this.configSource = 'default';
          console.log(`[Tunnel] Loaded default config from: ${DEFAULT_CONFIG_FILE}`);
        } catch (defaultError) {
          if ((defaultError as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error('[Tunnel] Error loading default config:', defaultError);
          }
          this.configSource = 'none';
        }
      } else {
        console.error('[Tunnel] Error loading port-specific config:', error);
        this.configSource = 'none';
      }
    }

    this.status.enabled = this.config.enabled;
    this.status.configSource = this.configSource;
    this.status.localPort = this.localPort;
    return this.config;
  }

  /**
   * Save tunnel configuration to disk
   * Always saves to port-specific config file
   */
  async saveConfig(config: Partial<TunnelConfig>): Promise<void> {
    // Merge with existing config
    this.config = { ...this.config, ...config };
    this.status.enabled = this.config.enabled;

    // Always save to port-specific config file
    const portConfigFile = getPortConfigFile(this.localPort);

    // Ensure directory exists
    await fs.mkdir(path.dirname(portConfigFile), { recursive: true });

    // Save to disk
    await fs.writeFile(portConfigFile, JSON.stringify(this.config, null, 2), 'utf-8');
    
    // Update config source
    this.configSource = 'port-specific';
    this.status.configSource = 'port-specific';
    
    console.log(`[Tunnel] Configuration saved to: ${portConfigFile}`);
  }

  /**
   * Get current tunnel configuration
   */
  getConfig(): TunnelConfig {
    // Return config without exposing the full token
    return {
      ...this.config,
      token: this.config.token ? `${this.config.token.slice(0, 8)}...` : '',
    };
  }

  /**
   * Get current tunnel status
   */
  getStatus(): TunnelStatus {
    return { ...this.status };
  }

  /**
   * Connect to the tunnel server
   */
  async connect(): Promise<void> {
    if (!this.config.token) {
      throw new Error('Tunnel token is not configured');
    }

    // Disconnect existing connection if any
    if (this.client) {
      this.disconnect();
    }

    const targetUrl = `http://localhost:${this.localPort}`;

    console.log(`[Tunnel] Connecting to ${this.config.serverUrl}...`);
    console.log(`[Tunnel] Target: ${targetUrl}`);

    const clientConfig: TunnelClientConfig = {
      serverUrl: this.config.serverUrl,
      token: this.config.token,
      targetUrl,
      reconnectInterval: this.config.reconnectInterval || 5000,
      maxReconnectAttempts: this.config.maxReconnectAttempts || 0,
    };

    this.client = new TunnelClient(clientConfig);

    // Set up event handlers
    this.client.on('onConnect', (domain: string) => {
      console.log(`[Tunnel] Connected! Domain: ${domain}`);
      this.status.connected = true;
      this.status.domain = domain;
      this.status.lastError = null;
      this.status.connectedAt = new Date().toISOString();
      this.status.reconnectCount = 0;
    });

    this.client.on('onDisconnect', () => {
      console.log('[Tunnel] Disconnected');
      this.status.connected = false;
      this.status.reconnectCount++;
    });

    this.client.on('onError', (error: Error) => {
      console.error('[Tunnel] Error:', error.message);
      this.status.lastError = error.message;
    });

    this.client.on('onRequest', (request) => {
      // Log incoming requests (optional, for debugging)
      console.log(`[Tunnel] Request: ${request.method} ${request.path}`);
    });

    // Start the client (runs in background, doesn't block)
    this.client.run().catch((error) => {
      console.error('[Tunnel] Client run error:', error);
      this.status.lastError = error.message;
    });

    // Wait a bit for initial connection
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!this.status.connected) {
      console.log('[Tunnel] Initial connection pending...');
    }
  }

  /**
   * Disconnect from the tunnel server
   */
  disconnect(): void {
    if (this.client) {
      console.log('[Tunnel] Disconnecting...');
      this.client.stop();
      this.client = null;
    }
    this.status.connected = false;
    this.status.domain = null;
    this.status.connectedAt = null;
  }

  /**
   * Update configuration and optionally reconnect
   */
  async updateConfig(newConfig: Partial<TunnelConfig>, reconnect = true): Promise<void> {
    await this.saveConfig(newConfig);

    if (reconnect && this.config.enabled && this.config.token) {
      await this.connect();
    } else if (!this.config.enabled) {
      this.disconnect();
    }
  }

  /**
   * Test tunnel connection with current config
   */
  async testConnection(): Promise<{ success: boolean; domain?: string; error?: string }> {
    if (!this.config.token) {
      return { success: false, error: 'Token is not configured' };
    }

    try {
      // Try to connect
      await this.connect();

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 3000));

      if (this.status.connected) {
        return { success: true, domain: this.status.domain || undefined };
      } else {
        return {
          success: false,
          error: this.status.lastError || 'Connection timeout',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const tunnelService = new TunnelService();
