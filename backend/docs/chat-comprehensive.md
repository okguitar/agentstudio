# 后端 /chat 接口完整时序图

```mermaid
sequenceDiagram
    participant Client
    participant Router
    participant Storage
    participant SessionMgr  
    participant Session
    participant Queue
    participant SDK
    participant MCP
    participant FS

    %% 请求处理阶段
    Client->>Router: POST /chat with params
    Router->>Router: Validate request parameters
    
    %% Agent验证分支
    Router->>Storage: Get agent configuration
    alt Agent not found
        Storage-->>Router: null
        Router->>Client: 404 Agent not found
    else Agent disabled  
        Storage-->>Router: disabled agent
        Router->>Client: 403 Agent disabled
    else Agent valid
        Storage-->>Router: valid agent config
        Router->>Router: Build system prompt
    end

    %% MCP工具配置分支
    alt MCP tools provided
        Router->>FS: Read MCP configuration file
        FS-->>Router: MCP server settings
        Router->>Router: Configure MCP servers
    else No MCP tools
        Router->>Router: Skip MCP setup
    end

    %% 会话管理分支 - 关键业务逻辑
    alt sessionId provided
        Router->>SessionMgr: Get session by sessionId
        
        alt Session exists in memory
            SessionMgr-->>Router: Return active session
            Router->>Router: Reuse existing session
        else Session not in memory
            SessionMgr-->>Router: Session not found
            SessionMgr->>FS: Check session history file
            
            alt Session history exists
                FS-->>SessionMgr: History file found
                SessionMgr->>Session: Create session with resume mode
                Session->>Session: Set resumeSessionId
            else No session history
                FS-->>SessionMgr: No history file
                SessionMgr->>Session: Create new session
                Session->>Session: Generate new session
            end
        end
    else No sessionId provided
        SessionMgr->>Session: Create completely new session
        SessionMgr->>SessionMgr: Store with temporary key
    end

    %% Claude SDK初始化
    Session->>Queue: Create MessageQueue instance
    Session->>SDK: Initialize query stream with options
    
    alt Resume existing session
        SDK->>FS: Load conversation history
        FS-->>SDK: Historical message data
        Session->>Session: Restore conversation context
    else New session
        Session->>Session: Start fresh conversation
    end
    
    SDK-->>Session: Return async generator stream
    Session->>Session: Start background response handler

    %% 消息处理流程
    Router->>Router: Build message content with text and images
    Router->>Session: Send message with response callback
    Session->>Session: Generate unique request ID
    Session->>Queue: Push message to async queue
    SDK->>Queue: Get message via async iterator
    Queue-->>SDK: Yield user message to SDK

    %% MCP工具连接
    alt MCP tools configured
        SDK->>MCP: Start MCP server connections
        MCP-->>SDK: Initialize tool capabilities
        SDK->>SDK: MCP tools ready for use
    else No MCP tools
        SDK->>SDK: Continue without external tools
    end

    %% 响应流处理
    SDK->>Session: Start streaming responses
    Session->>Session: Handle response in background
    Session->>Router: Forward response with metadata
    Router->>Router: Add agentId and timestamp
    Router->>Client: Send SSE streaming data

    %% 会话确认逻辑
    alt Response contains sessionId
        Session->>Session: Save Claude session ID
        Session->>SessionMgr: Confirm session mapping
        SessionMgr->>SessionMgr: Update session indexes
    end

    %% 数据持久化
    SDK->>FS: Auto-save conversation to claude directory
    SessionMgr->>SessionMgr: Update session activity timestamp
```

## 完整业务场景分析

### 🎯 核心执行路径详解

#### 路径1: 全新用户首次对话
```
无sessionId → 创建新会话 → 初始化SDK → 处理消息 → 确认sessionId → 保存历史
```

#### 路径2: 用户继续现有对话  
```
有sessionId且在内存 → 复用会话 → 直接处理 → 更新历史
```

#### 路径3: 用户恢复中断会话
```
有sessionId但不在内存 → 检查历史 → 恢复会话上下文 → 处理新消息
```

#### 路径4: 使用外部工具的对话
```
检测MCP工具 → 读取配置 → 连接服务器 → 工具调用可用 → 处理带工具的对话
```

#### 路径5: 错误和异常情况
```
Agent验证失败 → 立即返回错误
会话创建失败 → 错误响应  
SDK处理异常 → 错误事件推送
```

### 🔧 技术架构特性

#### 会话生命周期管理
- **三级查找策略**: 内存缓存 → 文件历史 → 新建会话
- **状态同步机制**: 内存索引与文件系统双重保障  
- **自动清理策略**: 定期清理空闲和过期会话

#### 流式处理架构
- **Streaming Input Mode**: 一次构造query，持续接收输入
- **异步消息队列**: 解耦用户输入和AI处理逻辑
- **Server-Sent Events**: 实时推送响应数据到前端

#### 外部工具集成
- **MCP协议支持**: 动态加载和管理外部工具服务器
- **工具生命周期**: 按需连接，自动管理连接状态
- **错误隔离机制**: 工具错误不影响核心对话流程

这个版本完整展示了后端chat接口的所有主要业务分支和技术实现细节！
