# Cloudflare Tunnel 架构设计

## 系统架构图

```mermaid
graph TB
    subgraph "用户设备"
        Browser[浏览器]
        Mobile[移动设备]
    end

    subgraph "Cloudflare 网络"
        CDN[Cloudflare CDN]
        TunnelService[Tunnel Service]
        DNS[DNS 解析]
    end

    subgraph "本地服务器"
        subgraph "AgentStudio Frontend"
            UI[React UI<br/>CloudflareTunnelPage]
        end

        subgraph "AgentStudio Backend"
            API[Express API<br/>/api/cloudflare-tunnel/*]
            Python[Python Script<br/>cloudflare_tunnel.py]
            Config[配置存储<br/>~/.claude/cloudflare-tunnel.json]
        end

        Backend[AgentStudio Backend<br/>Port 4936]
        CloudflaredClient[cloudflared 客户端]
    end

    Browser -->|1. 访问设置页面| UI
    UI -->|2. 配置凭证| API
    API -->|3. 保存到本地| Config
    UI -->|4. 点击创建 Tunnel| API
    API -->|5. 调用 Python 脚本| Python
    Python -->|6. Cloudflare API 调用| TunnelService
    TunnelService -->|7. 返回 Tunnel 信息| Python
    Python -->|8. 返回结果| API
    API -->|9. 显示公网 URL| UI

    CloudflaredClient -->|10. 建立安全隧道| TunnelService
    TunnelService -->|双向加密连接| CloudflaredClient
    CloudflaredClient -->|11. 转发请求| Backend

    Mobile -->|12. 访问公网 URL| DNS
    DNS -->|解析到 Cloudflare| CDN
    CDN -->|13. 通过 Tunnel| TunnelService
    TunnelService -->|14. 转发到本地| CloudflaredClient
    CloudflaredClient -->|15. 转发到后端| Backend
    Backend -->|16. 返回响应| CloudflaredClient
    CloudflaredClient -->|17. 通过 Tunnel| TunnelService
    TunnelService -->|18. 返回给用户| Mobile

    style TunnelService fill:#f96,stroke:#333,stroke-width:2px
    style CloudflaredClient fill:#6cf,stroke:#333,stroke-width:2px
    style Backend fill:#6f6,stroke:#333,stroke-width:2px
```

## 详细工作流程

### 阶段 1：配置和创建 Tunnel

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as React UI
    participant API as Backend API
    participant Python as Python Script
    participant CF as Cloudflare API

    User->>UI: 1. 打开设置页面
    User->>UI: 2. 输入 API Token & Account ID
    UI->>API: POST /api/cloudflare-tunnel/config
    API->>API: 保存到 ~/.claude/cloudflare-tunnel.json
    API-->>UI: 保存成功

    User->>UI: 3. 点击"一键启用外网访问"
    UI->>API: POST /api/cloudflare-tunnel/create
    API->>Python: 执行 cloudflare_tunnel.py --action quick
    Python->>CF: POST /accounts/{id}/cfd_tunnel
    CF-->>Python: 返回 Tunnel ID, Secret
    Python->>Python: 生成 Tunnel Token
    Python->>CF: PUT /accounts/{id}/cfd_tunnel/{id}/configurations
    CF-->>Python: 配置成功
    Python-->>API: 返回 Tunnel 详情 (JSON)
    API->>API: 保存 activeTunnel 信息
    API-->>UI: 返回公网 URL 和 Token
    UI->>User: 显示成功信息和 URL
```

### 阶段 2：启动 Tunnel 连接

```mermaid
sequenceDiagram
    participant User as 用户
    participant Cloudflared as cloudflared 客户端
    participant CF as Cloudflare 边缘节点
    participant Backend as AgentStudio 后端

    User->>Cloudflared: docker run cloudflared tunnel run --token XXX
    Cloudflared->>Cloudflared: 解析 Token (Account ID, Tunnel ID, Secret)
    Cloudflared->>CF: 建立 WebSocket 加密连接
    CF->>CF: 验证 Tunnel 凭证
    CF-->>Cloudflared: 连接建立成功
    Cloudflared->>Backend: 测试本地连接 (localhost:4936)
    Backend-->>Cloudflared: 健康检查 OK
    Note over Cloudflared,CF: 持久化连接建立<br/>等待转发请求
