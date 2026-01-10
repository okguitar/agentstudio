/**
 * A2A Query Service - One-shot Query Mode
 * 
 * This service provides a one-shot query mode for A2A requests.
 * Instead of using ClaudeSession (Streaming Input Mode with MessageQueue),
 * it uses an async generator that naturally completes after yielding the message.
 * 
 * Benefits:
 * - Each A2A request is independent, no session reuse issues
 * - Query automatically completes when generator ends
 * - Still supports resume for history context
 * - Still supports images and multi-part messages via Streaming Input
 */

import { query, Options } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

/**
 * User message content type for multi-part messages (text + images)
 */
export interface UserMessageContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

/**
 * A2A Query options extending Claude SDK Options
 */
export interface A2AQueryOptions extends Options {
  resume?: string;
}

/**
 * Create an async generator for A2A messages
 * The generator yields the user message and then completes,
 * allowing the query to naturally finish.
 * 
 * Uses 'any' type to match MessageQueue's approach and avoid SDK type incompatibility.
 * 
 * @param content - Message content (string or array of content blocks)
 */
async function* createA2AMessageGenerator(
  content: string | UserMessageContent[]
): AsyncGenerator<any, void, unknown> {
  const messageContent = typeof content === 'string'
    ? [{ type: 'text' as const, text: content }]
    : content;

  yield {
    type: 'user' as const,
    message: {
      role: 'user' as const,
      content: messageContent
    }
  };
  // Generator ends here, query will naturally complete after processing
}

/**
 * Execute a one-shot A2A query
 * 
 * This function creates a new query for each A2A request, using an async generator
 * that completes after yielding the message. This avoids the session reuse issues
 * that can occur with ClaudeSession's MessageQueue approach.
 * 
 * @param message - The user message (text string)
 * @param images - Optional array of images to include in the message
 * @param options - Query options including resume sessionId
 * @param onMessage - Callback for each SDK message
 * @returns Promise that resolves when query completes
 */
export async function executeA2AQuery(
  message: string,
  images: Array<{ data: string; mediaType: string }> | undefined,
  options: A2AQueryOptions,
  onMessage: (message: SDKMessage) => Promise<void>
): Promise<{ sessionId: string | null; fullResponse: string; tokensUsed: number }> {
  // Build message content with optional images
  const messageContent: UserMessageContent[] = [];
  
  // Add images first if present
  if (images && images.length > 0) {
    for (const image of images) {
      messageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.mediaType,
          data: image.data
        }
      });
    }
  }
  
  // Add text message
  messageContent.push({
    type: 'text',
    text: message
  });

  // Create the message generator
  const messageGen = createA2AMessageGenerator(messageContent);

  let sessionId: string | null = null;
  let fullResponse = '';
  let tokensUsed = 0;

  console.log(`🚀 [A2A Query] Starting one-shot query with resume=${options.resume || 'none'}`);

  // Execute the query
  const queryResult = query({
    prompt: messageGen,
    options: options
  });

  // Process responses
  for await (const sdkMessage of queryResult) {
    // Capture session ID from system init message
    if (sdkMessage.type === 'system' && sdkMessage.subtype === 'init' && sdkMessage.session_id) {
      sessionId = sdkMessage.session_id;
      console.log(`📝 [A2A Query] Captured sessionId: ${sessionId}`);
    }

    // Also check for session_id on any message
    if ((sdkMessage as any).session_id && !sessionId) {
      sessionId = (sdkMessage as any).session_id;
    }

    // Extract assistant response text
    if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
      for (const block of sdkMessage.message.content) {
        if (block.type === 'text') {
          fullResponse += block.text;
        }
      }
    }

    // Extract token usage
    if (sdkMessage.type === 'assistant' && (sdkMessage as any).usage) {
      const usage = (sdkMessage as any).usage;
      tokensUsed = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    }

    // Call the message callback
    await onMessage(sdkMessage);
  }

  console.log(`✅ [A2A Query] Query completed, sessionId=${sessionId}, responseLength=${fullResponse.length}`);

  return { sessionId, fullResponse, tokensUsed };
}

/**
 * Execute a one-shot A2A query with SSE streaming
 * 
 * Similar to executeA2AQuery but designed for SSE streaming mode.
 * 
 * @param message - The user message (text string)
 * @param images - Optional array of images
 * @param options - Query options including resume sessionId
 * @param onMessage - Callback for each SDK message (for SSE streaming)
 */
export async function executeA2AQueryStreaming(
  message: string,
  images: Array<{ data: string; mediaType: string }> | undefined,
  options: A2AQueryOptions,
  onMessage: (message: SDKMessage) => void
): Promise<{ sessionId: string | null }> {
  // Build message content with optional images
  const messageContent: UserMessageContent[] = [];
  
  if (images && images.length > 0) {
    for (const image of images) {
      messageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.mediaType,
          data: image.data
        }
      });
    }
  }
  
  messageContent.push({
    type: 'text',
    text: message
  });

  const messageGen = createA2AMessageGenerator(messageContent);

  let sessionId: string | null = null;

  console.log(`🚀 [A2A Query Streaming] Starting one-shot query with resume=${options.resume || 'none'}`);

  const queryResult = query({
    prompt: messageGen,
    options: options
  });

  for await (const sdkMessage of queryResult) {
    // Capture session ID
    if (sdkMessage.type === 'system' && sdkMessage.subtype === 'init' && sdkMessage.session_id) {
      sessionId = sdkMessage.session_id;
    }
    if ((sdkMessage as any).session_id && !sessionId) {
      sessionId = (sdkMessage as any).session_id;
    }

    // Stream the message (synchronous callback for SSE)
    onMessage(sdkMessage);
  }

  console.log(`✅ [A2A Query Streaming] Query completed, sessionId=${sessionId}`);

  return { sessionId };
}
