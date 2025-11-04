/**
 * Unit tests for slackThreadMapper.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SlackThreadMapper } from '../slackThreadMapper.js';

describe('SlackThreadMapper', () => {
  let mapper: SlackThreadMapper;

  beforeEach(() => {
    mapper = new SlackThreadMapper();
  });

  describe('setMapping', () => {
    it('should create a new mapping', () => {
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-1',
        agentId: 'test-agent'
      });

      const sessionId = mapper.getSessionId('1234567890.123456', 'C123');
      expect(sessionId).toBe('session-1');
    });

    it('should update mapping when session ID changes (Claude Code resume)', () => {
      // Initial mapping
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-1',
        agentId: 'test-agent',
        projectId: 'my-project'
      });

      // Verify initial mapping
      let sessionId = mapper.getSessionId('1234567890.123456', 'C123');
      expect(sessionId).toBe('session-1');

      // Update with new session ID (simulating Claude Code resume)
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-2', // New session ID
        agentId: 'test-agent',
        projectId: 'my-project'
      });

      // Verify updated mapping
      sessionId = mapper.getSessionId('1234567890.123456', 'C123');
      expect(sessionId).toBe('session-2');

      // Verify old session ID reverse mapping is removed
      const threadForOldSession = mapper.getThreadForSession('session-1');
      expect(threadForOldSession).toBeNull();

      // Verify new session ID reverse mapping exists
      const threadForNewSession = mapper.getThreadForSession('session-2');
      expect(threadForNewSession).not.toBeNull();
      expect(threadForNewSession?.threadTs).toBe('1234567890.123456');
    });

    it('should preserve creation time when updating session ID', () => {
      // Initial mapping
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-1',
        agentId: 'test-agent'
      });

      const firstMapping = mapper.getThreadForSession('session-1');
      const originalCreatedAt = firstMapping?.createdAt;
      expect(originalCreatedAt).toBeDefined();

      // Wait a bit to ensure time difference
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      return delay(10).then(() => {
        // Update with new session ID
        mapper.setMapping({
          threadTs: '1234567890.123456',
          channel: 'C123',
          sessionId: 'session-2',
          agentId: 'test-agent'
        });

        const secondMapping = mapper.getThreadForSession('session-2');
        expect(secondMapping?.createdAt).toBe(originalCreatedAt);
        expect(secondMapping?.lastActivity).toBeGreaterThan(originalCreatedAt!);
      });
    });

    it('should handle project information in mapping', () => {
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-1',
        agentId: 'test-agent',
        projectId: 'my-project',
        projectPath: '/path/to/my-project'
      });

      const thread = mapper.getThreadForSession('session-1');
      expect(thread).not.toBeNull();
      expect(thread?.projectId).toBe('my-project');
      expect(thread?.projectPath).toBe('/path/to/my-project');
    });
  });

  describe('getSessionId', () => {
    it('should return session ID for existing thread', () => {
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-1',
        agentId: 'test-agent'
      });

      const sessionId = mapper.getSessionId('1234567890.123456', 'C123');
      expect(sessionId).toBe('session-1');
    });

    it('should return null for non-existent thread', () => {
      const sessionId = mapper.getSessionId('9999999999.999999', 'C123');
      expect(sessionId).toBeNull();
    });

    it('should update last activity when accessing mapping', () => {
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-1',
        agentId: 'test-agent'
      });

      const thread1 = mapper.getThreadForSession('session-1');
      const firstActivity = thread1?.lastActivity;

      // Wait a bit
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      return delay(10).then(() => {
        // Access the mapping
        mapper.getSessionId('1234567890.123456', 'C123');

        const thread2 = mapper.getThreadForSession('session-1');
        expect(thread2?.lastActivity).toBeGreaterThan(firstActivity!);
      });
    });
  });

  describe('getThreadForSession', () => {
    it('should return thread mapping for session ID', () => {
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-1',
        agentId: 'test-agent'
      });

      const thread = mapper.getThreadForSession('session-1');
      expect(thread).not.toBeNull();
      expect(thread?.threadTs).toBe('1234567890.123456');
      expect(thread?.channel).toBe('C123');
      expect(thread?.agentId).toBe('test-agent');
    });

    it('should return null for non-existent session', () => {
      const thread = mapper.getThreadForSession('non-existent');
      expect(thread).toBeNull();
    });
  });

  describe('removeMapping', () => {
    it('should remove mapping', () => {
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-1',
        agentId: 'test-agent'
      });

      const removed = mapper.removeMapping('1234567890.123456', 'C123');
      expect(removed).toBe(true);

      const sessionId = mapper.getSessionId('1234567890.123456', 'C123');
      expect(sessionId).toBeNull();

      const thread = mapper.getThreadForSession('session-1');
      expect(thread).toBeNull();
    });

    it('should return false when removing non-existent mapping', () => {
      const removed = mapper.removeMapping('9999999999.999999', 'C123');
      expect(removed).toBe(false);
    });
  });

  describe('getAllMappings', () => {
    it('should return all mappings', () => {
      mapper.setMapping({
        threadTs: '1234567890.123456',
        channel: 'C123',
        sessionId: 'session-1',
        agentId: 'test-agent-1'
      });

      mapper.setMapping({
        threadTs: '9876543210.654321',
        channel: 'C456',
        sessionId: 'session-2',
        agentId: 'test-agent-2'
      });

      const mappings = mapper.getAllMappings();
      expect(mappings.length).toBe(2);
      expect(mappings.some(m => m.sessionId === 'session-1')).toBe(true);
      expect(mappings.some(m => m.sessionId === 'session-2')).toBe(true);
    });

    it('should return empty array when no mappings', () => {
      const mappings = mapper.getAllMappings();
      expect(mappings.length).toBe(0);
    });
  });
});

