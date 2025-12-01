/**
 * A2A Authentication Middleware
 *
 * Validates API keys for all A2A protocol endpoints.
 * Extracts API key from Authorization header, resolves a2aAgentId to projectId,
 * and validates the key against project's API key registry.
 *
 * Usage: Apply to all routes under /a2a/:a2aAgentId/*
 */

import type { Request, Response, NextFunction } from 'express';
import { resolveA2AId } from '../services/a2a/agentMappingService.js';
import { validateApiKey } from '../services/a2a/apiKeyService.js';

/**
 * Extended Express Request with A2A context
 */
export interface A2ARequest extends Request {
  a2aContext?: {
    a2aAgentId: string;
    projectId: string;
    agentType: string;
    workingDirectory: string;
    apiKeyId: string;
  };
}

/**
 * A2A Authentication Middleware
 *
 * Steps:
 * 1. Extract API key from Authorization header
 * 2. Resolve a2aAgentId from URL params to projectId/agentType
 * 3. Validate API key against project's API key registry
 * 4. Attach A2A context to request object
 */
export async function a2aAuth(req: A2ARequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // Step 1: Extract API key from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Missing Authorization header',
        code: 'MISSING_AUTH_HEADER',
        message: 'A2A endpoints require API key authentication. Include: Authorization: Bearer <api-key>',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Invalid Authorization header format',
        code: 'INVALID_AUTH_FORMAT',
        message: 'Authorization header must use Bearer scheme: Authorization: Bearer <api-key>',
      });
      return;
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!apiKey) {
      res.status(401).json({
        error: 'Empty API key',
        code: 'EMPTY_API_KEY',
        message: 'API key cannot be empty',
      });
      return;
    }

    // Step 2: Resolve a2aAgentId to projectId/agentType
    const a2aAgentId = req.params.a2aAgentId;

    if (!a2aAgentId) {
      res.status(400).json({
        error: 'Missing a2aAgentId in URL',
        code: 'MISSING_AGENT_ID',
        message: 'A2A agent ID must be specified in URL path: /a2a/:a2aAgentId/...',
      });
      return;
    }

    const agentMapping = await resolveA2AId(a2aAgentId);

    if (!agentMapping) {
      res.status(404).json({
        error: 'Agent not found',
        code: 'AGENT_NOT_FOUND',
        message: `No agent found with A2A ID: ${a2aAgentId}`,
      });
      return;
    }

    // Step 3: Validate API key against project's API key registry
    // Use workingDirectory as the path for API key storage, not projectId
    const { projectId, workingDirectory } = agentMapping;
    const validation = await validateApiKey(workingDirectory, apiKey);

    if (!validation.valid) {
      // Log failed authentication attempt (for security monitoring)
      console.warn('[A2A Auth] Failed authentication attempt:', {
        a2aAgentId,
        projectId,
        workingDirectory,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });

      res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
        message: 'The provided API key is invalid or has been revoked',
      });
      return;
    }

    // Step 4: Attach A2A context to request
    req.a2aContext = {
      a2aAgentId,
      projectId: agentMapping.projectId,
      agentType: agentMapping.agentType,
      workingDirectory: agentMapping.workingDirectory,
      apiKeyId: validation.keyId!,
    };

    // Log successful authentication (for monitoring)
    console.info('[A2A Auth] Successful authentication:', {
      a2aAgentId,
      projectId: agentMapping.projectId,
      agentType: agentMapping.agentType,
      keyId: validation.keyId,
      timestamp: new Date().toISOString(),
    });

    next();
  } catch (error) {
    console.error('[A2A Auth] Authentication error:', error);

    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
      message: 'An error occurred during authentication',
    });
  }
}

/**
 * Optional middleware to allow unauthenticated access (for public endpoints like health checks)
 * This should be used sparingly - most A2A endpoints should require authentication
 */
export function optionalA2AAuth(req: A2ARequest, res: Response, next: NextFunction): void {
  // If Authorization header is present, validate it
  if (req.headers.authorization) {
    a2aAuth(req, res, next);
  } else {
    // Otherwise, continue without authentication
    next();
  }
}
