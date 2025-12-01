/**
 * Agent Card Service
 *
 * Generates Agent Cards from AgentConfig for A2A protocol discovery.
 * Agent Cards are auto-generated and should never be manually maintained.
 *
 * Pure function approach: generateAgentCard(agentConfig, projectContext) -> AgentCard
 *
 * Phase 4: US2 - Agent Card Auto-Generation
 */

import type { AgentConfig, AgentTool } from '../../types/agents.js';
import type { AgentCard, Skill, SecurityScheme, JSONSchema } from '../../types/a2a.js';

/**
 * Project context metadata for Agent Card generation
 */
export interface ProjectContext {
  projectId: string;
  projectName: string;
  workingDirectory: string;
  a2aAgentId: string;
  baseUrl: string; // e.g., "https://agentstudio.cc"
}

/**
 * Generate Agent Card from agent configuration (pure function)
 *
 * This is a pure function with no side effects - it takes agent config and project context
 * and returns a complete Agent Card compliant with A2A protocol v1.0.
 *
 * @param agentConfig - Agent configuration with tools and metadata
 * @param projectContext - Project-specific context (ID, name, working directory, A2A ID, baseUrl)
 * @returns Complete Agent Card ready for A2A protocol exposure
 */
export function generateAgentCard(
  agentConfig: AgentConfig,
  projectContext: ProjectContext
): AgentCard {
  // Extract skills from agent's tools
  const skills = extractSkillsFromTools(agentConfig.allowedTools);

  // Determine agent category
  const agentCategory = agentConfig.source === 'plugin' ? ('subagent' as const) : ('builtin' as const);

  // Build Agent Card
  const agentCard: AgentCard = {
    // A2A Protocol required fields
    name: agentConfig.name,
    description: agentConfig.description,
    version: agentConfig.version,
    url: `${projectContext.baseUrl}/a2a/${projectContext.a2aAgentId}`,

    // Agent capabilities (skills extracted from tools)
    skills,

    // Authentication requirements (API key only for now)
    securitySchemes: [
      {
        type: 'apiKey' as const,
        in: 'header' as const,
        name: 'Authorization' as const,
        scheme: 'bearer' as const,
      },
    ],

    // AgentStudio-specific context
    context: {
      a2aAgentId: projectContext.a2aAgentId,
      projectId: projectContext.projectId,
      projectName: projectContext.projectName,
      workingDirectory: projectContext.workingDirectory,
      agentType: agentConfig.id,
      agentCategory,
    },
  };

  return agentCard;
}

/**
 * Extract skills from agent's enabled MCP tools
 *
 * Converts AgentTool[] to Skill[] by mapping tool names to skill definitions.
 * Only includes enabled tools.
 *
 * @param tools - Array of agent tools with enable/disable state
 * @returns Array of skills for Agent Card
 */
function extractSkillsFromTools(tools: AgentTool[]): Skill[] {
  const skills: Skill[] = [];

  // Filter to enabled tools only
  const enabledTools = tools.filter((tool) => tool.enabled);

  for (const tool of enabledTools) {
    const skill = toolToSkill(tool);
    if (skill) {
      skills.push(skill);
    }
  }

  return skills;
}

/**
 * Convert a single AgentTool to a Skill definition
 *
 * Maps common tool names to their skill schemas. For unknown tools,
 * generates a generic skill with minimal schema.
 *
 * @param tool - Agent tool configuration
 * @returns Skill definition or null if tool should be excluded
 */
function toolToSkill(tool: AgentTool): Skill | null {
  // Map common tools to skill definitions
  const toolSchemas: Record<string, Omit<Skill, 'name'>> = {
    // File operations
    read_file: {
      description: 'Read content from a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' },
        },
        required: ['path'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'File content' },
        },
      },
    },
    write_file: {
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
        },
      },
    },
    edit_file: {
      description: 'Edit file content with search and replace',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to edit' },
          old_string: { type: 'string', description: 'Text to replace' },
          new_string: { type: 'string', description: 'Replacement text' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
        },
      },
    },
    // Command execution
    execute_command: {
      description: 'Execute shell command',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
        },
        required: ['command'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          stdout: { type: 'string' },
          stderr: { type: 'string' },
          exitCode: { type: 'number' },
        },
      },
    },
    // Search
    grep: {
      description: 'Search for patterns in files',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Search pattern' },
          path: { type: 'string', description: 'Directory to search' },
        },
        required: ['pattern'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    glob: {
      description: 'Find files matching glob pattern',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern' },
        },
        required: ['pattern'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  };

  // Check if we have a predefined schema for this tool
  const schema = toolSchemas[tool.name];

  if (schema) {
    return {
      name: tool.name,
      ...schema,
    };
  }

  // For unknown tools, generate generic schema
  return {
    name: tool.name,
    description: `Execute ${tool.name} tool`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    outputSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' },
      },
    },
  };
}
