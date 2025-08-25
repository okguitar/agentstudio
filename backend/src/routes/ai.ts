import express from 'express';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { Options, query } from '@anthropic-ai/claude-code';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const ChatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional().nullable(),
  context: z.object({
    currentSlide: z.number().optional().nullable(),
    slideContent: z.string().optional(),
    allSlides: z.array(z.object({
      index: z.number(),
      title: z.string(),
      path: z.string(),
      exists: z.boolean().optional()
    })).optional()
  }).optional()
});

// Session management in memory (in production, use Redis or database)
const sessions = new Map();

// Session routes
router.get('/sessions', (req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([id, session]) => ({
    id,
    title: session.title || `会话 ${id.substring(0, 8)}`,
    createdAt: session.createdAt,
    lastUpdated: session.lastUpdated,
    messageCount: session.messages?.length || 0
  }));
  
  res.json({ sessions: sessionList.sort((a, b) => b.lastUpdated - a.lastUpdated) });
});

router.post('/sessions', (req, res) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const session = {
    id: sessionId,
    title: req.body.title || `新会话 ${new Date().toLocaleString()}`,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    messages: []
  };
  
  sessions.set(sessionId, session);
  res.json({ sessionId, session });
});

router.delete('/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const deleted = sessions.delete(sessionId);
  res.json({ success: deleted });
});

// Get available AI models
router.get('/models', (req, res) => {
  const models = [];
  
  if (process.env.OPENAI_API_KEY) {
    models.push({
      provider: 'openai',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
    });
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    models.push({
      provider: 'anthropic',
      models: ['claude-3-sonnet', 'claude-3-haiku']
    });
  }

  res.json({ models, available: models.length > 0 });
});

// POST /api/ai/chat - General AI chat for presentation assistance using Claude Code SDK
router.post('/chat', async (req, res) => {
  try {
    console.log('Chat request received:', req.body);
    const validation = ChatRequestSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('Validation failed:', validation.error);
      return res.status(400).json({ error: 'Invalid request body', details: validation.error });
    }

    const { message, context, sessionId } = validation.data;

    // Get or create session
    let currentSession;
    if (sessionId && sessions.has(sessionId)) {
      currentSession = sessions.get(sessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      currentSession = {
        id: newSessionId,
        title: `AI编辑会话 ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        messages: [],
        claudeSessionId: null
      };
      sessions.set(newSessionId, currentSession);
    }

    // Build system prompt for Claude Code
    let systemPrompt = `You are an AI assistant specialized in helping users create and edit HTML presentations. 
You can help with:
- Content creation and editing  
- Design suggestions
- Structure improvements
- HTML/CSS modifications
- Presentation flow optimization
- File operations for slide management

The presentation uses HTML slides with embedded CSS styling. Each slide should be self-contained with a 1280x720 viewport.
Slides are stored in the ../slides/ directory relative to the backend.

Always provide helpful, specific suggestions and when possible, include code examples.
Please respond in Chinese.`;

    if (context?.currentSlide !== undefined) {
      systemPrompt += `\n\nCurrent context: User is working on slide ${context.currentSlide + 1}`;
      if (context.slideContent) {
        systemPrompt += `\nCurrent slide content preview:\n${context.slideContent.substring(0, 500)}...`;
      }
    }

    if (context?.allSlides?.length) {
      systemPrompt += `\n\nPresentation overview: ${context.allSlides.length} slides total`;
      systemPrompt += `\nSlides: ${context.allSlides.map(s => `${s.index + 1}. ${s.title}`).join(', ')}`;
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send initial connection event with session info
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      sessionId: currentSession.id,
      sessionTitle: currentSession.title 
    })}\n\n`);

    // Store user message
    currentSession.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    try {
      // Use Claude Code SDK with session management
      const queryOptions: Options = {
        customSystemPrompt: systemPrompt,
        allowedTools: ["Write", "Read", "Edit", "Glob", "MultiEdit", "Bash"],
        maxTurns: 25,
        cwd: process.cwd(),
        permissionMode: 'acceptEdits'  // Automatically approve safe operations
      };

      // Resume existing Claude session if available
      if (currentSession.claudeSessionId) {
        queryOptions.resume = currentSession.claudeSessionId;
      }

      for await (const sdkMessage of query({
        prompt: message,
        options: queryOptions
      })) {
        
        // Store Claude session ID from first message
        if (sdkMessage.type === 'system' && sdkMessage.subtype === 'init') {
          currentSession.claudeSessionId = sdkMessage.session_id;
        }
        
        // Send each message as SSE event
        const eventData = {
          type: sdkMessage.type,
          timestamp: Date.now(),
          sessionId: currentSession.id,
          ...sdkMessage
        };
        
        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        
        // Store assistant messages
        if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
          const textContent = sdkMessage.message.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('');
          
          if (textContent) {
            currentSession.messages.push({
              role: 'assistant',
              content: textContent,
              timestamp: Date.now(),
              claudeMessageId: sdkMessage.message.id
            });
          }
        }
        
        // If it's the final result, we can close the connection
        if (sdkMessage.type === 'result') {
          currentSession.lastUpdated = Date.now();
          break;
        }
      }
      
    } catch (sdkError) {
      console.error('Claude Code SDK error:', sdkError);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'Claude Code SDK failed', 
        message: sdkError.message 
      })}\n\n`);
    }
    
    res.end();
    
  } catch (error) {
    console.error('Error in AI chat:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI request failed', message: error.message });
    }
  }
});

export default router;