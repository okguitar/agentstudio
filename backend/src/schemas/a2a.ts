/**
 * A2A Protocol Support - Zod Validation Schemas
 *
 * This file contains Zod schemas for validating all A2A request/response types.
 * These schemas ensure data integrity and provide clear error messages for invalid requests.
 */

import { z } from 'zod';

// ============================================================================
// HTTP Request Schemas
// ============================================================================

/**
 * Session mode for A2A message requests
 * - 'new': Always create a new session (default, avoids session reuse bugs)
 * - 'reuse': Try to reuse/resume existing session if sessionId is provided
 */
export const SessionModeSchema = z.enum(['reuse', 'new']);

/**
 * POST /a2a/:a2aAgentId/messages request validation
 */
export const A2AMessageRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long (max 10000 characters)'),
  sessionId: z.string().optional(),
  sessionMode: SessionModeSchema.optional().default('new'),
  context: z.record(z.unknown()).optional(),
});

/**
 * Push Notification Authentication Info validation
 */
export const PushNotificationAuthenticationInfoSchema = z.object({
  schemes: z.array(z.string()).min(1, 'At least one authentication scheme required'),
  credentials: z.string().optional(),
});

/**
 * Push Notification Configuration validation (A2A Protocol)
 */
export const PushNotificationConfigSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  token: z.string().optional(),
  authentication: PushNotificationAuthenticationInfoSchema.optional(),
});

/**
 * POST /a2a/:a2aAgentId/tasks request validation
 */
export const A2ATaskRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long (max 10000 characters)'),
  timeout: z
    .number()
    .int('Timeout must be an integer')
    .min(1000, 'Timeout must be at least 1 second (1000ms)')
    .max(1800000, 'Timeout cannot exceed 30 minutes (1800000ms)')
    .optional(),
  context: z.record(z.unknown()).optional(),
  pushNotificationConfig: PushNotificationConfigSchema.optional(),
});

// ============================================================================
// Task Schemas
// ============================================================================

/**
 * Task status enum validation
 */
export const TaskStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'canceled']);

/**
 * Task input validation
 */
export const TaskInputSchema = z.object({
  message: z.string().min(1),
  additionalContext: z.record(z.unknown()).optional(),
});

/**
 * Artifact validation
 */
export const ArtifactSchema = z.object({
  type: z.string(),
  name: z.string(),
  data: z.string().optional(),
  url: z.string().optional(),
});

/**
 * Task output validation
 */
export const TaskOutputSchema = z.object({
  result: z.string(),
  artifacts: z.array(ArtifactSchema).optional(),
});

/**
 * Task error validation
 */
export const TaskErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
  stack: z.string().optional(),
});

/**
 * Complete task validation
 */
export const A2ATaskSchema = z.object({
  id: z.string().uuid('Invalid task ID format'),
  projectId: z.string(),
  agentId: z.string(),
  a2aAgentId: z.string().uuid('Invalid A2A agent ID format'),
  status: TaskStatusSchema,
  createdAt: z.string().datetime('Invalid ISO 8601 timestamp'),
  updatedAt: z.string().datetime('Invalid ISO 8601 timestamp'),
  startedAt: z.string().datetime('Invalid ISO 8601 timestamp').optional(),
  completedAt: z.string().datetime('Invalid ISO 8601 timestamp').optional(),
  input: TaskInputSchema,
  output: TaskOutputSchema.optional(),
  errorDetails: TaskErrorSchema.optional(),
  timeoutMs: z.number().int().min(1000).max(1800000),
  contextId: z.string().optional(),
});

// ============================================================================
// A2A Configuration Schemas
// ============================================================================

/**
 * Allowed agent validation
 */
export const AllowedAgentSchema = z.object({
  name: z.string().min(1, 'Agent name cannot be empty'),
  url: z.string().url('Invalid agent URL').refine(
    (url) => {
      // In production, require HTTPS
      if (process.env.NODE_ENV === 'production') {
        return url.startsWith('https://');
      }
      // In development, allow HTTP
      return url.startsWith('http://') || url.startsWith('https://');
    },
    {
      message: 'Agent URL must use HTTPS in production environment',
    }
  ),
  apiKey: z.string().min(1, 'API key cannot be empty'),
  description: z.string().optional(),
  enabled: z.boolean(),
});

/**
 * A2A configuration validation
 */
