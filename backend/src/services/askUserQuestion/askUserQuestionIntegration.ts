/**
 * AskUserQuestion Integration
 * 
 * Helper function to integrate AskUserQuestion SDK MCP server into query options
 */

import { createAskUserQuestionMcpServer, getAskUserQuestionToolName, SessionRef } from './askUserQuestionMcp.js';

export type { SessionRef };

/**
 * Integration result with session reference for dynamic updates
 */
export interface AskUserQuestionIntegration {
    queryOptions: any;
    sessionRef: SessionRef | null;
}

/**
 * Helper to integrate AskUserQuestion SDK MCP server into query options
 * 
 * @param queryOptions - The query options object to modify
 * @param sessionId - 初始会话 ID（用于路由用户通知，可能是临时 ID）
 * @param agentId - Agent ID
 * @returns Integration result with query options and session reference for updates
 */
export async function integrateAskUserQuestionMcpServer(
    queryOptions: any,
    sessionId: string,
    agentId: string
): Promise<AskUserQuestionIntegration> {
    let sessionRef: SessionRef | null = null;
    
    try {
        // 创建可更新的 session ID 引用
        sessionRef = { current: sessionId };
        
        // Create SDK MCP server for AskUserQuestion (in-process)
        const { server: askUserQuestionServer } = await createAskUserQuestionMcpServer(sessionRef, agentId);

        // Add to mcpServers
        if (askUserQuestionServer) {
            queryOptions.mcpServers = {
                ...queryOptions.mcpServers,
                "ask-user-question": askUserQuestionServer
            };

            // Add tool to allowedTools
            const toolName = getAskUserQuestionToolName();
            if (!queryOptions.allowedTools) {
                queryOptions.allowedTools = [toolName];
            } else {
                // Avoid duplicates
                if (!queryOptions.allowedTools.includes(toolName)) {
                    queryOptions.allowedTools.push(toolName);
                }
            }
            
            console.log(`✅ [AskUserQuestion] MCP server integrated for session: ${sessionId}`);
        }
    } catch (error) {
        console.error('❌ [AskUserQuestion] Failed to integrate SDK MCP server:', error);
        // Continue without AskUserQuestion support rather than failing
        sessionRef = null;
    }

    return { queryOptions, sessionRef };
}
