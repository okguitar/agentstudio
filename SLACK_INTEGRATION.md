# Slack Integration for AgentStudio

This document describes how to integrate AgentStudio with Slack to enable AI-powered chat through Slack channels and direct messages.

## Features

- 🤖 AI-powered chat responses in Slack channels and DMs
- 💬 Multi-turn conversations with context retention
- 🔄 Automatic session management using Slack threads
- 🛠️ Full access to AgentStudio's AI agent capabilities
- 🔒 Secure signature verification for all Slack webhooks
- ⚡ Non-blocking async processing (responds within 3 seconds)

## Architecture

The Slack integration is **completely independent** from the existing SSE-based web chat:

- **Zero impact** on existing Web UI functionality
- **Reuses** core AI services (sessionManager, AgentStorage, Claude Code SDK)
- **New components**:
  - `backend/src/routes/slack.ts` - Webhook handler
  - `backend/src/services/slackAIService.ts` - AI adapter for Slack
  - `backend/src/services/slackClient.ts` - Slack API client
  - `backend/src/services/slackThreadMapper.ts` - Thread ↔ Session mapping
  - `backend/src/types/slack.ts` - Type definitions

## Setup Instructions

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Enter app name (e.g., "AgentStudio Bot")
4. Select your workspace
5. Click **"Create App"**

### 2. Configure OAuth & Permissions

1. In your app settings, go to **"OAuth & Permissions"**
2. Add the following **Bot Token Scopes**:
   - `app_mentions:read` - Read messages that mention your bot
   - `channels:history` - View messages in public channels
   - `channels:read` - View basic channel info
   - `chat:write` - Send messages as the bot
   - `im:history` - View messages in DMs
   - `im:read` - View basic DM info
   - `im:write` - Send DMs
3. Scroll up and click **"Install to Workspace"**
4. Authorize the app
5. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 3. Enable Event Subscriptions

1. Go to **"Event Subscriptions"**
2. Toggle **"Enable Events"** to ON
3. Set **"Request URL"** to: `https://your-backend-domain.com/api/slack/events`
   - Example: `https://agentstudio.cc/api/slack/events`
   - **Note**: URL must be publicly accessible for Slack verification
4. Under **"Subscribe to bot events"**, add:
   - `app_mention` - Bot is mentioned in channel
   - `message.channels` - Messages in public channels (if bot is invited)
   - `message.im` - Direct messages to bot
5. Click **"Save Changes"**

### 4. Get Signing Secret

1. Go to **"Basic Information"**
2. Under **"App Credentials"**, find **"Signing Secret"**
3. Click **"Show"** and copy the value

### 5. Configure Backend Environment

Create or update `backend/.env`:

```env
# Existing configuration...
ANTHROPIC_API_KEY=your_anthropic_api_key

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_DEFAULT_AGENT_ID=slack-chat-agent
```

### 6. Create Slack Agent Configuration

Create a custom agent for Slack interactions:

1. In AgentStudio Web UI, go to **Agent Management**
2. Create a new agent with:
   - **ID**: `slack-chat-agent`
   - **Name**: Slack Chat Assistant
   - **System Prompt**: Customize for Slack context
   - **Tools**: Enable desired tools (Read, Write, Bash, etc.)
   - **Permission Mode**: `acceptEdits` or `bypassPermissions`

**Or** manually create the agent configuration file:

```bash
# Location: ~/.claude-agent/agents/slack-chat-agent.json
```

```json
{
  "id": "slack-chat-agent",
  "name": "Slack Chat Assistant",
  "description": "AI assistant for Slack conversations",
  "version": "1.0.0",
  "author": "your-name",
  "systemPrompt": "You are a helpful AI assistant integrated with Slack. Be concise and friendly. Format responses for readability in Slack.",
  "maxTurns": 25,
  "permissionMode": "acceptEdits",
  "model": "claude-sonnet-4-20250514",
  "allowedTools": [
    { "name": "Read", "enabled": true },
    { "name": "Write", "enabled": true },
    { "name": "Bash", "enabled": false },
    { "name": "Glob", "enabled": true },
    { "name": "Grep", "enabled": true }
  ],
  "ui": {
    "icon": "💬",
    "primaryColor": "#4A154B",
    "headerTitle": "Slack Chat",
    "headerDescription": "Chat with AI in Slack",
    "componentType": "chat"
  },
  "enabled": true
}
```

### 7. Start Backend Server

```bash
cd backend
pnpm install
pnpm run dev
```

For production:

```bash
pnpm run build
pnpm start
```

### 8. Verify Integration

1. Check status endpoint:
   ```bash
   curl http://localhost:4936/api/slack/status
   ```

