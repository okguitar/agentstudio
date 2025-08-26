import express from 'express';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { Options, query } from '@anthropic-ai/claude-code';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

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

// Session storage directory (relative to working directory)
const getSessionsDir = () => {
  const sessionsDir = path.join(process.cwd(), '.ai-sessions');
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }
  return sessionsDir;
};

// Message interfaces
interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  messageParts?: Array<{
    id: string;
    type: 'text' | 'tool';
    content?: string;
    toolData?: {
      id: string;
      toolName: string;
      toolInput: Record<string, unknown>;
      toolResult?: string;
      isExecuting: boolean;
      isError?: boolean;
    };
    order: number;
  }>;
}

interface SessionData {
  id: string;
  title: string;
  createdAt: number;
  lastUpdated: number;
  messages: StoredMessage[];
  claudeSessionId?: string | null;
}

// Session management with file system persistence
class SessionManager {
  private sessionsDir: string;

  constructor() {
    this.sessionsDir = getSessionsDir();
  }

  private getSessionFilePath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.json`);
  }

  getAllSessions(): SessionData[] {
    const sessionFiles = fs.readdirSync(this.sessionsDir)
      .filter(file => file.endsWith('.json'));
    
    const sessions: SessionData[] = [];
    for (const file of sessionFiles) {
      try {
        const filePath = path.join(this.sessionsDir, file);
        const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        sessions.push(sessionData);
      } catch (error) {
        console.error(`Failed to read session file ${file}:`, error);
      }
    }
    
    return sessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  getSession(sessionId: string): SessionData | null {
    try {
      const filePath = this.getSessionFilePath(sessionId);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.error(`Failed to read session ${sessionId}:`, error);
      return null;
    }
  }

  createSession(title?: string): SessionData {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: SessionData = {
      id: sessionId,
      title: title || `AI编辑会话 ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      messages: [],
      claudeSessionId: null
    };
    
    this.saveSession(session);
    return session;
  }

  saveSession(session: SessionData): void {
    try {
      const filePath = this.getSessionFilePath(session.id);
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save session ${session.id}:`, error);
    }
  }

  deleteSession(sessionId: string): boolean {
    try {
      const filePath = this.getSessionFilePath(sessionId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
      return false;
    }
  }

  addMessage(sessionId: string, message: Omit<StoredMessage, 'id' | 'timestamp'>): StoredMessage | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const newMessage: StoredMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      messageParts: message.messageParts || []
    };

    session.messages.push(newMessage);
    session.lastUpdated = Date.now();
    
    // Save session first, then update title asynchronously
    this.saveSession(session);
    
    // Update session title based on first user message (async, doesn't block)
    if (message.role === 'user' && session.title.startsWith('AI编辑会话')) {
      this.updateSessionTitle(session).then(() => {
        // Save again after title is updated
        this.saveSession(session);
        console.log(`Session title updated to: "${session.title}"`);
      }).catch(err => {
        console.error('Failed to update session title:', err);
      });
    }
    
    return newMessage;
  }

  // Generate intelligent session title based on first user message using Claude Code SDK
  async updateSessionTitle(session: SessionData): Promise<void> {
    // Only update if it's still the default title
    if (!session.title.startsWith('AI编辑会话')) {
      return;
    }
    
    // Find the first user message
    const firstUserMessage = session.messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) {
      return;
    }
    
    let userQuestion = firstUserMessage.content;
    
    // If no content in main field, check message parts
    if (!userQuestion && firstUserMessage.messageParts) {
      const textPart = firstUserMessage.messageParts.find(part => part.type === 'text' && part.content);
      userQuestion = textPart?.content || '';
    }
    
    if (userQuestion) {
      try {
        // Use Claude Code SDK to generate a concise title
        const titlePrompt = `请为以下用户问题生成一个简洁的标题（不超过25个字符），用于会话列表显示：

用户问题：${userQuestion}

要求：
1. 提取问题的核心要点
2. 使用简洁明了的中文
3. 不超过25个字符
4. 不需要引号或其他标点符号
5. 直接输出标题内容，不要任何前缀或后缀`;

        const queryOptions: Options = {
          customSystemPrompt: "你是一个专门生成简洁标题的助手。请直接输出标题内容，不要任何解释或格式化。",
          allowedTools: [],  // No tools needed for title generation
          maxTurns: 1,
          cwd: process.cwd()
        };

        let generatedTitle = '';
        
        for await (const sdkMessage of query({
          prompt: titlePrompt,
          options: queryOptions
        })) {
          if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
            for (const block of sdkMessage.message.content) {
              if (block.type === 'text') {
                generatedTitle += block.text;
              }
            }
          }
        }
        
        if (generatedTitle.trim()) {
          // Clean the generated title
          let cleanTitle = generatedTitle.trim()
            .replace(/^["'"']|["'"']$/g, '') // Remove quotes
            .replace(/\n/g, ' ') // Replace newlines
            .replace(/\s+/g, ' '); // Collapse spaces
          
          // Ensure it's not too long
          if (cleanTitle.length > 30) {
            cleanTitle = cleanTitle.substring(0, 27) + '...';
          }
          
          session.title = cleanTitle;
          console.log(`Generated title for session ${session.id}: "${cleanTitle}"`);
        } else {
          // Fallback to simple truncation if AI generation fails
          this.fallbackTitleGeneration(session, userQuestion);
        }
      } catch (error) {
        console.error('Failed to generate AI title, using fallback:', error);
        this.fallbackTitleGeneration(session, userQuestion);
      }
    }
  }
  
  // Fallback title generation method
  private fallbackTitleGeneration(session: SessionData, userQuestion: string): void {
    let newTitle = userQuestion.trim()
      .replace(/\n/g, ' ')  // Replace newlines with spaces
      .replace(/\s+/g, ' '); // Collapse multiple spaces
    
    // Truncate if too long
    if (newTitle.length > 30) {
      newTitle = newTitle.substring(0, 27) + '...';
    }
    
    session.title = newTitle;
  }

  // Fix existing sessions with stuck tools
  fixStuckTools(): number {
    let fixedCount = 0;
    const sessions = this.getAllSessions();
    
    for (const session of sessions) {
      let sessionUpdated = false;
      
      for (const message of session.messages) {
        if (message.messageParts) {
          for (const part of message.messageParts) {
            if (part.type === 'tool' && part.toolData && part.toolData.isExecuting) {
              part.toolData.isExecuting = false;
              // Keep existing toolResult if any, or provide a default message
              if (!part.toolData.toolResult && part.toolData.toolResult !== '') {
                part.toolData.toolResult = '工具执行已完成';
              }
              sessionUpdated = true;
              fixedCount++;
            }
          }
        }
      }
      
      if (sessionUpdated) {
        this.saveSession(session);
      }
    }
    
    return fixedCount;
  }
}

const sessionManager = new SessionManager();

// Session routes
router.get('/sessions', (req, res) => {
  try {
    const { search } = req.query;
    const sessions = sessionManager.getAllSessions();
    
    let filteredSessions = sessions;
    
    // If search term is provided, filter sessions by title and message content
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredSessions = sessions.filter(session => {
        // Search in title
        if (session.title.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // Search in message content
        return session.messages.some(message => {
          // Search in main content
          if (message.content && message.content.toLowerCase().includes(searchTerm)) {
            return true;
          }
          
          // Search in message parts content
          if (message.messageParts) {
            return message.messageParts.some(part => {
              if (part.type === 'text' && part.content && part.content.toLowerCase().includes(searchTerm)) {
                return true;
              }
              // Also search in tool names and inputs
              if (part.type === 'tool' && part.toolData) {
                if (part.toolData.toolName.toLowerCase().includes(searchTerm)) {
                  return true;
                }
                // Search in tool input values
                const inputStr = JSON.stringify(part.toolData.toolInput).toLowerCase();
                if (inputStr.includes(searchTerm)) {
                  return true;
                }
              }
              return false;
            });
          }
          
          return false;
        });
      });
    }
    
    const sessionList = filteredSessions.map(session => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      lastUpdated: session.lastUpdated,
      messageCount: session.messages.length
    }));
    
    res.json({ sessions: sessionList });
  } catch (error) {
    console.error('Failed to get sessions:', error);
    res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

// Get messages for a specific session
router.get('/sessions/:sessionId/messages', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ 
      sessionId: session.id,
      title: session.title,
      messages: session.messages 
    });
  } catch (error) {
    console.error('Failed to get session messages:', error);
    res.status(500).json({ error: 'Failed to retrieve session messages' });
  }
});

router.post('/sessions', (req, res) => {
  try {
    const session = sessionManager.createSession(req.body.title);
    res.json({ sessionId: session.id, session });
  } catch (error) {
    console.error('Failed to create session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.delete('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = sessionManager.deleteSession(sessionId);
    res.json({ success: deleted });
  } catch (error) {
    console.error('Failed to delete session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Fix stuck tools in all sessions
router.post('/sessions/fix-tools', (req, res) => {
  try {
    const fixedCount = sessionManager.fixStuckTools();
    res.json({ 
      success: true, 
      message: `Fixed ${fixedCount} stuck tools` 
    });
  } catch (error) {
    console.error('Failed to fix stuck tools:', error);
    res.status(500).json({ error: 'Failed to fix stuck tools' });
  }
});

// Generate AI titles for sessions with default titles
router.post('/sessions/generate-titles', async (req, res) => {
  try {
    const sessions = sessionManager.getAllSessions();
    let updatedCount = 0;
    
    for (const session of sessions) {
      if (session.title.startsWith('AI编辑会话')) {
        try {
          await sessionManager.updateSessionTitle(session);
          sessionManager.saveSession(session);
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update title for session ${session.id}:`, error);
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Updated ${updatedCount} session titles` 
    });
  } catch (error) {
    console.error('Failed to generate session titles:', error);
    res.status(500).json({ error: 'Failed to generate session titles' });
  }
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
    let currentSession: SessionData;
    if (sessionId) {
      const existingSession = sessionManager.getSession(sessionId);
      if (existingSession) {
        currentSession = existingSession;
      } else {
        currentSession = sessionManager.createSession();
      }
    } else {
      currentSession = sessionManager.createSession();
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

    if (context?.currentSlide !== undefined && context.currentSlide !== null) {
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
    sessionManager.addMessage(currentSession.id, {
      role: 'user',
      content: message
    });

    // Track current assistant message to accumulate content
    let currentAssistantMessage: any = null;

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
        
        console.log('🔄 SDK Message type:', sdkMessage.type, sdkMessage.subtype || '');
        
        // Store Claude session ID from first message
        if (sdkMessage.type === 'system' && sdkMessage.subtype === 'init') {
          currentSession.claudeSessionId = sdkMessage.session_id;
        }
        
        // Send each message as SSE event
        const eventData = {
          ...sdkMessage,
          timestamp: Date.now(),
          sessionId: currentSession.id
        };
        
        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        
        // Accumulate assistant messages
        if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
          console.log('📝 Processing assistant message with', sdkMessage.message.content.length, 'content blocks');
          
          if (!currentAssistantMessage) {
            console.log('🆕 Creating new assistant message');
            currentAssistantMessage = {
              role: 'assistant' as const,
              content: '',
              messageParts: [] as any[]
            };
          }
          
          // Process content blocks and accumulate
          for (const block of sdkMessage.message.content) {
            console.log('📄 Processing block:', block.type, block.type === 'text' ? `"${block.text?.substring(0, 50)}..."` : block.name);
            
            if (block.type === 'text') {
              currentAssistantMessage.messageParts.push({
                id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'text',
                content: block.text,
                order: currentAssistantMessage.messageParts.length
              });
              currentAssistantMessage.content += block.text;
              console.log('✅ Added text part, total parts:', currentAssistantMessage.messageParts.length);
            } else if (block.type === 'tool_use') {
              currentAssistantMessage.messageParts.push({
                id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'tool',
                toolData: {
                  id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  claudeId: block.id, // Store Claude's tool use ID for matching with results
                  toolName: block.name,
                  toolInput: block.input || {},
                  isExecuting: true
                },
                order: currentAssistantMessage.messageParts.length
              });
              console.log('✅ Added tool part, total parts:', currentAssistantMessage.messageParts.length);
            }
          }
        }
        
        // Handle tool results
        if (sdkMessage.type === 'user' && sdkMessage.message?.content) {
          for (const block of sdkMessage.message.content) {
            if (block.type === 'tool_result' && currentAssistantMessage) {
              console.log('Processing tool result:', {
                tool_use_id: block.tool_use_id,
                hasContent: !!block.content,
                contentType: typeof block.content,
                contentPreview: typeof block.content === 'string' ? block.content.substring(0, 100) : 'not string'
              });
              // Find the tool by tool_use_id if available, otherwise use the last executing tool
              const toolParts = currentAssistantMessage.messageParts.filter((p: any) => p.type === 'tool');
              let targetTool = null;
              
              if (block.tool_use_id) {
                // Try to find tool by ID
                targetTool = toolParts.find((p: any) => 
                  p.toolData && (p.toolData.claudeId === block.tool_use_id || p.toolData.id === block.tool_use_id)
                );
              }
              
              // If not found by ID, find the last executing tool
              if (!targetTool) {
                targetTool = toolParts.reverse().find((p: any) => 
                  p.toolData && p.toolData.isExecuting
                );
              }
              
              if (targetTool && targetTool.toolData) {
                const result = typeof block.content === 'string' 
                  ? block.content 
                  : JSON.stringify(block.content);
                console.log(`✅ Successfully setting tool result for ${targetTool.toolData.toolName}:`, result.substring(0, 100));
                targetTool.toolData.toolResult = result;
                targetTool.toolData.isExecuting = false;
                targetTool.toolData.isError = block.is_error || false;
              } else {
                console.log('❌ Could not find target tool for result. Available tools:', 
                  toolParts.map((p: any) => ({ 
                    name: p.toolData?.toolName, 
                    claudeId: p.toolData?.claudeId, 
                    id: p.toolData?.id, 
                    executing: p.toolData?.isExecuting 
                  }))
                );
                console.log('Looking for tool_use_id:', block.tool_use_id);
              }
            }
          }
        }
        
        // If it's the final result, save the accumulated assistant message
        if (sdkMessage.type === 'result') {
          if (currentAssistantMessage) {
            console.log('💾 Saving assistant message with parts:', currentAssistantMessage.messageParts.length);
            
            if (currentAssistantMessage.messageParts.length > 0) {
              // Ensure all tools are marked as completed
              console.log('🔍 Final tool status check:');
              currentAssistantMessage.messageParts.forEach((part: any, index: any) => {
                if (part.type === 'tool' && part.toolData) {
                  console.log(`Tool ${index} (${part.toolData.toolName}): executing=${part.toolData.isExecuting}, hasResult=${!!part.toolData.toolResult}, claudeId=${part.toolData.claudeId}`);
                  console.log(`  Result preview: "${(part.toolData.toolResult || 'none').substring(0, 150)}"`);
                  if (part.toolData.isExecuting) {
                    part.toolData.isExecuting = false;
                    // Only set default result if truly no result was provided
                    if (!part.toolData.toolResult) {
                      console.log(`⚠️  Setting default result for ${part.toolData.toolName} because no result was found`);
                      part.toolData.toolResult = '执行完成，无输出结果';
                    }
                  }
                }
              });
              
              sessionManager.addMessage(currentSession.id, currentAssistantMessage);
              console.log('✅ Assistant message saved successfully');
            } else {
              // Handle case where AI reply has no message parts (shouldn't happen normally)
              console.log('⚠️ Assistant message has no parts, but still has content. Creating text part.');
              if (currentAssistantMessage.content) {
                currentAssistantMessage.messageParts = [{
                  id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  type: 'text',
                  content: currentAssistantMessage.content,
                  order: 0
                }];
                sessionManager.addMessage(currentSession.id, currentAssistantMessage);
                console.log('✅ Assistant message saved with recovered text part');
              } else {
                console.log('❌ Assistant message has no content or parts - not saving');
              }
            }
          } else {
            console.log('❌ No assistant message to save');
          }
          
          const session = sessionManager.getSession(currentSession.id);
          if (session) {
            session.lastUpdated = Date.now();
            sessionManager.saveSession(session);
          }
          break;
        }
      }
      
    } catch (sdkError) {
      console.error('Claude Code SDK error:', sdkError);
      
      // Try to save any accumulated assistant message before erroring out
      if (currentAssistantMessage && (currentAssistantMessage.messageParts.length > 0 || currentAssistantMessage.content)) {
        console.log('🛟 Emergency saving assistant message due to SDK error');
        if (currentAssistantMessage.messageParts.length === 0 && currentAssistantMessage.content) {
          currentAssistantMessage.messageParts = [{
            id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'text',
            content: currentAssistantMessage.content,
            order: 0
          }];
        }
        sessionManager.addMessage(currentSession.id, currentAssistantMessage);
        const session = sessionManager.getSession(currentSession.id);
        if (session) {
          session.lastUpdated = Date.now();
          sessionManager.saveSession(session);
        }
        console.log('✅ Emergency save completed');
      }
      
      const errorMessage = sdkError instanceof Error ? sdkError.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'Claude Code SDK failed', 
        message: errorMessage 
      })}\n\n`);
    }
    
    // Final safety check: save any remaining assistant message that wasn't saved by 'result' event
    if (currentAssistantMessage && (currentAssistantMessage.messageParts.length > 0 || currentAssistantMessage.content)) {
      console.log('🔄 Final check: found unsaved assistant message, saving now');
      if (currentAssistantMessage.messageParts.length === 0 && currentAssistantMessage.content) {
        currentAssistantMessage.messageParts = [{
          id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'text',
          content: currentAssistantMessage.content,
          order: 0
        }];
      }
      sessionManager.addMessage(currentSession.id, currentAssistantMessage);
      const session = sessionManager.getSession(currentSession.id);
      if (session) {
        session.lastUpdated = Date.now();
        sessionManager.saveSession(session);
      }
      console.log('✅ Final save completed');
    } else {
      console.log('ℹ️ No unsaved assistant message found');
    }
    
    res.end();
    
  } catch (error) {
    console.error('Error in AI chat:', error);
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'AI request failed', message: errorMessage });
    }
  }
});

export default router;