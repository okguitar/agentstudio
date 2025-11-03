// Claude Code 历史记录相关类型定义

export interface ClaudeMessageContent {
  type: string;
  text?: string;
  content?: string | any[];
  id?: string;
  name?: string;
  input?: any;
  tool_use_id?: string;
  is_error?: boolean;
  signature?: string;
  thinking?: string;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | any[];
  id?: string;
  model?: string;
  type?: string;
  stop_reason?: string | null;
  stop_sequence?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
    service_tier?: string;
    cache_creation?: {
      ephemeral_1h_input_tokens?: number;
      ephemeral_5m_input_tokens?: number;
    };
  };
}


export interface ClaudeHistoryMessage {
  type: 'summary' | 'user' | 'text' | 'assistant' | 'message' | 'thinking' | 'tool_use' | 'tool_result';
  uuid: string;
  timestamp: string;
  sessionId: string;
  
  // Summary messages
  summary?: string;
  leafUuid?: string;
  
  // User/Assistant messages
  message?: ClaudeMessage;
  
  // Message hierarchy
  parentUuid?: string | null;
  isSidechain?: boolean;
  isMeta?: boolean;
  
  // Context information
  cwd?: string;
  gitBranch?: string;
  version?: string;
  userType?: string;
  requestId?: string;
  
  // Tool execution results
  toolUseResult?: any;
  
  // Compact context markers
  isCompactSummary?: boolean;
  isCompactCommand?: boolean;
  isVisibleInTranscriptOnly?: boolean;
}

export interface ClaudeHistorySession {
  id: string;
  title: string;
  createdAt: string;
  lastUpdated: string;
  messages: ClaudeHistoryMessage[];
}