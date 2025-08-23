import express from 'express';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const ChatRequestSchema = z.object({
  message: z.string().min(1),
  context: z.object({
    currentSlide: z.number().optional(),
    slideContent: z.string().optional(),
    allSlides: z.array(z.object({
      index: z.number(),
      title: z.string(),
      path: z.string()
    })).optional()
  }).optional()
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

// POST /api/ai/chat - General AI chat for presentation assistance
router.post('/chat', async (req, res) => {
  try {
    const validation = ChatRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validation.error });
    }

    const { message, context } = validation.data;

    // Choose AI model based on availability
    let model;
    if (process.env.OPENAI_API_KEY) {
      model = openai('gpt-4');
    } else if (process.env.ANTHROPIC_API_KEY) {
      model = anthropic('claude-3-sonnet-20240229');
    } else {
      return res.status(500).json({ error: 'No AI provider configured' });
    }

    // Build system prompt
    let systemPrompt = `You are an AI assistant specialized in helping users create and edit HTML presentations. 
You can help with:
- Content creation and editing
- Design suggestions
- Structure improvements
- HTML/CSS modifications
- Presentation flow optimization

The presentation uses HTML slides with embedded CSS styling. Each slide should be self-contained with a 1280x720 viewport.

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

    const result = await streamText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
      maxTokens: 1000
    });

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Stream the response
    for await (const chunk of result.textStream) {
      res.write(chunk);
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