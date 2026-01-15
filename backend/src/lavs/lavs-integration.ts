/**
 * LAVS Integration Helper
 *
 * Integrates LAVS endpoints as tools into Claude SDK query options.
 */

import { createLAVSSdkMcpServer, getLAVSToolNames } from './lavs-sdk-mcp.js';

/**
 * Integrate LAVS SDK MCP server into query options
 *
 * @param queryOptions - The query options object to modify
 * @param agentId - Agent identifier
 * @returns The modified query options (same object reference)
 */
export async function integrateLAVSMcpServer(queryOptions: any, agentId: string) {
  try {
    console.log(`[LAVS Integration] Checking LAVS for agent: ${agentId}`);

    // Create SDK MCP server for LAVS
    const lavsServer = await createLAVSSdkMcpServer(agentId);

    if (!lavsServer) {
      console.log(`[LAVS Integration] No LAVS configuration found for agent: ${agentId}`);
      return queryOptions;
    }

    // Add server to mcpServers
    queryOptions.mcpServers = {
      ...queryOptions.mcpServers,
      [`lavs-${agentId}`]: lavsServer.server,
    };

    // Add tool names to allowedTools
    const fullToolNames = getLAVSToolNames(agentId, lavsServer.toolNames);

    if (!queryOptions.allowedTools) {
      queryOptions.allowedTools = fullToolNames;
    } else {
      // Add tools, avoiding duplicates
      for (const toolName of fullToolNames) {
        if (!queryOptions.allowedTools.includes(toolName)) {
          queryOptions.allowedTools.push(toolName);
        }
      }
    }

    console.log(`[LAVS Integration] Integrated ${fullToolNames.length} LAVS tools for agent: ${agentId}`);
    console.log(`[LAVS Integration] Tool names:`, fullToolNames);
  } catch (error) {
    console.error('[LAVS Integration] Failed to integrate LAVS tools:', error);
    // Continue without LAVS support rather than failing
  }

  return queryOptions;
}
