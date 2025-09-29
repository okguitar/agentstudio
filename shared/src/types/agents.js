// Built-in agent templates
export const BUILTIN_AGENTS = [
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
            componentType: 'documents'
        },
        fileTypes: ['.md', '.txt', '.rst', '.adoc'],
        tags: ['documentation', 'writing', 'markdown', 'content'],
        enabled: true
    }
];
//# sourceMappingURL=agents.js.map