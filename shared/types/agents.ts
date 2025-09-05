// Agent configuration types
export interface AgentTool {
  name: string;
  enabled: boolean;
  permissions?: {
    requireConfirmation?: boolean;
    allowedPaths?: string[];
    blockedPaths?: string[];
  };
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  
  // AI configuration
  systemPrompt: string;
  maxTurns: number;
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  
  // Available tools
  allowedTools: AgentTool[];
  
  // UI configuration
  ui: {
    icon: string;
    primaryColor: string;
    headerTitle: string;
    headerDescription: string;
    welcomeMessage?: string; // Custom welcome message instead of title + description
    componentType: 'slides' | 'chat' | 'documents' | 'code' | 'custom';
    customComponent?: string; // Path to custom component
  };
  
  // File system integration
  workingDirectory?: string;
  dataDirectory?: string;
  fileTypes?: string[]; // Supported file extensions
  
  // Metadata
  author: string;
  homepage?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  
  // Enable/disable state
  enabled: boolean;
}

export interface AgentSession {
  id: string;
  agentId: string;
  title: string;
  createdAt: number;
  lastUpdated: number;
  messages: AgentMessage[];
  customData?: Record<string, unknown>;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  messageParts?: MessagePart[];
  agentId: string;
}

export interface MessagePart {
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
    claudeId?: string; // Claude's tool use ID for matching with results
  };
  order: number;
}

// Built-in agent templates
export const BUILTIN_AGENTS: Partial<AgentConfig>[] = [
  {
    id: 'ppt-editor',
    name: 'PPT编辑助手',
    description: '专门用于创建和编辑HTML演示文稿的AI助手',
    systemPrompt: `You are an AI assistant specialized in helping users create and edit HTML presentations. 
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
Please respond in Chinese.`,
    allowedTools: [
      { name: 'Write', enabled: true },
      { name: 'Read', enabled: true },
      { name: 'Edit', enabled: true },
      { name: 'Glob', enabled: true },
      { name: 'MultiEdit', enabled: true },
      { name: 'Bash', enabled: true }
    ],
    ui: {
      icon: '🎯',
      primaryColor: '#3B82F6',
      headerTitle: 'AI PPT助手',
      headerDescription: '与AI聊天来编辑你的演示文稿',
      welcomeMessage: '你好！我是你的AI PPT助手，可以帮你创建、编辑和优化HTML演示文稿。有什么需要帮助的吗？',
      componentType: 'slides'
    },
    workingDirectory: '../slides',
    dataDirectory: '.ai-sessions',
    fileTypes: ['.html', '.css', '.js'],
    tags: ['presentation', 'html', 'css', 'slides'],
    enabled: true
  },
  {
    id: 'code-assistant',
    name: '代码助手',
    description: '通用代码开发和审查助手',
    systemPrompt: `You are a professional software development assistant. You can help with:
- Code review and optimization
- Bug fixing and debugging
- Architecture design
- Best practices implementation
- Documentation writing
- Testing strategies

You have access to file system operations and can directly modify code files.
Always follow coding best practices and maintain clean, readable code.
Please respond in Chinese.`,
    allowedTools: [
      { name: 'Write', enabled: true },
      { name: 'Read', enabled: true },
      { name: 'Edit', enabled: true },
      { name: 'Glob', enabled: true },
      { name: 'MultiEdit', enabled: true },
      { name: 'Bash', enabled: true },
      { name: 'Task', enabled: true }
    ],
    ui: {
      icon: '💻',
      primaryColor: '#10B981',
      headerTitle: '代码助手',
      headerDescription: '专业的软件开发和代码审查助手',
      welcomeMessage: '你好！我是专业的代码助手，可以帮你进行代码开发、审查、调试和优化。请告诉我你想要解决的编程问题！',
      componentType: 'code'
    },
    tags: ['coding', 'development', 'review', 'debugging'],
    enabled: true
  },
  {
    id: 'document-writer',
    name: '文档助手',
    description: '专注于文档创建和编辑的助手',
    systemPrompt: `You are a professional document writing assistant. You can help with:
- Creating and editing documentation
- Technical writing
- Content structuring
- Markdown formatting
- Research and information gathering
- Proofreading and editing

You work primarily with text files and markdown documents.
Focus on clarity, accuracy, and professional presentation.
Please respond in Chinese.`,
    allowedTools: [
      { name: 'Write', enabled: true },
      { name: 'Read', enabled: true },
      { name: 'Edit', enabled: true },
      { name: 'Glob', enabled: true },
      { name: 'WebFetch', enabled: true },
      { name: 'WebSearch', enabled: true }
    ],
    ui: {
      icon: '📝',
      primaryColor: '#8B5CF6',
      headerTitle: '文档助手',
      headerDescription: '专业的文档创建和编辑助手',
      welcomeMessage: '你好！我是文档助手，专门帮助你创建、编辑和优化各种文档。无论是技术文档还是普通文档，我都能为你提供专业建议！',
      componentType: 'documents'
    },
    fileTypes: ['.md', '.txt', '.rst', '.adoc'],
    tags: ['documentation', 'writing', 'markdown', 'content'],
    enabled: true
  },
  {
    id: 'general-chat',
    name: '通用聊天助手',
    description: '通用的AI聊天助手，适用于各种对话和咨询',
    systemPrompt: `You are a general-purpose AI assistant. You can help with:
- General questions and conversations
- Problem-solving and brainstorming  
- Information and explanations
- Creative tasks and writing
- Analysis and research
- File operations when needed

You are helpful, harmless, and honest. Always strive to provide accurate and useful information.
Please respond in Chinese unless the user specifically requests another language.`,
    allowedTools: [
      { name: 'Write', enabled: true },
      { name: 'Read', enabled: true },
      { name: 'Edit', enabled: true },
      { name: 'Glob', enabled: true },
      { name: 'MultiEdit', enabled: true },
      { name: 'Bash', enabled: true },
      { name: 'Task', enabled: true },
      { name: 'WebFetch', enabled: true },
      { name: 'WebSearch', enabled: true }
    ],
    ui: {
      icon: '💬',
      primaryColor: '#6366F1',
      headerTitle: '通用聊天',
      headerDescription: '与AI进行自由对话和咨询',
      welcomeMessage: '你好！我是通用AI助手，可以帮你解答问题、进行对话、处理各种任务。有什么我可以帮助你的吗？',
      componentType: 'chat'
    },
    tags: ['general', 'chat', 'conversation', 'assistant'],
    enabled: true
  }
];