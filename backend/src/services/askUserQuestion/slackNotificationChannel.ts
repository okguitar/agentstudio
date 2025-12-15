/**
 * Slack Notification Channel
 * 
 * 实现通过 Slack 消息向用户发送通知
 * 使用 Slack Block Kit 创建交互式消息
 */

import type { NotificationChannel, UserInputRequest, ChannelType } from './notificationChannel.js';
import { SlackClient } from '../slackClient.js';

/**
 * Slack 通知渠道实现
 */
export class SlackNotificationChannel implements NotificationChannel {
  type: ChannelType = 'slack';
  channelId: string;  // 格式: channel_id:thread_ts
  sessionId: string;
  agentId: string;
  createdAt: number;
  
  private slackClient: SlackClient;
  private slackChannelId: string;
  private threadTs: string;
  private active: boolean = true;
  
  constructor(
    slackClient: SlackClient,
    slackChannelId: string,
    threadTs: string,
    sessionId: string,
    agentId: string
  ) {
    this.slackClient = slackClient;
    this.slackChannelId = slackChannelId;
    this.threadTs = threadTs;
    this.channelId = `slack_${slackChannelId}_${threadTs}`;
    this.sessionId = sessionId;
    this.agentId = agentId;
    this.createdAt = Date.now();
  }
  
  isActive(): boolean {
    return this.active;
  }
  
  async sendAwaitingInput(request: UserInputRequest): Promise<boolean> {
    if (!this.isActive()) {
      return false;
    }
    
    try {
      // 构建 Slack Block Kit 消息
      const blocks = this.buildQuestionBlocks(request);
      
      await this.slackClient.postMessage({
        channel: this.slackChannelId,
        thread_ts: this.threadTs,
        text: '🎤 AI 需要您的反馈来继续',
        blocks,
      });
      
      console.log(`📤 [SlackChannel] Sent awaiting_user_input to channel: ${this.channelId}`);
      return true;
    } catch (error) {
      console.error(`❌ [SlackChannel] Failed to send message:`, error);
      return false;
    }
  }
  
  close(): void {
    this.active = false;
  }
  
  /**
   * 构建 Slack Block Kit 格式的问题消息
   */
  private buildQuestionBlocks(request: UserInputRequest): any[] {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎤 AI 需要您的反馈',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `请回答以下问题以继续。\n\n*提示*: 回复时请在消息开头加上问题编号，如 \`Q1: 选项A\``
        }
      },
      {
        type: 'divider'
      }
    ];
    
    // 添加每个问题
    request.questions.forEach((question, index) => {
      // 问题标题
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Q${index + 1}. ${question.question}*${question.multiSelect ? ' _(可多选)_' : ''}`
        }
      });
      
      // 选项列表
      const optionText = question.options
        .map((opt, i) => `• *${opt.label}*: ${opt.description}`)
        .join('\n');
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: optionText
        }
      });
      
      blocks.push({
        type: 'divider'
      });
    });
    
    // 添加提示
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📝 请直接回复此消息来提交您的答案 | Tool ID: \`${request.toolUseId}\``
        }
      ]
    });
    
    return blocks;
  }
}

/**
 * 生成 Slack channel ID
 */
export function generateSlackChannelId(slackChannelId: string, threadTs: string): string {
  return `slack_${slackChannelId}_${threadTs}`;
}


