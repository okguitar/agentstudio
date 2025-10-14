import { readFile } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';

export interface AgentStudioConfig {
  port?: number;
  host?: string;
  logLevel?: string;
  slidesDir?: string;
  maxFileSize?: string;
  allowedFileTypes?: string[];
  linuxOptimizations?: {
    appleSilicon?: boolean;
    memoryLimit?: string;
    cpuOptimization?: boolean;
    launchdManaged?: boolean;
  };
  service?: {
    name?: string;
    autoStart?: boolean;
    keepAlive?: boolean;
  };
}

let cachedConfig: AgentStudioConfig | null = null;

/**
 * Load configuration from config file and environment variables
 * Priority: Environment variables > Config file > Defaults
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
  const configPaths = [
    join(homeDir, '.agent-studio', 'config', 'config.json'),
    join(homeDir, '.agent-studio', 'config', 'config.env'),
    join(process.cwd(), 'config.json'),
    join(process.cwd(), '.env'),
  ];

  for (const configPath of configPaths) {
    try {
      const content = await readFile(configPath, 'utf-8');

      if (configPath.endsWith('.json')) {
        configData = JSON.parse(content);
        break;
      } else if (configPath.endsWith('.env')) {
        // Parse .env file manually to avoid dotenv loading only once
        const envLines = content.split('\n');
        for (const line of envLines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').replace(/^["']|["']$/g, '');
              process.env[key.trim()] = value;
            }
          }
        }
        continue;
      }
    } catch (error) {
      // Config file doesn't exist or can't be read, continue to next path
      continue;
    }
  }

  // Create final configuration with environment variable overrides
  const finalConfig: AgentStudioConfig = {
    port: parseInt(process.env.PORT || configData.port?.toString() || '4936'),
    host: process.env.HOST || configData.host || '0.0.0.0',
    logLevel: process.env.LOG_LEVEL || configData.logLevel || 'info',
    slidesDir: process.env.SLIDES_DIR || configData.slidesDir || join(homeDir, '.agent-studio', 'data', 'slides'),
    maxFileSize: process.env.MAX_FILE_SIZE || configData.maxFileSize || '10MB',
    allowedFileTypes: configData.allowedFileTypes || ['.txt', '.md', '.js', '.ts', '.json', '.html', '.css'],
    linuxOptimizations: configData.linuxOptimizations || {},
    service: configData.service || {},
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
 * Get the slides directory from configuration
 */
export async function getSlidesDir(): Promise<string> {
  const config = await loadConfig();
  return config.slidesDir || join(process.env.HOME || process.env.USERPROFILE || '', '.agent-studio', 'data', 'slides');
}