/**
 * MCP Admin Tools Index
 *
 * Exports all tool definitions for the MCP Admin Server.
 */

export { projectTools } from './projectTools.js';
export { agentTools } from './agentTools.js';
export { mcpServerTools } from './mcpServerTools.js';
export { systemTools } from './systemTools.js';
export { providerTools } from './providerTools.js';

import { projectTools } from './projectTools.js';
import { agentTools } from './agentTools.js';
import { mcpServerTools } from './mcpServerTools.js';
import { systemTools } from './systemTools.js';
import { providerTools } from './providerTools.js';
import type { ToolDefinition } from '../types.js';

/**
 * All available tools
 */
export const allTools: ToolDefinition[] = [
  ...projectTools,
  ...agentTools,
  ...mcpServerTools,
  ...systemTools,
  ...providerTools,
];