2. Expected response:
   ```json
   {
     "configured": true,
     "botToken": "set",
     "signingSecret": "set",
     "defaultAgentId": "slack-chat-agent",
     "serviceInitialized": false
   }
   ```

3. Test in Slack:
   - Direct message your bot
   - Mention bot in a channel: `@AgentStudio Bot hello`
   - Bot should respond with AI-generated reply

## Usage

### Direct Messages

1. Open a DM with your bot
2. Send any message
3. Bot will respond with AI-generated content

### Channel Mentions

1. Invite bot to a channel: `/invite @AgentStudio Bot`
2. Mention the bot: `@AgentStudio Bot can you help me?`
3. Bot will respond in the thread

### Thread Conversations

- All replies are automatically posted in threads
- Conversations maintain context across multiple messages
- Each Slack thread maps to a unique Claude session

## How It Works

```
Slack User Message
    ↓
Slack Events API → POST /api/slack/events
    ↓
Signature Verification
    ↓
SlackAIService.handleMessage()
    ↓
┌─────────────────────────────────────┐
│ Thread Mapper                       │
│ (Get or Create Session)             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Session Manager (Reused)            │
│ - Get existing session              │
│ - Or create new Claude session      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Agent Configuration (Reused)        │
│ - Load slack-chat-agent config      │
│ - Build query options               │
└─────────────────────────────────────┘
    ↓
Send to Claude Code SDK
    ↓
Stream AI Response
    ↓
Update Slack Message
    ↓
User sees final response
```

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_BOT_TOKEN` | Yes | - | Bot User OAuth Token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Yes | - | Signing secret for webhook verification |
| `SLACK_APP_TOKEN` | No | - | App-level token (for Socket Mode, future) |
| `SLACK_DEFAULT_AGENT_ID` | No | `slack-chat-agent` | Agent ID to use for Slack conversations |

### Agent Customization

Customize the Slack agent behavior by editing the agent configuration:

```json
{
  "systemPrompt": "Custom instructions for Slack context...",
  "maxTurns": 30,
  "permissionMode": "bypassPermissions",
  "allowedTools": [...]
}
```

## Troubleshooting

### Bot doesn't respond

1. Check backend logs for errors
2. Verify environment variables are set:
   ```bash
   curl http://localhost:4936/api/slack/status
   ```
3. Ensure Event Subscriptions URL is correct and publicly accessible
4. Check Slack app Event Subscriptions page for delivery errors

### "Invalid signature" errors

- Verify `SLACK_SIGNING_SECRET` matches app settings
- Check system clock is synchronized (signature includes timestamp)

### "Agent not found" errors

- Ensure `slack-chat-agent` exists
- Check agent is enabled
- Verify agent ID matches `SLACK_DEFAULT_AGENT_ID`

### Messages timeout

- Check backend server is running and accessible
- Verify Claude Code SDK is properly installed
- Check agent permissions and tool configurations

## Development

### Running in Development

```bash
# Terminal 1: Backend
cd backend
pnpm run dev

# Use ngrok or similar for public URL during development
ngrok http 4936
# Update Slack Event Subscriptions URL to ngrok URL
```

### Testing Locally

1. Use ngrok to expose local server:
   ```bash
   ngrok http 4936
   ```

2. Update Slack app Event Subscriptions URL:
   - `https://your-ngrok-id.ngrok.io/api/slack/events`

3. Test messages in Slack

### Logs

The integration logs all activity:

```
📨 Received Slack message: { channel, user, text, thread_ts }
🆕 Created new Claude session for Slack thread: xxx
📦 Received SDK message type: assistant, subtype: text
✅ Session confirmed: xxx for thread: xxx
✅ Updated Slack message with AI response (1234 chars)
```

## Security

- ✅ All Slack webhooks are verified using HMAC-SHA256 signatures
- ✅ Replay attack protection (5-minute timestamp window)
- ✅ Bot messages are ignored to prevent loops
- ✅ No authentication bypass (Slack routes use signature verification)
- ✅ Rate limiting inherited from Slack API limits

## Limitations

- Maximum response length: Slack's message limit (~4000 characters)
- Rate limits: Slack API rate limits apply
- File uploads: Not yet supported (planned)
- Slash commands: Not yet implemented (planned)
- Interactive components: Not yet implemented (planned)

## Roadmap

- [ ] Support for Slack file uploads
- [ ] Slash commands (e.g., `/agent switch ppt-editor`)
- [ ] Interactive buttons and modals
- [ ] Multi-agent switching within conversations
- [ ] User-level permission and quota management
- [ ] Slack Socket Mode support (alternative to webhooks)

## License

Same as AgentStudio main project.
