/**
 * Agent Card LRU Cache
 *
 * Implements optional caching for Agent Cards with automatic invalidation
 * based on agent configuration hash changes.
 *
 * Features:
 * - LRU eviction with configurable max size (default 100 entries)
 * - Hash-based cache keys (deterministic from agent config)
 * - O(1) get/set operations
 * - Thread-safe for single-process deployments
 *
 * Phase 4: US2 - Agent Card Auto-Generation (T042)
 */

import crypto from 'crypto';
import type { AgentConfig } from '../types/agents.js';
import type { AgentCard } from '../types/a2a.js';
import type { ProjectContext } from '../services/a2a/agentCardService.js';

/**
 * LRU Cache node
 */
interface CacheNode {
  key: string;
  value: AgentCard;
  prev: CacheNode | null;
  next: CacheNode | null;
}

/**
 * Agent Card LRU Cache implementation
 */
export class AgentCardCache {
  private maxSize: number;
  private cache: Map<string, CacheNode>;
  private head: CacheNode | null;
  private tail: CacheNode | null;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get Agent Card from cache
   *
   * @param agentConfig - Agent configuration for hash calculation
   * @param projectContext - Project context for hash calculation
   * @returns Cached Agent Card or null if not found or expired
   */
  get(agentConfig: AgentConfig, projectContext: ProjectContext): AgentCard | null {
    const key = this.generateCacheKey(agentConfig, projectContext);
    const node = this.cache.get(key);

    if (!node) {
      return null;
    }

    // Move accessed node to head (most recently used)
    this.moveToHead(node);

    return node.value;
  }

  /**
   * Set Agent Card in cache
   *
   * @param agentConfig - Agent configuration for hash calculation
   * @param projectContext - Project context for hash calculation
   * @param agentCard - Agent Card to cache
   */
  set(agentConfig: AgentConfig, projectContext: ProjectContext, agentCard: AgentCard): void {
    const key = this.generateCacheKey(agentConfig, projectContext);
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing node
      existingNode.value = agentCard;
      this.moveToHead(existingNode);
      return;
    }

    // Create new node
    const newNode: CacheNode = {
      key,
      value: agentCard,
      prev: null,
      next: null,
    };

    this.cache.set(key, newNode);
    this.addToHead(newNode);

    // Check if cache size exceeded
    if (this.cache.size > this.maxSize) {
      // Remove least recently used (tail)
      if (this.tail) {
        this.cache.delete(this.tail.key);
        this.removeTail();
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Invalidate cache entry for specific agent config
   *
   * @param agentConfig - Agent configuration
   * @param projectContext - Project context
   * @returns true if entry was found and removed, false otherwise
   */
  invalidate(agentConfig: AgentConfig, projectContext: ProjectContext): boolean {
    const key = this.generateCacheKey(agentConfig, projectContext);
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.cache.delete(key);
    this.removeNode(node);
    return true;
  }

  /**
   * Generate cache key from agent config and project context
   *
   * Uses SHA-256 hash of deterministic JSON serialization.
   * Hash includes:
   * - Agent config fields that affect Agent Card (name, version, tools, etc.)
   * - Project context (projectId, a2aAgentId, baseUrl)
   *
   * @param agentConfig - Agent configuration
   * @param projectContext - Project context
   * @returns SHA-256 hash as cache key
   */
  private generateCacheKey(agentConfig: AgentConfig, projectContext: ProjectContext): string {
    // Extract relevant fields from agent config (exclude timestamps)
    const relevantConfig = {
      id: agentConfig.id,
      name: agentConfig.name,
      description: agentConfig.description,
      version: agentConfig.version,
      allowedTools: agentConfig.allowedTools,
      source: agentConfig.source,
    };

    // Combine with project context
    const cacheData = {
      agentConfig: relevantConfig,
      projectContext: {
        projectId: projectContext.projectId,
        a2aAgentId: projectContext.a2aAgentId,
        baseUrl: projectContext.baseUrl,
      },
    };

    // Generate deterministic hash
    const json = JSON.stringify(cacheData, Object.keys(cacheData).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Move node to head (most recently used)
   */
  private moveToHead(node: CacheNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Add node to head
   */
  private addToHead(node: CacheNode): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove node from linked list
   */
  private removeNode(node: CacheNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Remove tail node (least recently used)
   */
  private removeTail(): void {
    if (!this.tail) {
      return;
    }

    if (this.tail.prev) {
      this.tail.prev.next = null;
    } else {
      this.head = null;
    }

    this.tail = this.tail.prev;
  }
}

/**
 * Global singleton cache instance
 */
export const agentCardCache = new AgentCardCache(100);