```

### 阶段 3：外网访问流程

```mermaid
sequenceDiagram
    participant Client as 外网用户
    participant DNS as Cloudflare DNS
    participant Edge as Cloudflare 边缘节点
    participant Tunnel as Tunnel Service
    participant Cloudflared as cloudflared 客户端
    participant Backend as AgentStudio 后端

    Client->>DNS: 访问 https://agentstudio-xyz.trycloudflare.com
    DNS-->>Client: 返回 Cloudflare IP
    Client->>Edge: HTTPS 请求
    Edge->>Tunnel: 查找对应的 Tunnel
    Tunnel->>Cloudflared: 通过加密隧道转发请求
    Cloudflared->>Backend: HTTP 请求到 localhost:4936
    Backend->>Backend: 处理请求 (API/页面)
    Backend-->>Cloudflared: HTTP 响应
    Cloudflared-->>Tunnel: 通过加密隧道返回
    Tunnel-->>Edge: 返回响应
    Edge-->>Client: HTTPS 响应
```

## 核心组件说明

### 1. Python Script (`cloudflare_tunnel.py`)

**职责**：封装 Cloudflare API 调用

**关键功能**：
- `create_tunnel()` - 创建 Tunnel 并生成凭证
- `create_dns_route()` - 配置 DNS 路由规则
- `get_tunnel_token()` - 生成 Base64 编码的 Tunnel Token
- `create_quick_tunnel()` - 一键创建完整配置

**API 调用流程**：
```python
# 1. 创建 Tunnel
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel
Body: {
    "name": "agentstudio-xyz",
    "tunnel_secret": "<random_32_chars>",
    "config_src": "cloudflare"
}

# 2. 配置路由规则
PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations
Body: {
    "config": {
        "ingress": [
            {
                "hostname": "*.trycloudflare.com",
                "service": "http://localhost:4936"
            }
        ]
    }
}

# 3. 生成 Token
Base64({ "a": account_id, "t": tunnel_id, "s": tunnel_secret })
```

### 2. Backend API (`cloudflareTunnel.ts`)

**路由设计**：

| 端点 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/api/cloudflare-tunnel/config` | GET | 获取配置（脱敏） | JWT |
| `/api/cloudflare-tunnel/config` | POST | 保存 API 凭证 | JWT |
| `/api/cloudflare-tunnel/create` | POST | 创建 Tunnel | JWT |
| `/api/cloudflare-tunnel/delete/:id` | DELETE | 删除 Tunnel | JWT |
| `/api/cloudflare-tunnel/list` | GET | 列出所有 Tunnel | JWT |

**配置存储结构**：
```json
{
  "apiToken": "cloudflare_api_token_here",
  "accountId": "cloudflare_account_id_here",
  "activeTunnel": {
    "tunnelId": "abc-123-def-456",
    "tunnelName": "agentstudio-xyz789",
    "publicUrl": "https://agentstudio-xyz789.trycloudflare.com",
    "createdAt": "2025-01-14T12:00:00Z",
    "localPort": 4936
  }
}
```

### 3. Frontend UI (`CloudflareTunnelPage.tsx`)

**UI 状态机**：
```mermaid
stateDiagram-v2
    [*] --> 未配置凭证
    未配置凭证 --> 已配置凭证: 保存凭证
    已配置凭证 --> 创建中: 点击创建
    创建中 --> Tunnel已激活: 创建成功
    创建中 --> 已配置凭证: 创建失败
    Tunnel已激活 --> 已配置凭证: 删除Tunnel
    已配置凭证 --> 未配置凭证: 更新凭证
```

**关键状态**：
- `config` - Tunnel 配置信息
- `tunnelDetails` - 新创建的 Tunnel 详情
- `loading/creating/saving` - 操作状态
- `error/success` - 消息提示

### 4. cloudflared 客户端

**作用**：在本地和 Cloudflare 之间建立安全隧道

**工作原理**：
```
┌─────────────────────────────────────────────────────────────┐
│  cloudflared 客户端                                          │
│                                                               │
│  1. 解析 Tunnel Token                                        │
│     Token = Base64({ account, tunnel_id, secret })          │
│                                                               │
│  2. 与 Cloudflare 建立 WebSocket 连接                       │
│     - 使用 TLS 加密                                          │
│     - 验证 Tunnel Secret                                     │
│     - 保持长连接                                             │
│                                                               │
│  3. 监听来自 Cloudflare 的请求                              │
│     - 接收 HTTP 请求                                         │
│     - 转发到 localhost:4936                                  │
│     - 返回响应给 Cloudflare                                  │
│                                                               │
│  4. 心跳和重连机制                                           │
│     - 定期发送心跳                                           │
│     - 断线自动重连                                           │
└─────────────────────────────────────────────────────────────┘
```

