/**
 * A2A Protocol Support - TypeScript Type Definitions
 *
 * This file contains all TypeScript interfaces for the Agent-to-Agent (A2A) protocol
 * integration in AgentStudio. These types are shared between frontend and backend.
 *
 * Terminology:
 * - projectId: Internal AgentStudio project identifier (e.g., "proj-123")
 * - agentType: Internal agent type identifier (e.g., "ppt-editor", "code-assistant")
 * - a2aAgentId: A2A protocol-specific agent identifier (UUID v4)
 */

// ============================================================================
// Agent Card (A2A Protocol Compliant)
// ============================================================================

/**
 * JSON Schema v7 definition for skill input/output
 */
export interface JSONSchema {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
}

/**
 * Skill exposed by an agent via A2A protocol
 */
export interface Skill {
    name: string;
    description: string;
    inputSchema: JSONSchema;
    outputSchema: JSONSchema;
}

/**
 * Security scheme for A2A endpoints (currently only apiKey supported)
 */
export interface SecurityScheme {
    type: 'apiKey';
    in: 'header';
    name: 'Authorization';
    scheme: 'bearer';
}

/**
 * Agent Card - metadata document describing an agent's capabilities
 * Auto-generated from AgentConfig (never manually maintained)
 */
export interface AgentCard {
    // A2A Protocol required fields
    name: string;
    description: string;
    version: string;
    url: string;

    // Agent capabilities
    skills: Skill[];

    // Authentication requirements
    securitySchemes: SecurityScheme[];

    // AgentStudio-specific context
    context: {
        a2aAgentId: string;
        projectId: string;
        projectName: string;
        workingDirectory: string;
        agentType: string;
        agentCategory: 'builtin' | 'subagent';
    };
}

// ============================================================================
// A2A Task (Asynchronous Long-Running Operations)
// ============================================================================

/**
 * Task lifecycle states
 */
export type TaskStatus =
    | 'pending'   // Created, not yet started
    | 'running'   // Currently executing
    | 'completed' // Successfully finished
    | 'failed'    // Error occurred
    | 'canceled'; // User-requested cancellation

/**
 * Task input data
 */
export interface TaskInput {
    message: string;
    additionalContext?: Record<string, unknown>;
}

/**
 * Artifact produced by a task (files, data, etc.)
 */
export interface Artifact {
    type: string;
    name: string;
    data?: string;
    url?: string;
}

/**
 * Task output data
 */
export interface TaskOutput {
    result: string;
    artifacts?: Artifact[];
}

/**
 * Task error details
 */
export interface TaskError {
    message: string;
    code: string;
    stack?: string;
}

/**
 * Push Notification Authentication Info (A2A Protocol)
 */
export interface PushNotificationAuthenticationInfo {
    schemes: string[];  // e.g., ["Bearer"]
    credentials?: string;  // The actual credential/token
}

/**
 * Push Notification Configuration (A2A Protocol)
 * Configures webhook callbacks for async task completion
 */
export interface PushNotificationConfig {
    url: string;  // Webhook URL to POST updates to
    token?: string;  // Client verification token
    authentication?: PushNotificationAuthenticationInfo;
}

/**
 * A2A Task - represents a long-running asynchronous task
 */
export interface A2ATask {
    // Identity
    id: string;
    projectId: string;
    agentId: string;
    a2aAgentId: string;

    // Lifecycle
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;

    // Data
    input: TaskInput;
    output?: TaskOutput;
    errorDetails?: TaskError;

    // Configuration
    timeoutMs: number;
    contextId?: string;

    // Push Notification
    pushNotificationConfig?: PushNotificationConfig;
}

// ============================================================================
// A2A Configuration (Project-Level)
// ============================================================================

/**
 * Allowed external agent configuration
 */
export interface AllowedAgent {
    name: string;
    url: string;
    apiKey: string; // Outbound API key (for calling this agent)
    description?: string;
    enabled: boolean;
}

/**
 * Project-level A2A configuration
 */
export interface A2AConfig {
    allowedAgents: AllowedAgent[];
    taskTimeout: number; // Default timeout in milliseconds
    maxConcurrentTasks: number;
    apiKeyRotationDays?: number;
}

