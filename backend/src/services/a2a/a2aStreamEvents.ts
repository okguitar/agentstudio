/**
 * A2A Stream Events
 * 
 * Global EventEmitter for notifying about A2A streaming call status.
 * This allows the MCP tool to communicate with the main SSE stream
 * to notify the frontend about new streaming sessions.
 * 
 * Uses A2A standard protocol event types:
 * - Message: Direct response message
 * - Task: Task object for complex processing
 * - TaskStatusUpdateEvent: Task status updates with optional message content
 * - TaskArtifactUpdateEvent: Artifact updates (files, data)
 */

import { EventEmitter } from 'events';

// Import A2A standard types
import type {
  Message,
  Task,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  Part,
  TextPart,
  FilePart,
  DataPart,
  TaskState,
} from '@a2a-js/sdk';

// Re-export A2A types for use in other modules
export type {
  Message,
  Task,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  Part,
  TextPart,
  FilePart,
  DataPart,
  TaskState,
};

/**
 * A2A Stream Event Data - union of all possible A2A streaming events
 */
export type A2AStreamEventData = Message | Task | TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

/**
 * Event payload for A2A stream start notification
 */
export interface A2AStreamStartEvent {
  type: 'a2a_stream_start';
  sessionId: string;
  contextId?: string;  // A2A contextId for task correlation
  taskId?: string;     // A2A taskId if available
  projectId: string;
  agentUrl: string;
  message: string;
  timestamp: number;
}

/**
 * Event payload for A2A stream data notification (A2A standard event)
 */
export interface A2AStreamDataEvent {
  type: 'a2a_stream_data';
  sessionId: string;
  projectId: string;
  agentUrl: string;           // Agent URL for frontend matching
  event: A2AStreamEventData;  // The actual A2A standard event
  timestamp: number;
}

/**
 * Event payload for A2A stream end notification
 */
export interface A2AStreamEndEvent {
  type: 'a2a_stream_end';
  sessionId: string;
  projectId: string;
  success: boolean;
  error?: string;
  finalState?: TaskState;  // Final task state if available
  timestamp: number;
}

export type A2AStreamEvent = A2AStreamStartEvent | A2AStreamDataEvent | A2AStreamEndEvent;

/**
 * Global EventEmitter for A2A stream notifications
 * 
 * Events:
 * - 'a2a_stream_start': Emitted when a streaming A2A call begins
 * - 'a2a_stream_data': Emitted for each A2A standard event received
 * - 'a2a_stream_end': Emitted when the streaming call completes
 */
class A2AStreamEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners since multiple SSE connections may listen
    this.setMaxListeners(100);
  }

  /**
   * Emit a2a_stream_start event
   */
  emitStreamStart(payload: Omit<A2AStreamStartEvent, 'type' | 'timestamp'>): void {
    const event: A2AStreamStartEvent = {
      ...payload,
      type: 'a2a_stream_start',
      timestamp: Date.now(),
    };
    this.emit('a2a_stream_start', event);
  }

  /**
   * Emit a2a_stream_data event with A2A standard event
   */
  emitStreamData(payload: Omit<A2AStreamDataEvent, 'type' | 'timestamp'>): void {
    const event: A2AStreamDataEvent = {
      ...payload,
      type: 'a2a_stream_data',
      timestamp: Date.now(),
    };
    this.emit('a2a_stream_data', event);
  }

  /**
   * Emit a2a_stream_end event
   */
  emitStreamEnd(payload: Omit<A2AStreamEndEvent, 'type' | 'timestamp'>): void {
    const event: A2AStreamEndEvent = {
      ...payload,
      type: 'a2a_stream_end',
      timestamp: Date.now(),
    };
    this.emit('a2a_stream_end', event);
  }
}

// Singleton instance
export const a2aStreamEventEmitter = new A2AStreamEventEmitter();

/**
 * Helper function to extract text content from A2A Part array
 */
export function extractTextFromParts(parts: Part[]): string {
  return parts
    .filter((part): part is TextPart => part.kind === 'text')
    .map(part => part.text)
    .join('');
}

/**
 * Helper function to create a text part
 */
export function createTextPart(text: string): TextPart {
  return { kind: 'text', text };
}

/**
 * Helper function to determine if an event is final (stream should close)
 */
export function isTerminalState(state: TaskState): boolean {
  return ['completed', 'failed', 'canceled', 'rejected'].includes(state);
}
