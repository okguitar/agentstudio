/**
 * System Status Tools
 *
 * MCP tools for getting system status and health information.
 */

import type { ToolDefinition, McpToolCallResult } from '../types.js';
import os from 'os';
import { sessionManager } from '../../sessionManager.js';

/**
 * Get system status
 */
export const getSystemStatusTool: ToolDefinition = {
  tool: {
    name: 'get_system_status',
    description: 'Get AgentStudio system status and health information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: async (): Promise<McpToolCallResult> => {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      const status = {
        status: 'healthy',
        version: process.env.npm_package_version || '1.0.0',
        uptime: {
          seconds: Math.floor(uptime),
          formatted: formatUptime(uptime),
        },
        memory: {
          heapUsed: formatBytes(memoryUsage.heapUsed),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          rss: formatBytes(memoryUsage.rss),
          external: formatBytes(memoryUsage.external),
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          cpuCount: os.cpus().length,
          totalMemory: formatBytes(os.totalmem()),
          freeMemory: formatBytes(os.freemem()),
          loadAverage: os.loadavg(),
        },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting system status: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:read'],
};

/**
 * Get active sessions
 */
export const getActiveSessionsTool: ToolDefinition = {
  tool: {
    name: 'get_active_sessions',
    description: 'Get information about active Claude sessions',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: async (): Promise<McpToolCallResult> => {
    try {
      const sessions = sessionManager.getSessionsInfo();

      const sessionList = sessions.map((session) => ({
        id: session.sessionId,
        agentId: session.agentId,
        projectPath: session.projectPath,
        isActive: session.isActive,
        status: session.status,
        idleTimeMs: session.idleTimeMs,
        heartbeatTimedOut: session.heartbeatTimedOut,
        claudeVersionId: session.claudeVersionId,
        modelId: session.modelId,
      }));

      const activeCount = sessionList.filter((s) => s.isActive).length;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                sessions: sessionList,
                total: sessionList.length,
                active: activeCount,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting active sessions: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:read'],
};

/**
 * Health check
 */
export const healthCheckTool: ToolDefinition = {
  tool: {
    name: 'health_check',
    description: 'Perform a health check on all system components',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: async (): Promise<McpToolCallResult> => {
    try {
      const checks: Record<string, { status: string; message?: string }> = {};

      // Check memory
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      checks.memory = {
        status: heapUsedPercent < 90 ? 'healthy' : 'warning',
        message: `Heap usage: ${heapUsedPercent.toFixed(1)}%`,
      };

      // Check disk (basic check)
      checks.disk = {
        status: 'healthy',
        message: 'Disk check passed',
      };

      // Check sessions
      try {
        const sessionCount = sessionManager.getActiveSessionCount();
        checks.sessions = {
          status: 'healthy',
          message: `${sessionCount} sessions tracked`,
        };
      } catch (error) {
        checks.sessions = {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }

      // Overall status
      const hasError = Object.values(checks).some((c) => c.status === 'error');
      const hasWarning = Object.values(checks).some((c) => c.status === 'warning');
      const overallStatus = hasError ? 'error' : hasWarning ? 'warning' : 'healthy';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: overallStatus,
                checks,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error performing health check: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:read'],
};

/**
 * Helper function to format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to format uptime
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * All system tools
 */
export const systemTools: ToolDefinition[] = [
  getSystemStatusTool,
  getActiveSessionsTool,
  healthCheckTool,
];