**启动命令**：
```bash
# 方式1: Docker
docker run cloudflare/cloudflared:latest tunnel run --token <TOKEN>

# 方式2: 本地安装
cloudflared tunnel run --token <TOKEN>
```

## 数据流向图

```mermaid
graph LR
    subgraph "外网用户"
        A[浏览器]
    end

    subgraph "Cloudflare 全球网络"
        B[边缘节点]
        C[Tunnel Service]
    end

    subgraph "用户本地电脑"
        D[cloudflared<br/>客户端]
        E[AgentStudio<br/>Backend:4936]
    end

    A -->|HTTPS| B
    B -->|加密隧道| C
    C <-->|WebSocket<br/>持久连接| D
    D -->|HTTP| E
    E -->|响应| D
    D -->|加密数据| C
    C -->|加密数据| B
    B -->|HTTPS| A

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#ffe1e1
    style D fill:#e1ffe1
    style E fill:#f0e1ff
```

## 安全机制

### 1. 认证和授权

```mermaid
graph TD
    A[Cloudflare API Token] -->|存储| B[服务器本地文件]
    B -->|加密传输| C[Python Script]
    C -->|HTTPS API 调用| D[Cloudflare API]
    D -->|验证权限| E[创建 Tunnel]
    E -->|生成| F[Tunnel Secret]
    F -->|编码| G[Tunnel Token]
    G -->|仅显示一次| H[用户复制]
    H -->|启动客户端| I[cloudflared]
    I -->|验证 Secret| D
```

### 2. 数据加密

- **传输层**：所有连接使用 TLS 1.3 加密
- **隧道层**：cloudflared 使用 WebSocket + TLS
- **应用层**：外网用户访问使用 HTTPS

### 3. 访问控制

```
外网用户
    ↓
Cloudflare WAF (防火墙)
    ↓
DDoS 保护
    ↓
Tunnel Service (验证 Tunnel 存在)
    ↓
cloudflared (验证 Token)
    ↓
本地服务 (可选：JWT 认证)
```

## 性能优化

### 1. 全球边缘节点

- Cloudflare 在全球有 300+ 个数据中心
- 用户请求自动路由到最近的边缘节点
- 减少延迟，提升访问速度

### 2. 持久连接

- cloudflared 与 Cloudflare 保持长连接
- 避免每次请求重新建立连接
- 减少握手开销

### 3. 连接复用

```
单个 Tunnel 连接可以处理多个并发请求：

请求1 ──┐
请求2 ──┤
请求3 ──┼──> cloudflared <──> Cloudflare
请求4 ──┤
请求5 ──┘
```

## 故障处理

### 1. cloudflared 自动重连

```mermaid
sequenceDiagram
    participant CF as Cloudflare
    participant Client as cloudflared

    Client->>CF: 建立连接
    Note over CF,Client: 正常运行
    CF--xClient: 网络中断
    Client->>Client: 检测到断线
    Client->>Client: 等待 5 秒
    Client->>CF: 尝试重连
    CF-->>Client: 重连成功
    Note over CF,Client: 恢复正常
```

### 2. 健康检查

- cloudflared 定期检查本地服务健康状态
- 如果本地服务宕机，返回 502 错误
- 服务恢复后自动继续转发

## 与传统方案对比

| 特性 | Cloudflare Tunnel | 传统端口映射 | VPN |
|------|-------------------|--------------|-----|
| 配置难度 | ⭐ 简单 | ⭐⭐⭐ 复杂 | ⭐⭐⭐⭐ 很复杂 |
| 公网 IP | ❌ 不需要 | ✅ 需要 | ✅ 需要 |
| 路由器配置 | ❌ 不需要 | ✅ 需要 | ✅ 需要 |
| 防火墙穿透 | ✅ 自动 | ❌ 手动 | ❌ 手动 |
| SSL 证书 | ✅ 自动 | ❌ 手动 | ❌ 手动 |
| DDoS 保护 | ✅ 内置 | ❌ 无 | ❌ 无 |
| 全球加速 | ✅ 是 | ❌ 否 | ❌ 否 |
| 成本 | 💰 免费 | 💰 ISP费用 | 💰💰 服务器成本 |

## 总结

Cloudflare Tunnel 的核心优势：

1. **无需公网 IP** - 适合家庭宽带
2. **零配置穿透** - 自动穿透 NAT 和防火墙
3. **全球加速** - 利用 Cloudflare CDN
4. **安全可靠** - 端到端加密 + DDoS 防护
5. **一键部署** - 从创建到运行只需几分钟

整个系统的精髓在于：**将复杂的网络配置交给 Cloudflare 处理，开发者只需关注应用本身**。