/**
 * Default configuration for new projects
 */
export const DEFAULT_A2A_CONFIG: A2AConfig = {
    allowedAgents: [],
    taskTimeout: 300000, // 5 minutes
    maxConcurrentTasks: 5,
};

// ============================================================================
// API Key Management
// ============================================================================

/**
 * API key for authenticating external callers (inbound)
 */
export interface A2AApiKey {
    id: string;
    projectId: string;
    keyHash: string; // bcrypt hash for validation
    encryptedKey?: string; // AES-256-GCM encrypted original key for display
    description: string;
    createdAt: string;
    lastUsedAt?: string;
    revokedAt?: string;
}

/**
 * API key registry (stored in projects/:projectId/.a2a/api-keys.json)
 */
export interface A2AApiKeyRegistry {
    version: string;
    keys: A2AApiKey[];
}

// ============================================================================
// Agent Mapping (A2A ID ↔ Project/Agent)
// ============================================================================

/**
 * Mapping between A2A agent ID and internal project/agent identifiers
 */
export interface AgentMapping {
    a2aAgentId: string;
    projectId: string;
    agentType: string;
    workingDirectory: string;
    createdAt: string;
    lastAccessedAt: string;
}

/**
 * Global agent mapping registry (stored in backend/data/a2a-agent-mappings.json)
 */
export interface AgentMappingRegistry {
    version: string;
    mappings: Record<string, AgentMapping>; // Key: a2aAgentId
}

// ============================================================================
// HTTP Request/Response Types
// ============================================================================

/**
 * POST /a2a/:a2aAgentId/messages request
 */
export interface A2AMessageRequest {
    message: string;
    context?: Record<string, unknown>;
    sessionId?: string;
}

/**
 * POST /a2a/:a2aAgentId/messages response
 */
export interface A2AMessageResponse {
    response: string;
    sessionId?: string;
    metadata?: {
        processingTimeMs?: number;
        tokensUsed?: number;
        [key: string]: any;
    };
}

/**
 * POST /a2a/:a2aAgentId/tasks request
 */
export interface A2ATaskRequest {
    message: string;
    timeout?: number;
    context?: Record<string, unknown>;
    pushNotificationConfig?: PushNotificationConfig;
}

/**
 * POST /a2a/:a2aAgentId/tasks response
 */
export interface A2ATaskCreateResponse {
    taskId: string;
    status: TaskStatus;
    checkUrl: string;
}

/**
 * GET /a2a/:a2aAgentId/tasks/:taskId response
 */
export interface A2ATaskStatusResponse {
    taskId: string;
    status: TaskStatus;
    progress?: {
        currentStep?: string;
        percentComplete?: number;
    };
    output?: TaskOutput;
    errorDetails?: TaskError;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
}

/**
 * Error response for A2A endpoints
 */
export interface A2AErrorResponse {
    error: string;
    code?: string;
    details?: any;
}

// ============================================================================
// MCP Tool Types (call_external_agent)
// ============================================================================

/**
 * Input for call_external_agent MCP tool
 * 
 * A2A Standard Protocol Fields:
 * - contextId: Server-generated ID for contextual alignment across interactions
 * - taskId: Unique identifier for continuing an existing task
 */
export interface CallExternalAgentInput {
    agentUrl: string;
    message: string;
    /** @deprecated Use contextId instead for A2A standard protocol */
    sessionId?: string;
    /** A2A contextId for maintaining conversation context */
    contextId?: string;
    /** A2A taskId for continuing an existing task */
    taskId?: string;
    useTask?: boolean;
    timeout?: number;
    stream?: boolean;
}

/**
 * Output from call_external_agent MCP tool
 * 
 * A2A Standard Protocol Fields:
 * - contextId: Server-generated ID from the external agent
 * - taskId: Task ID if the agent returned a Task response
 */
export interface CallExternalAgentOutput {
    success: boolean;
    data?: any;
    /** @deprecated Use taskId for A2A tasks */
    status?: string;
    error?: string;
    /** Internal session ID for history tracking */
    sessionId?: string;
    /** A2A contextId from the external agent response */
    contextId?: string;
    /** A2A taskId if the agent returned a Task response */
    taskId?: string;
}
