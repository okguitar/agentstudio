/**
 * Communication channel for AI chat requests
 * Determines streaming granularity:
 * - 'web': Fine-grained character-by-character streaming
 * - 'slack': Block-based streaming (existing behavior)
 */
export type ChannelType = 'web' | 'slack';

/**
 * Default channel when not specified (web for backward compatibility)
 */
export const DEFAULT_CHANNEL: ChannelType = 'web';

