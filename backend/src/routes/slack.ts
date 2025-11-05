/**
 * Slack Integration Routes
 *
 * Handles Slack Events API webhooks
 * Includes signature verification and event routing
 */

import express from 'express';
import * as crypto from 'crypto';
import { SlackAIService } from '../services/slackAIService.js';
import { getSlackConfig } from '../config/index.js';
import type {
  SlackWebhookPayload,
  SlackEventCallback,
  SlackUrlVerificationPayload,
  SlackMessageEvent,
  SlackAppMentionEvent
} from '../types/slack.js';

const router: express.Router = express.Router();

// Initialize Slack AI Service
let slackAIService: SlackAIService | null = null;

/**
 * Verify Slack request signature
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
function verifySlackSignature(
  signingSecret: string,
  requestBody: string,
  timestamp: string,
  signature: string
): boolean {
  // Prevent replay attacks (request must be within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    console.warn('⚠️ Slack request timestamp too old');
    return false;
  }

  // Compute expected signature
  const sigBasestring = `v0:${timestamp}:${requestBody}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');

  // Compare signatures (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}

/**
 * Middleware to verify Slack requests
 */
async function verifySlackRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  const { signingSecret } = await getSlackConfig();

  if (!signingSecret) {
    console.error('❌ SLACK_SIGNING_SECRET not configured');
    return res.status(500).json({ error: 'Slack integration not configured' });
  }

  const slackSignature = req.headers['x-slack-signature'] as string;
  const slackTimestamp = req.headers['x-slack-request-timestamp'] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  console.log('🔍 Debug signature verification:', {
    hasRawBody: !!(req as any).rawBody,
    rawBodyLength: rawBody.length,
    timestamp: slackTimestamp,
    signature: slackSignature?.substring(0, 10) + '...'
  });

  if (!slackSignature || !slackTimestamp) {
    console.warn('⚠️ Missing Slack signature headers');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isValid = verifySlackSignature(signingSecret, rawBody, slackTimestamp, slackSignature);

  if (!isValid) {
    console.warn('⚠️ Invalid Slack signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

/**
 * Initialize Slack AI Service
 */
async function initSlackAIService(): Promise<SlackAIService> {
  if (!slackAIService) {
    const { botToken, defaultAgentId } = await getSlackConfig();

    if (!botToken) {
      throw new Error('SLACK_BOT_TOKEN not configured');
    }

    slackAIService = new SlackAIService(botToken, defaultAgentId!);
    console.log('✅ SlackAIService initialized');
  }

  return slackAIService;
}

/**
 * POST /api/slack/events
 * Main webhook endpoint for Slack Events API
 */
router.post('/events', verifySlackRequest, async (req, res) => {
  try {
    const payload = req.body as SlackWebhookPayload;

    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      const verification = payload as SlackUrlVerificationPayload;
      console.log('✅ Slack URL verification challenge received');
      return res.json({ challenge: verification.challenge });
    }

    // Handle event callbacks
    if (payload.type === 'event_callback') {
      const eventPayload = payload as SlackEventCallback;
      const event = eventPayload.event;

      console.log(`📨 Received Slack event: ${event.type}`);

      // Immediately respond with 200 OK (Slack requires response within 3 seconds)
      res.status(200).json({ ok: true });

      // Process event asynchronously
      try {
        const service = await initSlackAIService();

        // Handle different event types
        if (event.type === 'message') {
          // Ignore bot messages to prevent loops
          if ('bot_id' in event || 'subtype' in event) {
            console.log('🤖 Ignoring bot message or subtype message');
            return;
          }

          // Process message
          await service.handleMessage(event as SlackMessageEvent);
        } else if (event.type === 'app_mention') {
          // Process mention
          await service.handleMessage(event as SlackAppMentionEvent);
        } else {
          console.log(`ℹ️  Unhandled event type: ${(event as any).type}`);
        }
      } catch (error) {
        console.error('❌ Error processing Slack event:', error);
        // Don't send error to Slack response (already responded with 200)
      }

      return;
    }

    // Unknown payload type
    console.warn('⚠️ Unknown Slack payload type:', payload);
    res.status(400).json({ error: 'Unknown payload type' });

  } catch (error) {
    console.error('❌ Error handling Slack webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/slack/status
 * Health check endpoint for Slack integration
 */
router.get('/status', async (req, res) => {
  const { botToken, signingSecret, defaultAgentId, defaultProject, enableStreaming } = await getSlackConfig();
  const isConfigured = !!(botToken && signingSecret);

  res.json({
    configured: isConfigured,
    botToken: botToken ? 'set' : 'not set',
    signingSecret: signingSecret ? 'set' : 'not set',
    defaultAgentId,
    defaultProject: defaultProject ? defaultProject : 'not set',
    enableStreaming,
    serviceInitialized: slackAIService !== null
  });
});

export default router;
