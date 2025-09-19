import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { AgentStorage } from '../../shared/utils/agentStorage.js';
import { ClaudeHistoryMessage, ClaudeHistorySession } from '../../../shared/types/claude-history';

const router: express.Router = express.Router();

// Storage instances
const globalAgentStorage = new AgentStorage();

// Helper functions for reading Claude Code history from ~/.claude/projects
function convertProjectPathToClaudeFormat(projectPath: string): string {
  // Convert path like /Users/kongjie/claude-code-projects/ppt-editor-project-2025-08-27-00-12
  // to: -Users-kongjie-claude-code-projects-ppt-editor-project-2025-08-27-00-12
  return projectPath.replace(/\//g, '-');
}

// Function to get AgentStorage instance for specific project directory
const getAgentStorageForRequest = (req: express.Request): AgentStorage => {
  const projectPath = req.query.projectPath as string || req.body?.projectPath as string;
  const workingDir = projectPath || process.cwd();
  return new AgentStorage(workingDir);
};

// Process compact context messages - detect and convert the 4-message pattern
function processCompactContextMessages(messages: ClaudeHistoryMessage[]): ClaudeHistoryMessage[] {
  const processedMessages: ClaudeHistoryMessage[] = [];
  let i = 0;

  while (i < messages.length) {
    const currentMsg = messages[i];
    
    // Case 1: Manual compact - Check for 4-message pattern
    if (currentMsg.isCompactSummary && currentMsg.parentUuid === null && i + 3 < messages.length) {
      const metaMsg = messages[i + 1];
      const commandMsg = messages[i + 2];
      const outputMsg = messages[i + 3];
      
      // Verify this is the manual compact pattern
      if (metaMsg.isMeta === true &&
          commandMsg.type === 'user' &&
          commandMsg.message?.content &&
          typeof commandMsg.message.content === 'string' &&
          commandMsg.message.content.includes('<command-name>/compact</command-name>') &&
          commandMsg.parentUuid === metaMsg.uuid &&
          outputMsg.type === 'user' &&
          outputMsg.message?.content &&
          typeof outputMsg.message.content === 'string' &&
          outputMsg.message.content.includes('<local-command-stdout>') &&
          outputMsg.parentUuid === commandMsg.uuid) {
        
        // Create synthetic user command message
        const userCommandMessage: ClaudeHistoryMessage = {
          type: 'user',
          uuid: `synthetic_cmd_${commandMsg.uuid}`,
          timestamp: commandMsg.timestamp,
          sessionId: commandMsg.sessionId,
          parentUuid: currentMsg.parentUuid,
          message: {
            role: 'user',
            content: '/compact'
          },
          isCompactCommand: true
        };
        
        // Create synthetic AI response with compressed content
        const aiResponseMessage: ClaudeHistoryMessage = {
          type: 'assistant',
          uuid: `synthetic_ai_${currentMsg.uuid}`,
          timestamp: currentMsg.timestamp,
          sessionId: currentMsg.sessionId,
          parentUuid: userCommandMessage.uuid,
          message: {
            role: 'assistant',
            content: extractContentFromClaudeMessage(currentMsg, messages) || '会话上下文已压缩'
          },
          isCompactSummary: true
        };
        
        processedMessages.push(userCommandMessage, aiResponseMessage);
        i += 4; // Skip all 4 messages
        continue;
      }
    }
    
    // Case 2: Auto compact - Single message with isCompactSummary
    if (currentMsg.isCompactSummary && currentMsg.parentUuid === null && 
        !(i + 1 < messages.length && messages[i + 1].isMeta === true)) {
      
      // Create synthetic AI response for auto-compressed content
      const aiResponseMessage: ClaudeHistoryMessage = {
        type: 'assistant',
        uuid: `synthetic_auto_${currentMsg.uuid}`,
        timestamp: currentMsg.timestamp,
        sessionId: currentMsg.sessionId,
        parentUuid: currentMsg.parentUuid,
        message: {
          role: 'assistant',
          content: extractContentFromClaudeMessage(currentMsg, messages) || '会话上下文已自动压缩'
        },
        isCompactSummary: true
      };
      
      processedMessages.push(aiResponseMessage);
      i++;
      continue;
    }
    
    // Regular message - pass through
    processedMessages.push(currentMsg);
    i++;
  }

  return processedMessages;
}

function readClaudeHistorySessions(projectPath: string): ClaudeHistorySession[] {
  try {
    const claudeProjectPath = convertProjectPathToClaudeFormat(projectPath);
    const historyDir = path.join(os.homedir(), '.claude', 'projects', claudeProjectPath);
    
    if (!fs.existsSync(historyDir)) {
      console.log('Claude history directory not found:', historyDir);
      return [];
    }

    const jsonlFiles = fs.readdirSync(historyDir)
      .filter(file => file.endsWith('.jsonl'))
      .filter(file => !file.startsWith('.'));

    const sessions: ClaudeHistorySession[] = [];

    for (const filename of jsonlFiles) {
      const sessionId = filename.replace('.jsonl', '');
      const filePath = path.join(historyDir, filename);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        if (lines.length === 0) continue;

        const messages: ClaudeHistoryMessage[] = lines.map(line => JSON.parse(line));
        
        // Find summary message for session title
        const summaryMessage = messages.find(msg => msg.type === 'summary');
        const title = summaryMessage?.summary || `会话 ${sessionId.slice(0, 8)}`;

        // Process compact context messages before filtering
        const processedMessages = processCompactContextMessages(messages);

        // Filter user and assistant messages, but exclude tool_result-only user messages, isMeta messages, 
        const conversationMessages = processedMessages.filter(msg => {
          // Filter out isMeta messages (rule 1)
          if ((msg as any).isMeta === true) {
            return false;
          }
          
          // Filter out /clear command messages and its related output messages
          if (msg.type === 'user' && msg.message?.content && typeof msg.message.content === 'string') {
            // Check for /clear command format
            if (msg.message.content.includes('<command-name>/clear</command-name>')) {
              return false;
            }
            // Check for /clear command's output (local-command-stdout that follows /clear command)
            if (msg.message.content.includes('<local-command-stdout></local-command-stdout>') && 
                msg.parentUuid) {
              // Find the parent message to check if it was a /clear command
              const parentMsg = messages.find(m => m.uuid === msg.parentUuid);
              if (parentMsg && parentMsg.message?.content && typeof parentMsg.message.content === 'string' &&
                  parentMsg.message.content.includes('<command-name>/clear</command-name>')) {
                return false;
              }
            }
          }
          
          if (msg.type === 'assistant') return true;
          if (msg.type === 'user') {
            // Check if this user message contains only tool_result
            if (msg.message?.content && Array.isArray(msg.message.content)) {
              const hasNonToolResult = msg.message.content.some((block: any) => block.type !== 'tool_result');
              return hasNonToolResult; // Only include if it has content other than tool_result
            }
            // Include user messages with string content or no content array
            return typeof msg.message?.content === 'string' || !msg.message?.content;
          }
          return false;
        });
        
        if (conversationMessages.length === 0) continue;

        // Convert messages to our format and group consecutive assistant messages
        const convertedMessages: any[] = [];
        let i = 0;

        while (i < conversationMessages.length) {
          const msg = conversationMessages[i];
          
          if (msg.type === 'user') {
            // Check if this is a local-command-stdout message
            const content = msg.message?.content;
            if (typeof content === 'string' && content.includes('<local-command-stdout>')) {
              // Extract content from local-command-stdout tag
              const outputMatch = content.match(/<local-command-stdout>([^<]*)<\/local-command-stdout>/);
              const displayOutput = outputMatch ? outputMatch[1] : '';
              
              // Create AI response message
              convertedMessages.push({
                id: `msg_${convertedMessages.length}_${msg.uuid}`,
                role: 'assistant',
                content: displayOutput,
                timestamp: new Date(msg.timestamp).getTime(),
                messageParts: [{
                  id: `part_0_${msg.uuid}`,
                  type: 'text',
                  content: displayOutput,
                  order: 0
                }]
              });
            } else {
              // Regular user message
              convertedMessages.push({
                id: `msg_${convertedMessages.length}_${msg.uuid}`,
                role: msg.message?.role || msg.type,
                content: extractContentFromClaudeMessage(msg, messages),
                timestamp: new Date(msg.timestamp).getTime(),
                messageParts: convertClaudeMessageToMessageParts(msg, messages)
              });
            }
            i++;
          } else if (msg.type === 'assistant') {
            // Find all consecutive assistant messages and combine them
            const assistantMessages = [msg];
            let j = i + 1;
            
            // Collect all consecutive assistant messages
            while (j < conversationMessages.length && conversationMessages[j].type === 'assistant') {
              assistantMessages.push(conversationMessages[j]);
              j++;
            }
            
            // Create combined assistant message
            const combinedMessage = {
              id: `msg_${convertedMessages.length}_${msg.uuid}`,
              role: 'assistant',
              content: '',
              timestamp: new Date(msg.timestamp).getTime(),
              messageParts: [] as any[]
            };
            
            // Combine all assistant message parts
            assistantMessages.forEach((assistantMsg) => {
              const textContent = extractContentFromClaudeMessage(assistantMsg, messages);
              const msgParts = convertClaudeMessageToMessageParts(assistantMsg, messages);
              
              combinedMessage.content += textContent;
              combinedMessage.messageParts.push(...msgParts.map(part => ({
                ...part,
                order: combinedMessage.messageParts.length + part.order
              })));
            });
            
            convertedMessages.push(combinedMessage);
            i = j; // Skip to next non-assistant message
          } else {
            i++;
          }
        }

        // Process tool results - find tool_result messages and associate them with tool_use
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (msg.type === 'user' && msg.message?.content && Array.isArray(msg.message.content)) {
            for (const block of msg.message.content) {
              if (block.type === 'tool_result' && block.tool_use_id) {
                // Find the assistant message that contains the matching tool_use
                // Look backwards through conversation messages (not all messages)
                for (let j = convertedMessages.length - 1; j >= 0; j--) {
                  const assistantMsg = convertedMessages[j];
                  if (assistantMsg && assistantMsg.role === 'assistant') {
                    // Find the tool part with matching claudeId
                    const toolPart = assistantMsg.messageParts.find((part: any) => 
                      part.type === 'tool' && 
                      part.toolData && 
                      part.toolData.claudeId === block.tool_use_id
                    );
                    
                    if (toolPart && toolPart.toolData) {
                      toolPart.toolData.toolResult = typeof block.content === 'string' 
                        ? block.content 
                        : JSON.stringify(block.content);
                      
                      // Check if the original message has toolUseResult (from Claude Code SDK)
                      if (msg.toolUseResult) {
                        toolPart.toolData.toolUseResult = msg.toolUseResult;
                      }
                      
                      toolPart.toolData.isError = block.is_error || false;
                      break;
                    }
                  }
                }
              }
            }
          }
        }

        // Get timestamps
        const timestamps = conversationMessages
          .map(msg => new Date(msg.timestamp).getTime())
          .filter(t => !isNaN(t));
        
        const createdAt = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
        const lastUpdated = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();

        sessions.push({
          id: sessionId,
          title,
          createdAt: new Date(createdAt).toISOString(),
          lastUpdated: new Date(lastUpdated).toISOString(),
          messages: convertedMessages
        });

      } catch (error) {
        console.error(`Failed to parse Claude history file ${filename}:`, error);
        continue;
      }
    }

    return sessions.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

  } catch (error) {
    console.error('Failed to read Claude history sessions:', error);
    return [];
  }
}

