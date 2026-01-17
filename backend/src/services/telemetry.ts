/**
 * Backend Telemetry Service
 * 
 * Uses PostHog for anonymous usage data collection.
 * - Default: disabled (opt-in model for backend)
 * - Can be enabled via TELEMETRY_ENABLED=true
 */

import { PostHog } from 'posthog-node';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// PostHog configuration (hardcoded for distribution)
const POSTHOG_API_KEY = 'phc_5knpC9zvXXFaTJw4EMwrRBSYHIYW7b8ig6E14N8jYDp';
const POSTHOG_HOST = 'https://app.posthog.com';
// Backend telemetry can be disabled via environment variable (default: enabled for npm package users)
const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED !== 'false';

// App version from package.json
let APP_VERSION = '0.2.0';
try {
  const pkgPath = path.join(__dirname, '../../package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    APP_VERSION = pkg.version || APP_VERSION;
  }
} catch {
  // Ignore errors
}

// Instance ID storage
const INSTANCE_ID_FILE = path.join(os.homedir(), '.agentstudio', 'instance_id');

/**
 * Get or create the instance ID for this backend installation
 */
function getInstanceId(): string {
  try {
    // Create directory if not exists
    const dir = path.dirname(INSTANCE_ID_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Read existing ID or create new one
    if (fs.existsSync(INSTANCE_ID_FILE)) {
      return fs.readFileSync(INSTANCE_ID_FILE, 'utf-8').trim();
    } else {
      const id = uuidv4();
      fs.writeFileSync(INSTANCE_ID_FILE, id);
      return id;
    }
  } catch {
    // Fallback to random ID per process
    return uuidv4();
  }
}

// PostHog client (lazy initialization)
let posthogClient: PostHog | null = null;
let instanceId: string | null = null;

/**
 * Initialize the PostHog client
 */
function initPostHog(): PostHog | null {
  if (!TELEMETRY_ENABLED) {
    console.log('[Telemetry] Backend telemetry is disabled. Set TELEMETRY_ENABLED=true to enable.');
    return null;
  }

  try {
    const client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 10,
      flushInterval: 30000,
    });

    instanceId = getInstanceId();
    
    console.log(`[Telemetry] Backend telemetry initialized (instance: ${instanceId.slice(0, 8)}...)`);
    
    // Track backend start
    client.capture({
      distinctId: instanceId,
      event: 'app_start',
      properties: {
        platform: 'backend',
        app_version: APP_VERSION,
        os: process.platform,
        node_version: process.version,
      },
    });

    return client;
  } catch (error) {
    console.error('[Telemetry] Failed to initialize PostHog:', error);
    return null;
  }
}

/**
 * Get the PostHog client (initializes if needed)
 */
function getClient(): PostHog | null {
  if (posthogClient === null && TELEMETRY_ENABLED) {
    posthogClient = initPostHog();
  }
  return posthogClient;
}

/**
 * Check if telemetry is enabled
 */
export function isTelemetryEnabled(): boolean {
  return TELEMETRY_ENABLED;
}

/**
 * Track an event
 */
export function trackEvent(
  event: string, 
  properties?: Record<string, string | number | boolean>
): void {
  const client = getClient();
  if (!client || !instanceId) return;

  client.capture({
    distinctId: instanceId,
    event,
    properties: {
      platform: 'backend',
      app_version: APP_VERSION,
      ...properties,
    },
  });
}

/**
 * Track feature usage
 */
export function trackFeature(feature: string, action?: string): void {
  trackEvent('feature_used', {
    feature,
    action: action || 'use',
  });
}

/**
 * Track an error
 */
export function trackError(error: Error, component?: string): void {
  const client = getClient();
  if (!client || !instanceId) return;

  // Sanitize error message
  const sanitizeMessage = (msg: string) => {
    return msg
      .replace(/(?:\/[^\s:]+)+/g, '[PATH]')
      .replace(/(?:[A-Za-z]:\\[^\s:]+)+/g, '[PATH]')
      .replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]')
      .substring(0, 256);
  };

  client.capture({
    distinctId: instanceId,
    event: 'app_error',
    properties: {
      platform: 'backend',
      app_version: APP_VERSION,
      message: sanitizeMessage(error.message),
      errorType: error.name,
      component: component || 'unknown',
    },
  });
}

/**
 * Track agent usage
 */
export function trackAgentUsage(
  agentId: string, 
  action: 'chat_start' | 'chat_end' | 'tool_call',
  properties?: Record<string, string | number | boolean>
): void {
  trackEvent('agent_usage', {
    agent_id: agentId,
    action,
    ...properties,
  });
}

/**
 * Track MCP server usage
 */
export function trackMcpUsage(
  serverName: string, 
  action: 'connect' | 'disconnect' | 'tool_call' | 'error'
): void {
  trackEvent('mcp_usage', {
    server_name: serverName,
    action,
  });
}

/**
 * Track scheduled task execution
 */
export function trackScheduledTask(
  taskId: string,
  action: 'execute' | 'success' | 'failure'
): void {
  trackEvent('scheduled_task', {
    task_id: taskId,
    action,
  });
}

/**
 * Shutdown telemetry (flush pending events)
 */
export async function shutdownTelemetry(): Promise<void> {
  const client = getClient();
  if (client) {
    await client.shutdown();
    console.log('[Telemetry] Backend telemetry shutdown');
  }
}

// Initialize on import if enabled
getClient();
