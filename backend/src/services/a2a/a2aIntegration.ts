import { createA2ASdkMcpServer, getA2AToolName } from './a2aSdkMcp.js';

/**
 * Helper to integrate A2A SDK MCP server into query options
 * 
 * @param queryOptions - The query options object to modify
 * @param projectId - Project identifier
 * @returns The modified query options (same object reference)
 */
export async function integrateA2AMcpServer(queryOptions: any, projectId: string) {
    try {
        // Create SDK MCP server for A2A (in-process)
        const { server: a2aServer } = await createA2ASdkMcpServer(projectId);

        // Add to mcpServers
        if (a2aServer) {
            queryOptions.mcpServers = {
                ...queryOptions.mcpServers,
                "a2a-client": a2aServer
            };

            // Add tool to allowedTools
            const a2aToolName = getA2AToolName();
            if (!queryOptions.allowedTools) {
                queryOptions.allowedTools = [a2aToolName];
            } else {
                // Avoid duplicates
                if (!queryOptions.allowedTools.includes(a2aToolName)) {
                    queryOptions.allowedTools.push(a2aToolName);
                }
            }
        }
    } catch (error) {
        console.error('❌ [A2A] Failed to integrate SDK MCP server:', error);
        // Continue without A2A support rather than failing
    }

    return queryOptions;
}
