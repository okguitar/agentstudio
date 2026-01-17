/**
 * A2A Client SDK MCP Server
 *
 * Implements an in-process MCP server using Claude Agent SDK that enables
 * agents to call external A2A-compatible agents with dynamic tool documentation.
 *
 * Features:
 * - Dynamic tool description based on project's A2A configuration
 * - SessionId support for multi-turn conversations
 * - Integration with existing callExternalAgent function
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { loadA2AConfig } from './a2aConfigService.js';
import { callExternalAgent } from './a2aClientTool.js';
import type { CallExternalAgentInput } from '../../types/a2a.js';

/**
 * Generate dynamic tool description based on project's A2A configuration
 *
 * Lists all enabled external agents to help Claude decide which agent to call.
 *
 * @param projectId - Project identifier
 * @returns Tool description with available agents
 */
async function generateToolDescription(projectId: string): Promise<string> {
    const config = await loadA2AConfig(projectId);

    if (!config) {
        return 'Call an external A2A-compatible agent. No A2A configuration found for this project.';
    }

    const enabledAgents = config.allowedAgents.filter((a) => a.enabled);

    let description = 'Call an external A2A-compatible agent to delegate tasks or retrieve information. ';

    if (enabledAgents.length > 0) {
        description += '\n\nAvailable external agents:\n';
        for (const agent of enabledAgents) {
            description += `\n• ${agent.name}`;
            if (agent.description) {
                description += `: ${agent.description}`;
            }
            description += `\n  URL: ${agent.url}`;
        }
        description += '\n\nUse the agentUrl parameter to specify which agent to call. Please also include the agentName parameter for better UI display.';
    } else {
        description += 'No external agents are currently configured or enabled.';
    }

    return description;
}

/**
 * Create SDK MCP server for A2A client tool
 *
 * This server runs in-process within the Claude Agent SDK and provides
 * a tool for calling external A2A agents.
 *
 * @param projectId - Project identifier for loading A2A configuration
 * @param streamEnabled - Whether to enable streaming for external agent calls (default: false)
 * @returns SDK MCP server instance and tool definitions
 */
export async function createA2ASdkMcpServer(projectId: string, streamEnabled: boolean = false) {
    // Generate dynamic tool description
    const toolDescription = await generateToolDescription(projectId);

    // Define the tool
    const callExternalAgentTool = tool(
        'call_external_agent',
        toolDescription,
        {
            agentUrl: z
                .string()
                .url()
                .describe('Target A2A agent URL (e.g., https://analytics.example.com/a2a/agent-id)'),
            agentName: z
                .string()
                .optional()
                .describe('Name of the agent being called (e.g., "AI Editor"). Please provide this for better UI display.'),
            message: z
                .string()
                .min(1)
                .max(10000)
                .describe('Message or task description to send to the external agent'),
            sessionId: z
                .string()
                .optional()
                .describe('Session ID for continuing a conversation with the external agent. Provide this if you want to continue a previous session.'),
            useTask: z
                .boolean()
                .optional()
                .default(false)
                .describe('Use async task mode for long-running operations (default: false for synchronous)'),

        },
        async (args) => {
            try {
                // Prepare input for callExternalAgent
                // Use streamEnabled from server configuration, not user input
                const input: CallExternalAgentInput = {
                    agentUrl: args.agentUrl,
                    message: args.message,
                    sessionId: args.sessionId,
                    useTask: args.useTask,
                    stream: streamEnabled,  // Use server-configured stream setting
                };

                // Call external agent using existing function
                const result = await callExternalAgent(input, projectId);

                // Format response for Claude
                if (result.success) {
                    const content: any[] = [];
                    let responseText = '';

                    if (result.data) {
                        if (typeof result.data === 'string') {
                            responseText = result.data;
                        } else {
                            responseText = JSON.stringify(result.data, null, 2);
                        }
                    }

                    // 1. Add Agent Response
                    content.push({
                        type: 'text',
                        text: responseText || 'External agent call completed successfully.',
                    });

                    // Include task information if async mode
                    if (result.taskId) {
                        let taskInfo = `Task ID: ${result.taskId}`;
                        if (result.status) {
                            taskInfo += `\nStatus: ${result.status}`;
                        }
                        content.push({
                            type: 'text',
                            text: taskInfo,
                        });
                    }

                    // 2. Add Session ID Info (if present)
                    if (result.sessionId) {
                        content.push({
                            type: 'text',
                            text: `[System] Session ID: ${result.sessionId}\nTo continue this conversation, please use this "sessionId" in your next call to this agent.`,
                        });
                    }

                    return { content };
                } else {
                    // Handle error response
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error calling external agent: ${result.error || 'Unknown error'}`,
                            },
                        ],
                        isError: true,
                    };
                }
            } catch (error) {
                // Handle unexpected errors
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('[A2A SDK MCP] Error executing call_external_agent tool:', error);

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Failed to call external agent: ${errorMessage}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // Create SDK MCP server with the tool
    const server = createSdkMcpServer({
        name: 'a2a-client',
        version: '1.0.0',
        tools: [callExternalAgentTool],
    });

    // Return both server and tool for testing
    return {
        server,
        tool: callExternalAgentTool,
    };
}

/**
 * Get tool name as it appears to Claude
 *
 * SDK MCP tools are prefixed with "mcp__{server_name}__"
 *
 * @returns Full tool name
 */
export function getA2AToolName(): string {
    return 'mcp__a2a-client__call_external_agent';
}