function extractContentFromClaudeMessage(msg: ClaudeHistoryMessage, allMessages: ClaudeHistoryMessage[] = []): string {
  if (!msg.message?.content) return '';
  
  // Handle both array and string content
  if (typeof msg.message.content === 'string') {
    const commandMatch = msg.message.content.match(/<command-name>(.+?)<\/command-name>/);
    if (commandMatch) {
      // Check for two different patterns:
      // Pattern 1: Parent is meta message (3-message local-command pattern)
      const parentMessage = msg.parentUuid ? allMessages.find(m => m.uuid === msg.parentUuid) : null;
      const isMetaParent = parentMessage && (parentMessage as any).isMeta === true;
      
      // Pattern 2: Child is meta message (2-message user-custom-command pattern)
      const childMessage = allMessages.find(m => m.parentUuid === msg.uuid);
      const isMetaChild = childMessage && (childMessage as any).isMeta === true;
      
      if (isMetaParent) {
        // 3-message pattern: return only command name
        return commandMatch[1];
      } else if (isMetaChild) {
        // 2-message pattern: return command name + args
        const argsMatch = msg.message.content.match(/<command-args>([^<]*)<\/command-args>/);
        const args = argsMatch ? argsMatch[1].trim() : '';
        return args ? `${commandMatch[1]} ${args}` : commandMatch[1];
      }
    }
    return msg.message.content;
  }
  
  if (Array.isArray(msg.message.content)) {
    return msg.message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');
  }
  
  return '';
}

