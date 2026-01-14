# Cloudflare Tunnel 功能说明

## 功能概述

Cloudflare Tunnel 功能允许你一键将本地运行的 AgentStudio 暴露到公网，让你可以从任何地方访问你的 AI 助手。

## 前置要求

1. **Python 3** - 用于执行 Cloudflare API 调用脚本
2. **Cloudflare 账号** - 需要免费注册 Cloudflare 账号
3. **Cloudflare API Token** - 需要在 Cloudflare Dashboard 创建 API Token

## 获取 Cloudflare 凭证

### 1. 创建 API Token

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 选择 "Create Custom Token"
4. 配置权限：
   - **Zone** → **DNS** → **Edit**
   - **Account** → **Cloudflare Tunnel** → **Edit**
5. 设置 Zone Resources 为 "All zones"
6. 创建并复制生成的 Token

### 2. 获取 Account ID

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 在右侧栏可以看到你的 "Account ID"
3. 复制这个 Account ID

## 使用步骤

### 1. 配置凭证

1. 访问 AgentStudio 设置页面：`/settings/cloudflare-tunnel`
2. 在 "Cloudflare 凭证配置" 部分：
   - 输入你的 API Token
   - 输入你的 Account ID
3. 点击 "保存"

### 2. 创建 Tunnel

1. 在 "Tunnel 管理" 部分：
   - **子域名前缀**（可选）：自定义子域名，留空将自动生成
   - **本地端口**：默认为 4936（AgentStudio 后端端口）
2. 点击 "一键启用外网访问"
3. 等待几秒钟，Tunnel 创建完成

### 3. 访问公网地址

创建成功后，你会看到：
- **公网访问地址**：类似 `https://agentstudio-abc123.trycloudflare.com`
- **Tunnel Token**：用于通过 CLI 启动 Tunnel
- **CLI 启动命令**：直接复制运行

### 4. 启动 Tunnel（重要！）

**注意**：创建 Tunnel 只是注册了一个隧道，你还需要启动 cloudflared 客户端来建立连接。

有两种方式启动：

#### 方式 1：使用 Docker（推荐）

```bash
docker run cloudflare/cloudflared:latest tunnel run --token <YOUR_TUNNEL_TOKEN>
```

#### 方式 2：使用 cloudflared CLI

1. 安装 cloudflared：
   ```bash
   # macOS
   brew install cloudflare/cloudflare/cloudflared

   # Linux
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   chmod +x cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

2. 运行 Tunnel：
   ```bash
   cloudflared tunnel run --token <YOUR_TUNNEL_TOKEN>
   ```

### 5. 访问你的应用

现在你可以通过公网 URL 访问 AgentStudio 了！

例如：`https://agentstudio-abc123.trycloudflare.com`

## 技术实现

### 架构组件

1. **Python 脚本** (`scripts/cloudflare_tunnel.py`)
   - 封装 Cloudflare API 调用
   - 支持创建、列表、删除 Tunnel 操作

2. **后端 API** (`backend/src/routes/cloudflareTunnel.ts`)
   - `/api/cloudflare-tunnel/config` - 配置管理
   - `/api/cloudflare-tunnel/create` - 创建 Tunnel
   - `/api/cloudflare-tunnel/delete/:id` - 删除 Tunnel
   - `/api/cloudflare-tunnel/list` - 列出所有 Tunnel

3. **前端页面** (`frontend/src/pages/settings/CloudflareTunnelPage.tsx`)
   - 凭证配置界面
   - 一键创建 Tunnel
   - 显示当前激活的 Tunnel 信息

### 数据存储

配置文件位置：`~/.claude/cloudflare-tunnel.json`

```json
{
  "apiToken": "your-api-token",
  "accountId": "your-account-id",
  "activeTunnel": {
    "tunnelId": "abc123",
    "tunnelName": "agentstudio-xyz",
    "publicUrl": "https://agentstudio-xyz.trycloudflare.com",
    "createdAt": "2025-01-14T...",
    "localPort": 4936
  }
}
```

## 安全注意事项

1. **API Token 安全**
   - API Token 存储在服务器本地
   - 不会被前端直接访问
   - 建议定期轮换 Token

2. **公网访问风险**
   - 启用公网访问后，任何人都可以访问你的 AgentStudio
   - 建议设置访问密码（在 "外观设置" 中配置）
   - 不要在公网 Tunnel 中处理敏感信息

3. **Tunnel 管理**
   - 不使用时及时删除 Tunnel
   - 定期检查活跃的 Tunnel

## 故障排查

### 问题：创建 Tunnel 失败

**可能原因：**
- Python 未安装或版本不对
- API Token 权限不足
- Account ID 错误

**解决方法：**
1. 检查 Python 版本：`python3 --version`
2. 验证 API Token 权限
3. 确认 Account ID 正确

### 问题：公网地址无法访问

**可能原因：**
- cloudflared 客户端未启动
- 本地服务未运行
- 端口配置错误

**解决方法：**
1. 确认 AgentStudio 后端正在运行
2. 启动 cloudflared 客户端
3. 检查端口是否正确（默认 4936）

### 问题：Tunnel Token 无效

**可能原因：**
- Token 已被删除
- Token 过期

**解决方法：**
1. 删除旧的 Tunnel
2. 重新创建新的 Tunnel

## 相关资源

- [Cloudflare Tunnel 官方文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [cloudflared CLI 文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
- [Cloudflare API 文档](https://developers.cloudflare.com/api/)

## 开发说明

### Python 脚本使用

```bash
# 创建 Tunnel
python3 scripts/cloudflare_tunnel.py \
  --api-token YOUR_TOKEN \
  --account-id YOUR_ACCOUNT_ID \
  --action quick \
  --subdomain my-app \
  --local-port 4936

# 列出所有 Tunnel
python3 scripts/cloudflare_tunnel.py \
  --api-token YOUR_TOKEN \
  --account-id YOUR_ACCOUNT_ID \
  --action list

# 删除 Tunnel
python3 scripts/cloudflare_tunnel.py \
  --api-token YOUR_TOKEN \
  --account-id YOUR_ACCOUNT_ID \
  --action delete \
  --tunnel-id TUNNEL_ID
```

### 依赖安装

```bash
cd scripts
pip3 install -r requirements.txt
```

### API 测试

```bash
# 生成 JWT Token
node -e "require('./backend/dist/utils/jwt').generateToken().then(console.log)"

# 测试创建 Tunnel
curl -X POST "http://127.0.0.1:4936/api/cloudflare-tunnel/create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subdomain": "test", "localPort": 4936}'
```
