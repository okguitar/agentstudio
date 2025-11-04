/**
 * Slack Thread to Claude Session Mapper
 *
 * Manages the mapping between Slack thread_ts and Claude sessionIds
 * Enables conversation continuity across multiple messages
 */

import type { ThreadSessionMapping } from '../types/slack.js';

export class SlackThreadMapper {
  // Main index: threadTs -> mapping
  private mappings: Map<string, ThreadSessionMapping> = new Map();

  // Reverse index: sessionId -> threadTs (for lookups)
  private sessionToThread: Map<string, string> = new Map();

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout;
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
  private readonly mappingTimeoutMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Periodic cleanup of old mappings
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMappings();
    }, this.cleanupIntervalMs);

    console.log('📋 SlackThreadMapper initialized');
  }

  /**
   * Get session ID for a Slack thread
   */
  getSessionId(threadTs: string, channel: string): string | null {
    const key = this.makeKey(threadTs, channel);
    const mapping = this.mappings.get(key);

    if (mapping) {
      // Update last activity
      mapping.lastActivity = Date.now();
      return mapping.sessionId;
    }

    return null;
  }

  /**
   * Create or update mapping
   * Handles session ID updates when Claude Code resume returns a new session_id
   */
  setMapping(params: {
    threadTs: string;
    channel: string;
    sessionId: string;
    agentId: string;
    projectId?: string;
    projectPath?: string;
  }): void {
    const key = this.makeKey(params.threadTs, params.channel);
    const now = Date.now();

    // Check if there's an existing mapping for this thread
    const existingMapping = this.mappings.get(key);
    if (existingMapping && existingMapping.sessionId !== params.sessionId) {
      // Session ID has changed (e.g., due to Claude Code resume)
      // Remove old sessionId -> thread mapping to prevent memory leaks
      console.log(`🔄 Session ID changed for thread ${params.threadTs}: ${existingMapping.sessionId} -> ${params.sessionId}`);
      this.sessionToThread.delete(existingMapping.sessionId);
    }

    const mapping: ThreadSessionMapping = {
      threadTs: params.threadTs,
      sessionId: params.sessionId,
      channel: params.channel,
      agentId: params.agentId,
      projectId: params.projectId,
      projectPath: params.projectPath,
      createdAt: existingMapping?.createdAt || now, // Preserve original creation time
      lastActivity: now
    };

    this.mappings.set(key, mapping);
    this.sessionToThread.set(params.sessionId, key);

    const projectInfo = params.projectId ? ` (project: ${params.projectId})` : '';
    console.log(`✅ Mapped Slack thread ${params.threadTs} -> session ${params.sessionId}${projectInfo}`);
  }

  /**
   * Get thread for a session ID (reverse lookup)
   */
  getThreadForSession(sessionId: string): ThreadSessionMapping | null {
    const key = this.sessionToThread.get(sessionId);
    if (!key) return null;

    return this.mappings.get(key) || null;
  }

  /**
   * Remove mapping
   */
  removeMapping(threadTs: string, channel: string): boolean {
    const key = this.makeKey(threadTs, channel);
    const mapping = this.mappings.get(key);

    if (mapping) {
      this.mappings.delete(key);
      this.sessionToThread.delete(mapping.sessionId);
      console.log(`🗑️  Removed mapping for thread ${threadTs}`);
      return true;
    }

    return false;
  }

  /**
   * Get all active mappings
   */
  getAllMappings(): ThreadSessionMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Cleanup old mappings
   */
  private cleanupOldMappings(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, mapping] of this.mappings.entries()) {
      if (now - mapping.lastActivity > this.mappingTimeoutMs) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaning up ${expiredKeys.length} expired Slack thread mappings`);

      for (const key of expiredKeys) {
        const mapping = this.mappings.get(key);
        if (mapping) {
          this.sessionToThread.delete(mapping.sessionId);
          this.mappings.delete(key);
        }
      }

      console.log(`✅ Cleaned up ${expiredKeys.length} expired mappings`);
    }
  }

  /**
   * Make unique key from thread and channel
   */
  private makeKey(threadTs: string, channel: string): string {
    return `${channel}:${threadTs}`;
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    clearInterval(this.cleanupInterval);
    this.mappings.clear();
    this.sessionToThread.clear();
    console.log('✅ SlackThreadMapper shutdown complete');
  }
}

// Global singleton
export const slackThreadMapper = new SlackThreadMapper();