function convertClaudeMessageToMessageParts(msg: ClaudeHistoryMessage, allMessages: ClaudeHistoryMessage[] = []): any[] {
  if (!msg.message?.content) return [];
  
  // Handle compact command messages
  if (msg.isCompactCommand) {
    return [{
      id: `part_0_${msg.uuid}`,
      type: 'command',
      content: '/compact',
      order: 0
    }];
  }
  
  // Handle compact summary messages
  if (msg.isCompactSummary) {
    return [{
      id: `part_0_${msg.uuid}`,
      type: 'compactSummary',
      content: msg.message.content,
      order: 0
    }];
  }
  
  // Handle string content
  if (typeof msg.message.content === 'string') {
    // Rule 2: Check for command message format and create command-specific part
    const commandMatch = msg.message.content.match(/<command-name>(.+?)<\/command-name>/);
    if (commandMatch) {
      // Check for two different patterns:
      // Pattern 1: Parent is meta message (3-message local-command pattern)
      const parentMessage = msg.parentUuid ? allMessages.find(m => m.uuid === msg.parentUuid) : null;
      const isMetaParent = parentMessage && (parentMessage as any).isMeta === true;
      
      // Pattern 2: Child is meta message (2-message user-custom-command pattern)
      const childMessage = allMessages.find(m => m.parentUuid === msg.uuid);
      const isMetaChild = childMessage && (childMessage as any).isMeta === true;
      
      if (isMetaParent) {
        // 3-message pattern: show only command name
        return [{
            id: `part_0_${msg.uuid}`,
            type: 'command',
            content: commandMatch[1], // Only the command name
            originalContent: msg.message.content, // Keep original for reference
            order: 0
          }];
      } else if (isMetaChild) {
        // 2-message pattern: show command name + args
        const argsMatch = msg.message.content.match(/<command-args>([^<]*)<\/command-args>/);
        const args = argsMatch ? argsMatch[1].trim() : '';
        const displayContent = args ? `${commandMatch[1]} ${args}` : commandMatch[1];
        
        return [{
            id: `part_0_${msg.uuid}`,
            type: 'command',
            content: displayContent, // Command name + args
            originalContent: msg.message.content, // Keep original for reference
            order: 0
          }];
      }
    }
    
    return [{
      id: `part_0_${msg.uuid}`,
      type: 'text',
      content: msg.message.content,
      order: 0
    }];
  }
  
  // Handle array content
  if (Array.isArray(msg.message.content)) {
    return msg.message.content.map((block: any, index: number) => {
      if (block.type === 'text') {
        return {
          id: `part_${index}_${msg.uuid}`,
          type: 'text',
          content: block.text,
          order: index
        };
      } else if (block.type === 'tool_use') {
        return {
          id: `part_${index}_${msg.uuid}`,
          type: 'tool',
          toolData: {
            id: `tool_${index}_${msg.uuid}`,
            claudeId: block.id,
            toolName: block.name,
            toolInput: block.input || {},
            toolResult: '', // Will be filled by tool_result if available
            isExecuting: false, // Historical data is not executing
            isError: false
          },
          order: index
        };
      } else if (block.type === 'tool_result') {
        // Skip tool_result blocks as they will be merged with tool_use blocks
        return null;
      } else if (block.type === 'image') {
        // Handle image content blocks
        return {
          id: `part_${index}_${msg.uuid}`,
          type: 'image',
          imageData: {
            id: `img_${index}_${msg.uuid}`,
            data: block.source?.data || '',
            mediaType: block.source?.media_type || 'image/jpeg',
            filename: `image_${index}.jpg` // Default filename since Claude history may not store original filename
          },
          order: index
        };
      }
      // Handle other content types
      return {
        id: `part_${index}_${msg.uuid}`,
        type: 'unknown',
        content: JSON.stringify(block),
        order: index
      };
    }).filter((part: any) => part !== null);
  }
  
  return [];
}

