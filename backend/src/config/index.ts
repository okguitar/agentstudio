import { readFile } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';

export interface AgentStudioConfig {
  port?: number;
  host?: string;
  adminPassword?: string;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  tokenRefreshThreshold?: string;
  corsOrigins?: string;
  corsAllowedDomains?: string;
}

let cachedConfig: AgentStudioConfig | null = null;

/**
 * Load configuration from config file and environment variables
 * Priority: Environment variables > Config file > Defaults
 * (Except port where config file takes priority)
 */
export async function loadConfig(): Promise<AgentStudioConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Load environment variables from .env file
  config();

  let configData: AgentStudioConfig = {};

  // Try to load from config file
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const configPath = join(homeDir, '.agent-studio', 'config', 'config.json');

  try {
    const content = await readFile(configPath, 'utf-8');
    configData = JSON.parse(content);
  } catch (error) {
    // Config file doesn't exist or can't be read, use empty object
  }

  // Create final configuration
  // For port: config file > environment variables > defaults  
  // For others: environment variables > config file > defaults
  const finalConfig: AgentStudioConfig = {
    port: parseInt(configData.port?.toString() || process.env.PORT || '4936'),
    host: process.env.HOST || configData.host || '0.0.0.0',
    adminPassword: process.env.ADMIN_PASSWORD || configData.adminPassword || 'admin123',
    jwtSecret: process.env.JWT_SECRET || configData.jwtSecret || 'your-secret-key-change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || configData.jwtExpiresIn || '7d',
    tokenRefreshThreshold: process.env.TOKEN_REFRESH_THRESHOLD || configData.tokenRefreshThreshold || '24h',
    corsOrigins: process.env.CORS_ORIGINS || configData.corsOrigins || '',
    corsAllowedDomains: process.env.CORS_ALLOWED_DOMAINS || configData.corsAllowedDomains || '',
  };

  cachedConfig = finalConfig;
  return finalConfig;
}

/**
 * Get a specific configuration value
 */
export async function getConfigValue<T>(key: keyof AgentStudioConfig): Promise<T | undefined> {
  const config = await loadConfig();
  return config[key] as T;
}

/**
 * Get the server port from configuration
 */
export async function getServerPort(): Promise<number> {
  const config = await loadConfig();
  return config.port || 4936;
}

/**
 * Get the slides directory (simplified - always use default location)
 */
export async function getSlidesDir(): Promise<string> {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return join(homeDir, '.agent-studio', 'data', 'slides');
}