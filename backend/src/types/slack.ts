/**
 * Slack Integration Types
 *
 * Type definitions for Slack Bot integration with AgentStudio
 */

// Slack Event types
export interface SlackMessageEvent {
  type: 'message';
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  event_ts: string;
  channel_type: 'channel' | 'im' | 'mpim' | 'group';
}

export interface SlackAppMentionEvent {
  type: 'app_mention';
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  event_ts: string;
}

export interface SlackEventCallback {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackMessageEvent | SlackAppMentionEvent;
  type: 'event_callback';
  event_id: string;
  event_time: number;
  authorizations?: Array<{
    enterprise_id: string | null;
    team_id: string;
    user_id: string;
    is_bot: boolean;
  }>;
}

export interface SlackUrlVerificationPayload {
  token: string;
  challenge: string;
  type: 'url_verification';
}

export type SlackWebhookPayload = SlackEventCallback | SlackUrlVerificationPayload;

// Slack API Response types
export interface SlackMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  message?: {
    text: string;
    username?: string;
    bot_id?: string;
    type: string;
    subtype?: string;
    ts: string;
  };
  error?: string;
}

// Thread to Session mapping
export interface ThreadSessionMapping {
  threadTs: string;
  sessionId: string;
  channel: string;
  agentId: string;
  createdAt: number;
  lastActivity: number;
}

// Slack Bot Configuration
export interface SlackBotConfig {
  botToken: string;
  signingSecret: string;
  appToken?: string;
  defaultAgentId: string;
}