// GET /api/sessions/:agentId - Get agent sessions
router.get('/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const { search } = req.query;
    const projectPath = req.query.projectPath as string;
    
    // Verify agent exists
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    let sessions: any[] = [];
    
    // If projectPath is provided, read from Claude Code history
    if (projectPath) {
      console.log('Reading Claude history sessions for project:', projectPath);
      const claudeSessions = readClaudeHistorySessions(projectPath);
      sessions = claudeSessions.map(session => ({
        id: session.id,
        agentId: agentId, // Associate with current agent
        title: session.title,
        createdAt: session.createdAt,
        lastUpdated: session.lastUpdated,
        messageCount: session.messages.length
      }));
    } else {
      // Use project-specific AgentStorage for sessions (existing behavior)
      const agentStorage = getAgentStorageForRequest(req);
      const agentSessions = agentStorage.getAgentSessions(agentId, search as string);
      sessions = agentSessions.map(session => ({
        id: session.id,
        agentId: session.agentId,
        title: session.title,
        createdAt: session.createdAt,
        lastUpdated: session.lastUpdated,
        messageCount: session.messages.length
      }));
    }
    
    // Apply search filter if provided
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      sessions = sessions.filter(session => 
        session.title.toLowerCase().includes(searchTerm)
      );
    }
    
    res.json({ sessions });
  } catch (error) {
    console.error('Failed to get agent sessions:', error);
    res.status(500).json({ error: 'Failed to retrieve agent sessions' });
  }
});