export const A2AConfigSchema = z.object({
  allowedAgents: z.array(AllowedAgentSchema),
  taskTimeout: z
    .number()
    .int('Task timeout must be an integer')
    .min(1000, 'Task timeout must be at least 1 second (1000ms)')
    .max(1800000, 'Task timeout cannot exceed 30 minutes (1800000ms)'),
  maxConcurrentTasks: z
    .number()
    .int('Max concurrent tasks must be an integer')
    .min(1, 'Max concurrent tasks must be at least 1')
    .max(50, 'Max concurrent tasks cannot exceed 50'),
  apiKeyRotationDays: z.number().int().positive().optional(),
});

// ============================================================================
// API Key Schemas
// ============================================================================

/**
 * API key validation (before hashing)
 */
export const ApiKeySchema = z
  .string()
  .min(32, 'API key must be at least 32 characters')
  .regex(/^agt_proj_[a-zA-Z0-9_-]+$/, 'Invalid API key format (must start with agt_proj_)');

/**
 * API key generation request validation
 */
export const GenerateApiKeyRequestSchema = z.object({
  description: z.string().min(1, 'Description cannot be empty').max(200, 'Description too long (max 200 characters)'),
});

/**
 * API key in registry validation
 */
export const A2AApiKeySchema = z.object({
  id: z.string().uuid('Invalid key ID format'),
  projectId: z.string(),
  keyHash: z.string().min(1, 'Key hash cannot be empty'),
  description: z.string().max(200),
  createdAt: z.string().datetime('Invalid ISO 8601 timestamp'),
  lastUsedAt: z.string().datetime('Invalid ISO 8601 timestamp').optional(),
  revokedAt: z.string().datetime('Invalid ISO 8601 timestamp').optional(),
});

/**
 * API key registry validation
 */
export const A2AApiKeyRegistrySchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid version format (must be semver)'),
  keys: z.array(A2AApiKeySchema),
});

// ============================================================================
// Agent Mapping Schemas
// ============================================================================

/**
 * Agent mapping validation
 */
export const AgentMappingSchema = z.object({
  a2aAgentId: z.string().uuid('Invalid A2A agent ID format'),
  projectId: z.string().min(1, 'Project ID cannot be empty'),
  agentType: z.string().min(1, 'Agent type cannot be empty'),
  workingDirectory: z.string().min(1, 'Working directory cannot be empty'),
  createdAt: z.string().datetime('Invalid ISO 8601 timestamp'),
  lastAccessedAt: z.string().datetime('Invalid ISO 8601 timestamp'),
});

/**
 * Agent mapping registry validation
 */
export const AgentMappingRegistrySchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid version format (must be semver)'),
  mappings: z.record(z.string(), AgentMappingSchema),
});

// ============================================================================
// Agent Card Schemas (for validation, not generation)
// ============================================================================

/**
 * JSON Schema validation
 */
export const JSONSchemaSchema = z.object({
  type: z.string(),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
}).passthrough(); // Allow additional properties

/**
 * Skill validation
 */
export const SkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: JSONSchemaSchema,
  outputSchema: JSONSchemaSchema,
});

/**
 * Security scheme validation
 */
export const SecuritySchemeSchema = z.object({
  type: z.literal('apiKey'),
  in: z.literal('header'),
  name: z.literal('Authorization'),
  scheme: z.literal('bearer'),
});

/**
 * Agent Card validation
 */
export const AgentCardSchema = z.object({
  name: z.string().min(1, 'Agent name cannot be empty'),
  description: z.string().min(1, 'Agent description cannot be empty'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format'),
  url: z.string().url('Invalid agent URL'),
  skills: z.array(SkillSchema),
  securitySchemes: z.array(SecuritySchemeSchema),
  context: z.object({
    a2aAgentId: z.string().uuid(),
    projectId: z.string(),
    projectName: z.string(),
    workingDirectory: z.string(),
    agentType: z.string(),
    agentCategory: z.enum(['builtin', 'subagent']),
  }),
});

// ============================================================================
// MCP Tool Schemas
// ============================================================================

/**
 * call_external_agent tool input validation
 */
export const CallExternalAgentInputSchema = z.object({
  agentUrl: z.string().url('Invalid agent URL'),
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
  useTask: z.boolean().optional().default(false),
  timeout: z.number().int().min(1000).max(300000).optional().default(30000),
});

/**
 * call_external_agent tool output validation
 */
export const CallExternalAgentOutputSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  taskId: z.string().optional(),
  status: z.string().optional(),
  error: z.string().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate and parse data with a Zod schema
 * Returns parsed data or throws with detailed error messages
 */
export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
  }
  return result.data;
}

/**
 * Validate data and return validation result without throwing
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Array<{ field: string; message: string }> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}
