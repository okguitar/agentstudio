import * as path from 'path';
import * as os from 'os';

/**
 * SDK Engine Configuration
 * 
 * AgentStudio can work with different Agent SDK implementations:
 * - claude-code: Claude Code (default, uses ~/.claude)
 * - claude-internal: Claude Internal (uses ~/.claude-internal)
 * - code-buddy: Code Buddy (uses ~/.codebuddy)
 * 
 * The SDK engine is specified at service startup via:
 * - Environment variable: AGENT_SDK=claude-internal
 * - Command line argument: --sdk=claude-internal
 * - Default: claude-code
 */

// Get SDK engine from environment or default to claude-code
export const SDK_ENGINE = process.env.AGENT_SDK || 'claude-code';

// Valid SDK engine types
export type SdkEngine = 'claude-code' | 'claude-internal' | 'code-buddy';

// Validate SDK engine (currently only claude-code and claude-internal are supported)
const VALID_ENGINES: SdkEngine[] = ['claude-code', 'claude-internal'];
if (!VALID_ENGINES.includes(SDK_ENGINE as SdkEngine)) {
  console.warn(`⚠️  Invalid AGENT_SDK="${SDK_ENGINE}", falling back to "claude-code"`);
  console.warn(`⚠️  Supported engines: ${VALID_ENGINES.join(', ')}`);
  process.env.AGENT_SDK = 'claude-code';
}

// SDK directory name mapping
const SDK_DIR_MAP: Record<SdkEngine, string> = {
  'claude-code': '.claude',
  'claude-internal': '.claude-internal',
  'code-buddy': '.codebuddy' // Not yet supported
};

/**
 * Get the base SDK directory name (e.g., '.claude', '.claude-internal')
 */
export function getSdkDirName(): string {
  return SDK_DIR_MAP[SDK_ENGINE as SdkEngine];
}

/**
 * Get the full path to the SDK directory (e.g., ~/.claude, ~/.claude-internal)
 */
export function getSdkDir(): string {
  return path.join(os.homedir(), getSdkDirName());
}

/**
 * Get the projects directory path (e.g., ~/.claude/projects)
 */
export function getProjectsDir(): string {
  return path.join(getSdkDir(), 'projects');
}

/**
 * Get the SDK config file path
 * - claude-code: ~/.claude.json (in home directory)
 * - claude-internal: ~/.claude-internal/.claude.json (inside SDK directory)
 */
export function getSdkConfigPath(): string {
  if (SDK_ENGINE === 'claude-code') {
    // Claude Code stores config at ~/.claude.json
    return path.join(os.homedir(), '.claude.json');
  } else {
    // Claude Internal stores config inside its directory: ~/.claude-internal/.claude.json
    return path.join(getSdkDir(), '.claude.json');
  }
}

/**
 * Get the plugins directory (e.g., ~/.claude/plugins)
 */
export function getPluginsDir(): string {
  return path.join(getSdkDir(), 'plugins');
}

/**
 * Get the commands directory (e.g., ~/.claude/commands)
 */
export function getCommandsDir(): string {
  return path.join(getSdkDir(), 'commands');
}

/**
 * Get the agents directory (e.g., ~/.claude/agents)
 */
export function getAgentsDir(): string {
  return path.join(getSdkDir(), 'agents');
}

/**
 * Get the skills directory (e.g., ~/.claude/skills)
 */
export function getSkillsDir(): string {
  return path.join(getSdkDir(), 'skills');
}

/**
 * Get the hooks directory (e.g., ~/.claude/hooks)
 */
export function getHooksDir(): string {
  return path.join(getSdkDir(), 'hooks');
}

/**
 * Get the MCP directory (e.g., ~/.claude/mcp)
 */
export function getMcpDir(): string {
  return path.join(getSdkDir(), 'mcp');
}

/**
 * Log SDK configuration at startup
 */
export function logSdkConfig(): void {
  console.log('🔧 Agent SDK Configuration:');
  console.log(`   Engine: ${SDK_ENGINE}`);
  console.log(`   Directory: ${getSdkDir()}`);
  console.log(`   Projects: ${getProjectsDir()}`);
  console.log(`   Config: ${getSdkConfigPath()}`);
}
