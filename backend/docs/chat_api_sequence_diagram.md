# /chat API Sequence Diagram

```mermaid
sequenceDiagram
    participant Client as 客户端 (Frontend)
    participant Router as 后端路由 (Express)
    participant ChatHandler as Chat 请求处理器
    participant SessionManager as 会话管理器
    participant ClaudeSDK as Claude Code SDK
    participant AIModel as Claude AI 模型

    Client->>+Router: POST /api/agents/chat (含 message, agentId, sessionId?)
    Router->>+ChatHandler: 处理请求

    Note over ChatHandler: 1. 验证请求参数 (Zod)
    ChatHandler-->>-Router: 若验证失败, 返回 400 错误
    Router-->>-Client: 响应 400 错误

    Note over ChatHandler: 2. 获取 Agent 配置
    ChatHandler-->>-Router: 若 Agent 不存在或禁用, 返回 404/403 错误
    Router-->>-Client: 响应 404/403 错误

    Note over ChatHandler: 3. 准备 SDK 配置 (Options)

    Note over ChatHandler: 4. 会话 (Session) 管理
    opt 提供 sessionId
        Note over SessionManager: 尝试在内存或历史记录中复用 Session
        ChatHandler->>+SessionManager: getSession(sessionId) / resume
        SessionManager-->>-ChatHandler: 返回现有或恢复的 Session
    end
    opt 未提供 sessionId
        Note over SessionManager: 创建一个全新的 Session
        ChatHandler->>+SessionManager: createNewSession()
        SessionManager-->>-ChatHandler: 返回全新 Session 实例
    end

    Note over ChatHandler: 5. 构造用户消息 (含文本和图片)

    Note over ChatHandler: 6. 调用 Claude SDK
    ChatHandler->>+ClaudeSDK: query({ prompt, options, resume? })
    ClaudeSDK->>+AIModel: 发送格式化后的请求
    AIModel-->>-ClaudeSDK: 返回响应流 (Stream)
    ClaudeSDK-->>-ChatHandler: 返回 SDK 消息流

    Note over ChatHandler: 7. 处理响应流并返回给客户端
    ChatHandler->>Client: 设置 SSE 响应头 (text/event-stream)
    loop 遍历 SDK 消息流
        ChatHandler->>ChatHandler: 格式化消息 (JSON)
        opt 收到 'init' 消息 (新会话)
            ChatHandler->>SessionManager: 确认并保存新 Session ID
        end
        ChatHandler-->>Client: res.write(data: JSON_message)
        opt 收到 'result' 消息
            ChatHandler-->>Client: res.end() (结束连接)
            break
        end
    end
```