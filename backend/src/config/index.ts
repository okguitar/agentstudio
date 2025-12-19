import { readFile } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';

// Re-export path constants for convenient access
export * from './paths.js';

/**
 * Check if a password has been explicitly configured
 * Returns true if a non-empty password is configured
 * Priority: Config file > Environment variable
 * If config file has adminPassword field (even empty), it takes precedence
 * Returns false if no password is configured (allows passwordless login)
 */
export async function isPasswordConfigured(): Promise<boolean> {
  // Check config file first (it has higher priority for password settings)
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const configPath = join(homeDir, '.agent-studio', 'config', 'config.json');

  try {
    const content = await readFile(configPath, 'utf-8');
    const configData = JSON.parse(content);
    
    // If adminPassword field exists in config file, use it (even if empty)
    if ('adminPassword' in configData) {
      return !!configData.adminPassword && configData.adminPassword.trim() !== '';
    }
  } catch {
    // Config file doesn't exist or can't be read - fall through to check env var
  }

  // Fall back to environment variable only if config file doesn't have adminPassword field
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim() !== '') {
    return true;
  }

  // No password configured
  return false;
}

export interface AgentStudioConfig {
  port?: number;
  host?: string;
  adminPassword?: string;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  tokenRefreshThreshold?: string;
  corsOrigins?: string;
  corsAllowedDomains?: string;
  logLevel?: string;
  slidesDir?: string;
  maxFileSize?: string;
  allowedFileTypes?: string[];
  linuxOptimizations?: Record<string, any>;
  service?: Record<string, any>;
  
  // Slack Integration
  slackSigningSecret?: string;
  slackBotToken?: string;
  slackDefaultAgentId?: string;
  slackDefaultProject?: string;
  enableSlackStreaming?: boolean;
}

let cachedConfig: AgentStudioConfig | null = null;

/**
 * Clear the configuration cache
 * Useful for testing or when configuration needs to be reloaded
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

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

// Create final configuration with environment variables taking priority over config.json
  // Priority: Config file > Environment variables > Defaults (for password)
  // Note: For adminPassword, config file takes priority to allow clearing password via config
  const finalConfig: AgentStudioConfig = {
    port: parseInt(process.env.PORT || configData.port?.toString() || '4936'),
    host: process.env.HOST || configData.host || '0.0.0.0',
    // Password priority: config file > env var > undefined (no default password for passwordless login)
    adminPassword: 'adminPassword' in configData ? configData.adminPassword : (process.env.ADMIN_PASSWORD || undefined),
    jwtSecret: process.env.JWT_SECRET || configData.jwtSecret || 'your-secret-key-change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || configData.jwtExpiresIn || '7d',
    tokenRefreshThreshold: process.env.TOKEN_REFRESH_THRESHOLD || configData.tokenRefreshThreshold || '24h',
    corsOrigins: process.env.CORS_ORIGINS || configData.corsOrigins || '',
    corsAllowedDomains: process.env.CORS_ALLOWED_DOMAINS || configData.corsAllowedDomains || '',
    logLevel: process.env.LOG_LEVEL || configData.logLevel || 'info',
    slidesDir: process.env.SLIDES_DIR || configData.slidesDir || join(homeDir, '.agent-studio', 'data', 'slides'),
    maxFileSize: process.env.MAX_FILE_SIZE || configData.maxFileSize || '10MB',
    allowedFileTypes: configData.allowedFileTypes || ['.txt', '.md', '.js', '.ts', '.json', '.html', '.css'],
    linuxOptimizations: configData.linuxOptimizations || {},
    service: configData.service || {},
    
    // Slack Integration
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET || configData.slackSigningSecret,
    slackBotToken: process.env.SLACK_BOT_TOKEN || configData.slackBotToken,
    slackDefaultAgentId: process.env.SLACK_DEFAULT_AGENT_ID || configData.slackDefaultAgentId || 'general-chat',
    slackDefaultProject: process.env.SLACK_DEFAULT_PROJECT || configData.slackDefaultProject,
    enableSlackStreaming: process.env.ENABLE_SLACK_STREAMING === 'true' || configData.enableSlackStreaming || false,
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

/**
 * Unified environment variable getter
 * Gets values from environment variables or config.json with proper priority
 * Priority: Environment variables > Config file > Default value
 * 
 * @param key - The configuration key to retrieve
 * @param defaultValue - Optional default value if not found
 * @returns The configuration value or undefined/default
 */
export async function getEnvConfig(key: keyof AgentStudioConfig, defaultValue?: any): Promise<any> {
  const config = await loadConfig();
  const value = config[key];
  return value !== undefined ? value : defaultValue;
}

/**
 * Get Slack configuration values
 */
export async function getSlackConfig() {
  const config = await loadConfig();
  return {
    signingSecret: config.slackSigningSecret,
    botToken: config.slackBotToken,
    defaultAgentId: config.slackDefaultAgentId || 'general-chat',
    defaultProject: config.slackDefaultProject,
    enableStreaming: config.enableSlackStreaming || true,
  };
}