/**
 * LAVS Tool Generator
 *
 * Automatically generates Claude SDK tool definitions from LAVS manifests.
 * This allows AI agents to call LAVS endpoints as tools.
 */

import { LAVSManifest, Endpoint } from '../lavs/types.js';
import { ManifestLoader } from '../lavs/loader.js';
import { ScriptExecutor } from '../lavs/script-executor.js';
import { ScriptHandler, ExecutionContext } from '../lavs/types.js';
import path from 'path';

/**
 * Claude SDK tool definition
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool execution function
 */
export type ToolExecutor = (params: any) => Promise<any>;

/**
 * Generated tool with executor
 */
export interface GeneratedTool {
  tool: ClaudeTool;
  execute: ToolExecutor;
}

/**
 * Generate tools from LAVS manifest
 */
export class LAVSToolGenerator {
  /**
   * Generate tools for an agent
   * @param agentId - Agent ID
   * @param agentDir - Agent directory path
   * @returns Array of generated tools
   */
  async generateTools(
    agentId: string,
    agentDir: string
  ): Promise<GeneratedTool[]> {
    try {
      // Load manifest
      const lavsPath = path.join(agentDir, 'lavs.json');
      const loader = new ManifestLoader();
      const manifest = await loader.load(lavsPath);

      // Generate tool for each endpoint
      const tools: GeneratedTool[] = [];

      for (const endpoint of manifest.endpoints) {
        // Only generate tools for query and mutation endpoints
        // Subscriptions don't make sense as tools
        if (endpoint.method === 'subscription') {
          continue;
        }

        const tool = this.generateToolForEndpoint(endpoint, manifest, agentId, agentDir);
        tools.push(tool);
      }

      console.log(`[LAVS] Generated ${tools.length} tools for agent ${agentId}`);
      return tools;
    } catch (error: any) {
      // If no lavs.json, that's OK - just return empty array
      if (error.message && error.message.includes('not found')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Generate tool definition and executor for an endpoint
   */
  private generateToolForEndpoint(
    endpoint: Endpoint,
    manifest: LAVSManifest,
    agentId: string,
    agentDir: string
  ): GeneratedTool {
    // Generate tool name (prefix with lavs_ to avoid conflicts)
    const toolName = `lavs_${endpoint.id}`;

    // Generate tool description
    const description = endpoint.description || `Call ${endpoint.id} endpoint from ${manifest.name}`;

    // Generate input schema from endpoint schema
    const inputSchema = endpoint.schema?.input || {
      type: 'object',
      properties: {},
    };

    // Ensure it's an object schema
    if (inputSchema.type !== 'object') {
      throw new Error(`Endpoint ${endpoint.id} must have object input schema`);
    }

    const tool: ClaudeTool = {
      name: toolName,
      description,
      input_schema: {
        type: 'object',
        properties: inputSchema.properties || {},
        required: inputSchema.required || [],
      },
    };

    // Create executor function
    const execute: ToolExecutor = async (params: any) => {
      console.log(`[LAVS] Executing tool ${toolName} with params:`, params);

      // Only script handlers are supported in PoC
      if (endpoint.handler.type !== 'script') {
        throw new Error(`Handler type ${endpoint.handler.type} not supported yet`);
      }

      // Execute the handler
      const executor = new ScriptExecutor();
      const context: ExecutionContext = {
        endpointId: endpoint.id,
        agentId,
        workdir: agentDir,
        permissions: {
          ...(manifest.permissions || {}),
          ...(endpoint.permissions || {}),
        },
      };

      const result = await executor.execute(
        endpoint.handler as ScriptHandler,
        params,
        context
      );

      return result;
    };

    return { tool, execute };
  }

  /**
   * Check if agent has LAVS
   */
  async hasLAVS(agentDir: string): Promise<boolean> {
    try {
      const lavsPath = path.join(agentDir, 'lavs.json');
      const loader = new ManifestLoader();
      await loader.load(lavsPath);
      return true;
    } catch {
      return false;
    }
  }
}
