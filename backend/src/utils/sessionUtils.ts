/**
 * Session Utils - Shared utilities for session management
 * 
 * This module provides common functions for managing Claude sessions,
 * used by both the main agents API and Slack integration.
 */

import * as path from 'path';
import * as fs from 'fs';
import { sessionManager } from '../services/sessionManager.js';
import { getAllVersions, getDefaultVersionId } from '../services/claudeVersionStorage.js';

/**
 * Session mode for handling session management
 * - 'new': Always create a new ClaudeSession (Query), but still use resume=sessionId for history context
 * - 'reuse': Try to reuse existing ClaudeSession from SessionManager (original behavior)
 */
export type SessionMode = 'reuse' | 'new';

/**
 * Handle session management logic
 * Creates new session or reuses existing one based on sessionId and sessionMode
 * 
 * @param agentId - Agent ID
 * @param sessionId - Optional existing session ID (used for resume even in 'new' mode)
 * @param projectPath - Optional project path for session history
 * @param queryOptions - Query options for Claude SDK
 * @param claudeVersionId - Optional Claude version ID
 * @param modelId - Optional model ID
 * @param sessionMode - Session mode: 'new' always creates fresh ClaudeSession (but still uses resume), 'reuse' tries to reuse existing ClaudeSession from SessionManager
 */
export async function handleSessionManagement(
  agentId: string,
  sessionId: string | null,
  projectPath: string | undefined,
  queryOptions: any,
  claudeVersionId?: string,
  modelId?: string,
  sessionMode: SessionMode = 'reuse'
): Promise<{ claudeSession: any; actualSessionId: string | null }> {
  let claudeSession: any;
  const actualSessionId: string | null = sessionId || null;

  // If sessionMode is 'new', always create a fresh ClaudeSession (Query)
  // but still use sessionId for resume to restore history context
  if (sessionMode === 'new') {
    if (sessionId) {
      // Check if session history exists for resume
      const sessionExists = sessionManager.checkSessionExists(sessionId, projectPath);
      if (sessionExists) {
        // Create new ClaudeSession with resume=sessionId (bypassing SessionManager cache)
        console.log(`🆕 [sessionMode=new] Creating fresh ClaudeSession with resume=${sessionId} for agent: ${agentId}`);
        claudeSession = sessionManager.createNewSession(agentId, queryOptions, sessionId, claudeVersionId, modelId);
      } else {
        // No history to resume, create completely new session
        console.log(`🆕 [sessionMode=new] Creating fresh ClaudeSession (no history found) for agent: ${agentId}`);
        claudeSession = sessionManager.createNewSession(agentId, queryOptions, undefined, claudeVersionId, modelId);
      }
    } else {
      // No sessionId provided, create completely new session
      console.log(`🆕 [sessionMode=new] Creating fresh ClaudeSession (no sessionId) for agent: ${agentId}`);
      claudeSession = sessionManager.createNewSession(agentId, queryOptions, undefined, claudeVersionId, modelId);
    }
    return { claudeSession, actualSessionId };
  }

  // sessionMode === 'reuse': Original logic - try to reuse existing ClaudeSession from SessionManager
  if (sessionId) {
    // Try to reuse existing session from SessionManager cache
    console.log(`🔍 Looking for existing session: ${sessionId} for agent: ${agentId}`);
    claudeSession = sessionManager.getSession(sessionId);
    
    if (claudeSession) {
      // 并发控制：检查会话是否正在处理其他请求
      if (sessionManager.isSessionBusy(sessionId)) {
        console.warn(`⚠️  Session ${sessionId} is currently busy processing another request`);
        throw new Error('SESSION_BUSY: This session is currently processing another request. Please wait for the current request to complete or create a new session.');
      }
      console.log(`♻️  Using existing persistent Claude session: ${sessionId} for agent: ${agentId}`);
    } else {
      console.log(`❌ Session ${sessionId} not found in memory for agent: ${agentId}`);

      // Check if session history exists in project directory
      console.log(`🔍 Checking project directory for session history: ${sessionId}, projectPath: ${projectPath}`);
      const sessionExists = sessionManager.checkSessionExists(sessionId, projectPath);
      console.log(`📁 Session history exists: ${sessionExists} for sessionId: ${sessionId}`);

      if (sessionExists) {
        // Session history exists, resume session
        console.log(`🔄 Found session history for ${sessionId}, resuming session for agent: ${agentId}`);
        claudeSession = sessionManager.createNewSession(agentId, queryOptions, sessionId, claudeVersionId, modelId);
      } else {
        // Session history not found, create new session but keep original sessionId for frontend
        console.log(`⚠️  Session ${sessionId} not found in memory or project history, creating new session for agent: ${agentId}`);
        claudeSession = sessionManager.createNewSession(agentId, queryOptions, undefined, claudeVersionId, modelId);
      }
    }
  } else {
    // Create new persistent session
    claudeSession = sessionManager.createNewSession(agentId, queryOptions, undefined, claudeVersionId, modelId);
    console.log(`🆕 Created new persistent Claude session for agent: ${agentId}`);
  }

  return { claudeSession, actualSessionId };
}

