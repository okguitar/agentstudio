/**
 * LAVS SDK MCP Server
 *
 * Creates an in-process MCP server that exposes LAVS endpoints as Claude SDK tools.
 * This allows AI agents to call LAVS operations directly.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { LAVSToolGenerator, GeneratedTool } from './tool-generator.js';
import path from 'path';
import { AGENTS_DIR } from '../config/paths.js';

/**
 * Get agent directory path
 */
function getAgentDirectory(agentId: string): string {
  const fs = require('fs');
  const cwd = process.cwd();

  // Check project agents directory (one level up from backend if cwd is backend/)
  let projectAgentDir = path.join(cwd, 'agents', agentId);

  // If cwd ends with 'backend', check parent directory
  if (cwd.endsWith('backend')) {
    projectAgentDir = path.join(cwd, '..', 'agents', agentId);
  }

  if (fs.existsSync(projectAgentDir)) {
    return path.resolve(projectAgentDir);
  }

  // Check global agents directory
  const globalAgentDir = path.join(AGENTS_DIR, agentId);
  if (fs.existsSync(globalAgentDir)) {
    return globalAgentDir;
  }

  // Default to project directory even if it doesn't exist yet
  return path.resolve(projectAgentDir);
}

/**
 * Convert JSON Schema to Zod shape
 * This is a simplified converter - only handles basic types
 */
function jsonSchemaToZodShape(schema: any): z.ZodRawShape {
  if (!schema || !schema.properties) {
    return {};
  }

  const shape: z.ZodRawShape = {};

  for (const [key, prop] of Object.entries(schema.properties)) {
    const propSchema = prop as any;
    let zodType: z.ZodTypeAny;

    switch (propSchema.type) {
      case 'string':
        zodType = z.string();
        break;
      case 'number':
        zodType = z.number();
        break;
      case 'integer':
        zodType = z.number().int();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'array':
        zodType = z.array(z.any());
        break;
      case 'object':
        zodType = z.object({});
        break;
      default:
        zodType = z.any();
    }

    // Add description if available
    if (propSchema.description) {
      zodType = zodType.describe(propSchema.description);
    }

    // Handle optional vs required
    const isRequired = schema.required && schema.required.includes(key);
    if (!isRequired) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return shape;
}

/**
 * Create SDK MCP server for LAVS tools
 *
 * Generates tools from agent's lavs.json and creates an in-process MCP server.
 *
 * @param agentId - Agent identifier
 * @returns SDK MCP server instance or null if agent has no LAVS
 */
export async function createLAVSSdkMcpServer(agentId: string) {
  try {
    const agentDir = getAgentDirectory(agentId);
    const generator = new LAVSToolGenerator();

    // Check if agent has LAVS
    const hasLAVS = await generator.hasLAVS(agentDir);
    if (!hasLAVS) {
      console.log(`[LAVS SDK MCP] Agent ${agentId} has no LAVS configuration`);
      return null;
    }

    // Generate tools
    const generatedTools = await generator.generateTools(agentId, agentDir);
    if (generatedTools.length === 0) {
      console.log(`[LAVS SDK MCP] No LAVS tools generated for agent ${agentId}`);
      return null;
    }

    console.log(`[LAVS SDK MCP] Generating ${generatedTools.length} LAVS tools for agent ${agentId}`);

    // Convert generated tools to SDK tools
    const sdkTools = generatedTools.map((genTool: GeneratedTool) => {
      const { tool: toolDef, execute } = genTool;

      // Convert tool input schema to Zod shape
      const zodShape = jsonSchemaToZodShape(toolDef.input_schema);

      // Create SDK tool
      return tool(
        toolDef.name,
        toolDef.description,
        zodShape,
        async (args: any) => {
          try {
            console.log(`[LAVS SDK MCP] Executing ${toolDef.name} with args:`, args);

            // Execute the LAVS endpoint
            const result = await execute(args);

            // Format response
            return {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error: any) {
            console.error(`[LAVS SDK MCP] Error executing ${toolDef.name}:`, error);

            return {
              content: [
                {
                  type: 'text',
                  text: `Error executing LAVS endpoint: ${error.message || String(error)}`,
                },
              ],
              isError: true,
            };
          }
        }
      );
    });

    // Create SDK MCP server
    const server = createSdkMcpServer({
      name: `lavs-${agentId}`,
      version: '1.0.0',
      tools: sdkTools,
    });

    console.log(`[LAVS SDK MCP] Created MCP server for agent ${agentId} with ${sdkTools.length} tools`);

    return {
      server,
      tools: sdkTools,
      toolNames: generatedTools.map((t) => t.tool.name),
    };
  } catch (error: any) {
    console.error(`[LAVS SDK MCP] Failed to create server for agent ${agentId}:`, error);
    return null;
  }
}

/**
 * Get LAVS tool names for an agent
 * Tool names are prefixed with "mcp__{server_name}__"
 *
 * @param agentId - Agent identifier
 * @returns Array of full tool names
 */
export function getLAVSToolNames(agentId: string, toolNames: string[]): string[] {
  return toolNames.map((name) => `mcp__lavs-${agentId}__${name}`);
}