// GET /api/sessions/:agentId/:sessionId/messages - Get session messages
router.get('/:agentId/:sessionId/messages', (req, res) => {
  try {
    const { agentId, sessionId } = req.params;
    const projectPath = req.query.projectPath as string;
    
    let session: any = null;
    
    // If projectPath is provided, read from Claude Code history
    if (projectPath) {
      console.log('Reading Claude history messages for session:', sessionId, 'in project:', projectPath);
      const claudeSessions = readClaudeHistorySessions(projectPath);
      session = claudeSessions.find(s => s.id === sessionId);
      
      if (session) {
        console.log('📨 Found session with', session.messages?.length || 0, 'messages');
        console.log('📨 First few messages:', session.messages?.slice(0, 3).map((msg: any) => ({
          role: msg.role,
          hasMessageParts: !!msg.messageParts,
          messagePartsCount: msg.messageParts?.length || 0,
          content: msg.content?.slice(0, 50) + '...'
        })));
        
        // Add agentId to match expected format
        session = {
          ...session,
          agentId: agentId
        };
      }
    } else {
      // Use project-specific AgentStorage for sessions (existing behavior)
      const agentStorage = getAgentStorageForRequest(req);
      session = agentStorage.getSession(agentId, sessionId);
    }
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ 
      sessionId: session.id,
      agentId: session.agentId,
      title: session.title,
      messages: session.messages 
    });
  } catch (error) {
    console.error('Failed to get session messages:', error);
    res.status(500).json({ error: 'Failed to retrieve session messages' });
  }
});

// POST /api/sessions/:agentId - Create new session
router.post('/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Verify agent exists
    const agent = globalAgentStorage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Use project-specific AgentStorage for sessions
    const agentStorage = getAgentStorageForRequest(req);
    const session = agentStorage.createSession(agentId, req.body.title);
    res.json({ sessionId: session.id, session });
  } catch (error) {
    console.error('Failed to create agent session:', error);
    res.status(500).json({ error: 'Failed to create agent session' });
  }
});

// DELETE /api/sessions/:agentId/:sessionId - Delete session
router.delete('/:agentId/:sessionId', (req, res) => {
  try {
    const { agentId, sessionId } = req.params;
    
    // Use project-specific AgentStorage for sessions
    const agentStorage = getAgentStorageForRequest(req);
    const deleted = agentStorage.deleteSession(agentId, sessionId);
    res.json({ success: deleted });
  } catch (error) {
    console.error('Failed to delete agent session:', error);
    res.status(500).json({ error: 'Failed to delete agent session' });
  }
});

export default router;