/**
 * Check if a model supports vision (image input)
 * Gets model configuration from version settings
 * 
 * @param model - Model ID
 * @param claudeVersionId - Optional Claude version ID
 */
export async function isVisionModel(model: string, claudeVersionId?: string): Promise<boolean> {
  try {
    // Get version configuration
    let versionId = claudeVersionId;
    if (!versionId) {
      versionId = await getDefaultVersionId() || 'system';
    }

    const versions = await getAllVersions();
    const version = versions.find(v => v.id === versionId);

    if (!version || !version.models) {
      // If version or model config not found, assume vision support
      console.warn(`⚠️ Version ${versionId} not found or has no model config, assuming vision support`);
      return true;
    }

    // Find matching model in version's model list
    const modelConfig = version.models.find(m => m.id === model);
    if (modelConfig) {
      console.log(`✅ Found model config for ${model}: isVision=${modelConfig.isVision}`);
      return modelConfig.isVision;
    }

    // If no exact match found, assume vision support
    console.warn(`⚠️ Model ${model} not found in version ${versionId} config, assuming vision support`);
    return true;
  } catch (error) {
    console.error('Failed to check vision support:', error);
    // Default to assuming vision support on error
    return true;
  }
}

/**
 * Save image to hidden directory and return relative path
 * Used for non-vision models that need image files
 * 
 * @param imageData - Base64 encoded image data
 * @param mediaType - Image media type (image/jpeg, image/png, etc.)
 * @param imageIndex - Index of the image
 * @param projectPath - Optional project path
 */
export function saveImageToHiddenDir(
  imageData: string,
  mediaType: string,
  imageIndex: number,
  projectPath?: string
): string {
  const cwd = projectPath || process.cwd();
  const hiddenDir = path.join(cwd, '.agentstudio-images');

  // Ensure hidden directory exists
  if (!fs.existsSync(hiddenDir)) {
    fs.mkdirSync(hiddenDir, { recursive: true });
  }

  // Determine file extension from media type
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  const ext = extMap[mediaType] || 'jpg';

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `image${imageIndex}_${timestamp}.${ext}`;
  const filepath = path.join(hiddenDir, filename);

  // Write base64 data to file
  const buffer = Buffer.from(imageData, 'base64');
  fs.writeFileSync(filepath, buffer);

  // Return relative path from project root
  return path.relative(cwd, filepath);
}

/**
 * Build user message content with optional image support
 * Handles both vision and non-vision models
 * 
 * @param message - Text message
 * @param images - Optional array of images
 * @param model - Optional model ID to check vision support
 * @param projectPath - Optional project path for saving images
 * @param claudeVersionId - Optional Claude version ID
 */
export async function buildUserMessageContent(
  message: string,
  images?: any[],
  model?: string,
  projectPath?: string,
  claudeVersionId?: string
) {
  const messageContent: any[] = [];
  let processedMessage = message;

  // Check if model supports vision (from version configuration)
  const supportsVision = model ? await isVisionModel(model, claudeVersionId) : true;

  // Process images
  if (images && images.length > 0) {
    console.log('📸 Processing images:', images.map(img => ({
      id: img.id,
      mediaType: img.mediaType,
      filename: img.filename,
      size: img.data.length
    })));

    if (supportsVision) {
      // Vision model: add images directly to message content
      console.log('✅ Model supports vision, adding images directly to message content');
      for (const image of images) {
        messageContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType,
            data: image.data
          }
        });
      }
    } else {
      // Non-vision model: save images to hidden directory, replace placeholders with paths
      console.log('⚠️ Model does not support vision, saving images to hidden directory');
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageIndex = i + 1;
        const placeholder = `[image${imageIndex}]`;

        try {
          // Save image and get path
          const imagePath = saveImageToHiddenDir(image.data, image.mediaType, imageIndex, projectPath);
          console.log(`💾 Saved image ${imageIndex} to: ${imagePath}`);

          // Replace placeholder in message with file path (add @ prefix)
          processedMessage = processedMessage.replace(placeholder, `@${imagePath}`);
        } catch (error) {
          console.error(`Failed to save image ${imageIndex}:`, error);
          // If save fails, keep placeholder
        }
      }
    }
  }

  // Add text content if provided
  if (processedMessage && processedMessage.trim()) {
    messageContent.push({
      type: "text",
      text: processedMessage
    });
  }

  return {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: messageContent
    }
  };
}
