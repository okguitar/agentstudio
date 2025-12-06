/**
 * Global Path Constants
 *
 * Centralized path definitions for the application.
 * All paths that reference ~/.claude-agent should use these constants.
 */

import { homedir } from 'os';
import { join } from 'path';

/**
 * Base directory for Claude Agent configuration and data
 * Default: ~/.claude-agent
 */
export const CLAUDE_AGENT_DIR = join(homedir(), '.claude-agent');

/**
 * Directory for agent configuration files
 * Default: ~/.claude-agent/agents
 */
export const AGENTS_DIR = join(CLAUDE_AGENT_DIR, 'agents');

/**
 * File path for Claude versions configuration
 * Default: ~/.claude-agent/claude-versions.json
 */
export const CLAUDE_VERSIONS_FILE = join(CLAUDE_AGENT_DIR, 'claude-versions.json');

/**
 * File path for projects metadata
 * Default: ~/.claude-agent/projects.json
 */
export const PROJECTS_METADATA_FILE = join(CLAUDE_AGENT_DIR, 'projects.json');

/**
 * File path for MCP server configuration
 * Default: ~/.claude-agent/mcp-server.json
 */
export const MCP_SERVER_CONFIG_FILE = join(CLAUDE_AGENT_DIR, 'mcp-server.json');

/**
 * File path for A2A agent mappings (global registry)
 * Default: ~/.claude-agent/a2a-agent-mappings.json
 */
export const A2A_AGENT_MAPPINGS_FILE = join(CLAUDE_AGENT_DIR, 'a2a-agent-mappings.json');

/**
 * Directory for Slack session locks
 * Default: ~/.claude-agent/slack-session-locks
 */
export const SLACK_SESSION_LOCKS_DIR = join(CLAUDE_AGENT_DIR, 'slack-session-locks');

/**
 * Get the .a2a directory path for a project
 * @param projectPath - Absolute path to the project working directory
 * @returns Path to the project's .a2a directory
 */
export function getProjectA2ADir(projectPath: string): string {
  return join(projectPath, '.a2a');
}

/**
 * Get the tasks directory path for a project
 * @param projectPath - Absolute path to the project working directory
 * @returns Path to the project's tasks directory
 */
export function getProjectTasksDir(projectPath: string): string {
  return join(projectPath, '.a2a', 'tasks');
}

/**
 * Get the A2A config file path for a project
 * @param projectPath - Absolute path to the project working directory
 * @returns Path to the project's A2A config file
 */
export function getProjectA2AConfigFile(projectPath: string): string {
  return join(projectPath, '.a2a', 'config.json');
}

/**
 * Get the API keys file path for a project
 * @param projectPath - Absolute path to the project working directory
 * @returns Path to the project's API keys file
 */
export function getProjectApiKeysFile(projectPath: string): string {
  return join(projectPath, '.a2a', 'api-keys.json');
}

