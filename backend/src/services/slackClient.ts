/**
 * Slack Web API Client
 *
 * Lightweight wrapper around Slack's Web API
 * Handles message posting and updates
 */

import type { SlackMessageResponse } from '../types/slack.js';

export class SlackClient {
  private botToken: string;
  private baseUrl = 'https://slack.com/api';

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  /**
   * Post a message to a Slack channel
   */
  async postMessage(params: {
    channel: string;
    text: string;
    thread_ts?: string;
    blocks?: any[];
  }): Promise<SlackMessageResponse> {
    const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.botToken}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    return response.json() as Promise<SlackMessageResponse>;
  }

  /**
   * Update an existing message
   */
  async updateMessage(params: {
    channel: string;
    ts: string;
    text: string;
    blocks?: any[];
  }): Promise<SlackMessageResponse> {
    const response = await fetch(`${this.baseUrl}/chat.update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.botToken}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    return response.json() as Promise<SlackMessageResponse>;
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(params: {
    channel: string;
    timestamp: string;
    name: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch(`${this.baseUrl}/reactions.add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.botToken}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    return response.json() as Promise<{ ok: boolean; error?: string }>;
  }
}
