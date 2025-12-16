/**
 * A2A History Service
 *
 * Manages the persistence of A2A message history using JSONL files.
 * This allows retrieving the full event stream of an external agent call later.
 *
 * Storage path: {workingDirectory}/.a2a/history/{sessionId}.jsonl
 */

import fs from 'fs/promises';
import path from 'path';
import { ensureDir } from '../../utils/fileUtils.js';
import { Buffer } from 'buffer';

export class A2AHistoryService {
  /**
   * Get the directory path for A2A history
   */
  private getHistoryDir(workingDirectory: string): string {
    return path.join(workingDirectory, '.a2a', 'history');
  }

  /**
   * Get the file path for a specific session
   */
  private getHistoryFilePath(workingDirectory: string, sessionId: string): string {
    return path.join(this.getHistoryDir(workingDirectory), `${sessionId}.jsonl`);
  }

  /**
   * Append an event to the history file
   */
  async appendEvent(workingDirectory: string, sessionId: string, event: any): Promise<void> {
    const historyDir = this.getHistoryDir(workingDirectory);
    await ensureDir(historyDir);

    const filePath = this.getHistoryFilePath(workingDirectory, sessionId);
    const line = JSON.stringify(event) + '\n';

    await fs.appendFile(filePath, line, 'utf-8');
  }

  /**
   * Read the full history for a session
   */
  async getHistory(workingDirectory: string, sessionId: string): Promise<any[]> {
    const filePath = this.getHistoryFilePath(workingDirectory, sessionId);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => JSON.parse(line));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Watch the history file and yield new lines as they are written
   */
  async *tailHistory(workingDirectory: string, sessionId: string, signal?: AbortSignal): AsyncGenerator<any> {
    const filePath = this.getHistoryFilePath(workingDirectory, sessionId);
    let currentSize = 0;

    // Wait for file to exist
    while (!signal?.aborted) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    while (!signal?.aborted) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > currentSize) {
          const handle = await fs.open(filePath, 'r');
          const buffer = Buffer.alloc(stats.size - currentSize);
          await handle.read(buffer, 0, stats.size - currentSize, currentSize);
          await handle.close();

          const content = buffer.toString('utf-8');
          const lines = content.split('\n').filter((line: string) => line.trim());

          for (const line of lines) {
            try {
              yield JSON.parse(line);
            } catch {
              // Ignore parse errors
            }
          }

          currentSize = stats.size;
        }
      } catch {
        // Ignore errors (e.g. file not found yet)
      }

      await new Promise(resolve => setTimeout(resolve, 200)); // Poll every 200ms
    }
  }
}

export const a2aHistoryService = new A2AHistoryService();
