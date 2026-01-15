# 完整部署与集成指引

本指引将带你一步步完成从 0 到上线的全过程。

---

## 阶段一: 准备 Cloudflare 账户 (15分钟)

### 步骤 1.1: 获取 Cloudflare API Token

1. 登录 Cloudflare Dashboard: https://dash.cloudflare.com/
2. 点击右上角头像 → **My Profile**
3. 左侧菜单选择 **API Tokens**
4. 点击 **Create Token**
5. 选择模板 **Edit zone DNS** 或自定义:
   ```
   权限配置:
   - Zone → DNS → Edit
   - Account → Cloudflare Tunnel → Edit
   ```
6. 点击 **Continue to summary** → **Create Token**
7. **复制并保存 Token** (只显示一次!)
   ```
   示例: abc123def456ghi789...
   ```

### 步骤 1.2: 获取 Account ID

1. 回到 Cloudflare 首页: https://dash.cloudflare.com/
2. 选择你的域名 (如 `agentstudio.cc`)
3. 在右侧边栏找到 **Account ID**
4. 点击复制按钮
   ```
   示例: 1234567890abcdef1234567890abcdef
   ```

### 步骤 1.3: 获取 Zone ID

1. 在同一页面,向下滚动到 **API** 部分
2. 找到 **Zone ID**
3. 点击复制按钮
   ```
   示例: fedcba0987654321fedcba0987654321
   ```

### 步骤 1.4: 确认域名信息

- **域名**: 你的顶级域名 (如 `agentstudio.cc`)
- **DNS**: 确认 DNS 管理已托管在 Cloudflare
- **状态**: 确认域名状态为 Active

**✅ 检查点**: 你现在应该有:
- [ ] Cloudflare API Token
- [ ] Account ID
- [ ] Zone ID
- [ ] 已确认的域名

---

## 阶段二: 本地测试代理服务 (20分钟)

### 步骤 2.1: 安装依赖

```bash
cd /Users/kongjie/projects/agentstudio/cloudflare-proxy

# 创建虚拟环境 (推荐)
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 步骤 2.2: 配置环境变量

```bash
# 复制模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

填写以下内容 (使用步骤 1 获取的值):

```env
# Cloudflare 配置 (填写真实值)
CLOUDFLARE_API_TOKEN=你的_API_Token
CLOUDFLARE_ACCOUNT_ID=你的_Account_ID
CLOUDFLARE_ZONE_ID=你的_Zone_ID
PARENT_DOMAIN=agentstudio.cc  # 改成你的实际域名

# API 密钥 (先用测试密钥)
API_KEYS=test-dev-key-12345

# 数据库 (本地测试用 SQLite)
DATABASE_URL=sqlite:///./proxy.db

# 服务配置
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

保存退出 (Ctrl+X → Y → Enter)

### 步骤 2.3: 启动开发服务器

```bash
python run.py
```

看到以下输出表示成功:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**保持这个终端窗口运行**,打开新终端进行测试。

### 步骤 2.4: 测试 API (在新终端)

```bash
# 1. 健康检查
curl http://localhost:8000/health

# 期望输出: {"status":"healthy"}

# 2. 检查子域名可用性
curl -H "X-API-Key: test-dev-key-12345" \
  http://localhost:8000/api/subdomain/check/test123

# 期望输出: {"subdomain":"test123","available":true,"message":"..."}

# 3. 创建测试子域名 (真实创建!)
curl -X POST http://localhost:8000/api/subdomain/create \
  -H "X-API-Key: test-dev-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "test-'$(date +%s)'",
    "localPort": 4936,
    "description": "Test subdomain"
  }'
```

**⚠️ 重要**: 第 3 步会在 Cloudflare 真实创建 Tunnel 和 DNS 记录!

成功的响应示例:
```json
{
  "success": true,
  "subdomain": "test-1234567890",
  "publicUrl": "https://test-1234567890.agentstudio.cc",
  "tunnelId": "xxx-xxx-xxx",
  "tunnelToken": "eyJhIjoi...",
  "createdAt": "2024-01-15T10:30:00Z",
  "instructions": {
    "cli": "cloudflared tunnel run --token eyJhIjoi...",
    "docker": "docker run cloudflare/cloudflared:latest tunnel run --token eyJhIjoi..."
  }
}
```

### 步骤 2.5: 验证 Cloudflare 状态

1. 登录 Cloudflare Dashboard
2. 选择你的域名
3. 左侧菜单: **DNS** → **Records**
   - 应该看到新创建的 CNAME 记录
4. 左侧菜单: **Traffic** → **Cloudflare Tunnel**
   - 应该看到新创建的 Tunnel

### 步骤 2.6: 清理测试数据

```bash
# 获取子域名列表
curl -H "X-API-Key: test-dev-key-12345" \
  http://localhost:8000/api/subdomain/list

# 删除测试子域名 (替换为实际的子域名)
curl -X DELETE \
  -H "X-API-Key: test-dev-key-12345" \
  http://localhost:8000/api/subdomain/test-1234567890
```

**✅ 检查点**:
- [ ] 服务成功启动
- [ ] 所有 API 测试通过
- [ ] Cloudflare 中看到了创建的记录
- [ ] 成功删除测试数据

**如果测试失败,检查**:
- API Token 权限是否正确
- Account ID 和 Zone ID 是否匹配你的域名
- 查看服务器日志: 终端输出会显示详细错误

---

## 阶段三: 部署代理服务到生产环境 (30分钟)

### 选项 A: 使用现有服务器

**假设你有一台服务器 (如阿里云、腾讯云、AWS 等)**

#### 步骤 3A.1: 上传代码到服务器

```bash
# 在本地
cd /Users/kongjie/projects/agentstudio
tar -czf cloudflare-proxy.tar.gz cloudflare-proxy/

# 上传到服务器 (替换为你的服务器 IP)
scp cloudflare-proxy.tar.gz root@your-server-ip:/opt/

# SSH 登录服务器
ssh root@your-server-ip

# 解压
cd /opt
tar -xzf cloudflare-proxy.tar.gz
cd cloudflare-proxy
```

#### 步骤 3A.2: 安装 Docker (如果未安装)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装 Docker Compose
apt-get install -y docker-compose

# 启动 Docker
systemctl start docker
systemctl enable docker
```

#### 步骤 3A.3: 配置生产环境变量

```bash
cd /opt/cloudflare-proxy

# 创建生产 .env
cat > .env << 'EOF'
# Cloudflare 配置 (使用真实值)
CLOUDFLARE_API_TOKEN=你的_API_Token
CLOUDFLARE_ACCOUNT_ID=你的_Account_ID
CLOUDFLARE_ZONE_ID=你的_Zone_ID
PARENT_DOMAIN=agentstudio.cc

# 生产 API 密钥 (生成强密钥)
API_KEYS=生成的强密钥1,生成的强密钥2

# MySQL 配置
MYSQL_ROOT_PASSWORD=强密码1
MYSQL_USER=cfproxy
MYSQL_PASSWORD=强密码2

# 服务配置
HOST=0.0.0.0
PORT=8000
DEBUG=false
EOF

# 生成强 API 密钥
python3 -c "import secrets; print('API Key 1:', secrets.token_urlsafe(32))"
python3 -c "import secrets; print('API Key 2:', secrets.token_urlsafe(32))"

# 把生成的密钥填入 .env 的 API_KEYS
nano .env
```

#### 步骤 3A.4: 启动生产服务 (Docker Compose)

```bash
# 创建生产 docker-compose 配置
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: cloudflare-proxy-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: cloudflare_proxy
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  cloudflare-proxy:
    build: .
    container_name: cloudflare-proxy
    ports:
      - "8000:8000"
    environment:
      - CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}
      - CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID}
      - CLOUDFLARE_ZONE_ID=${CLOUDFLARE_ZONE_ID}
      - PARENT_DOMAIN=${PARENT_DOMAIN}
      - API_KEYS=${API_KEYS}
      - DATABASE_URL=mysql+pymysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/cloudflare_proxy
      - HOST=0.0.0.0
      - PORT=8000
      - DEBUG=false
    depends_on:
      mysql:
        condition: service_healthy
    restart: unless-stopped

volumes:
  mysql-data:
EOF

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

等待看到 "Application startup complete" 表示成功。

#### 步骤 3A.5: 配置 Nginx 反向代理

```bash
# 安装 Nginx
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# 创建 Nginx 配置
cat > /etc/nginx/sites-available/cloudflare-proxy << 'EOF'
server {
    listen 80;
    server_name cf-proxy.agentstudio.cc;  # 改成你的实际子域名

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/cloudflare-proxy /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 申请 SSL 证书
certbot --nginx -d cf-proxy.agentstudio.cc
```

#### 步骤 3A.6: 配置 DNS 记录

1. 登录 Cloudflare Dashboard
2. 选择你的域名
3. **DNS** → **Add record**:
   - Type: `A`
   - Name: `cf-proxy`
   - IPv4 address: `你的服务器公网 IP`
   - Proxy status: `Proxied` (橙色云朵)
4. 保存

等待 DNS 生效 (1-5分钟)。

#### 步骤 3A.7: 测试生产服务

```bash
# 测试健康检查
curl https://cf-proxy.agentstudio.cc/health

# 测试 API (使用生产 API Key)
curl -H "X-API-Key: 你的生产API密钥" \
  https://cf-proxy.agentstudio.cc/api/subdomain/check/test
```

**✅ 检查点**:
- [ ] Docker 容器正常运行
- [ ] Nginx 配置正确
- [ ] SSL 证书申请成功
- [ ] DNS 解析正确
- [ ] API 测试通过

### 选项 B: 本地开发环境 (跳过生产部署)

如果你只是想在本地测试集成,可以继续使用 `python run.py` 运行服务,跳到阶段四。

---

## 阶段四: 集成到 AgentStudio (45分钟)

### 步骤 4.1: 更新 AgentStudio 后端环境变量

```bash
cd /Users/kongjie/projects/agentstudio/backend

# 编辑 .env
nano .env
```

添加以下配置:

```env
# Cloudflare Proxy Service
CLOUDFLARE_PROXY_URL=https://cf-proxy.agentstudio.cc  # 或 http://localhost:8000 (本地测试)
CLOUDFLARE_PROXY_API_KEY=你的生产API密钥
```

### 步骤 4.2: 创建新的 API 路由

创建文件 `backend/src/routes/publicAccess.ts`:

```bash
# 创建文件
cat > backend/src/routes/publicAccess.ts << 'TSEOF'
import express, { Router } from 'express';

const router: Router = express.Router();

const PROXY_URL = process.env.CLOUDFLARE_PROXY_URL;
const PROXY_API_KEY = process.env.CLOUDFLARE_PROXY_API_KEY;

if (!PROXY_URL || !PROXY_API_KEY) {
  console.warn('Warning: CLOUDFLARE_PROXY_URL or CLOUDFLARE_PROXY_API_KEY not configured');
}

// GET /api/public-access/check/:subdomain
router.get('/check/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    const response = await fetch(
      `${PROXY_URL}/api/subdomain/check/${subdomain}`,
      {
        headers: {
          'X-API-Key': PROXY_API_KEY!
        }
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error checking subdomain:', error);
    res.status(500).json({
      error: 'Failed to check subdomain',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/public-access/create
router.post('/create', async (req, res) => {
  try {
    const { subdomain, localPort = 4936, description } = req.body;

    const response = await fetch(
      `${PROXY_URL}/api/subdomain/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': PROXY_API_KEY!
        },
        body: JSON.stringify({
          subdomain,
          localPort,
          description
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create subdomain');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error creating subdomain:', error);
    res.status(500).json({
      error: 'Failed to create subdomain',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/public-access/:subdomain
router.delete('/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    const response = await fetch(
      `${PROXY_URL}/api/subdomain/${subdomain}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-Key': PROXY_API_KEY!
        }
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error deleting subdomain:', error);
    res.status(500).json({
      error: 'Failed to delete subdomain',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/public-access/list
router.get('/list', async (req, res) => {
  try {
    const response = await fetch(
      `${PROXY_URL}/api/subdomain/list`,
      {
        headers: {
          'X-API-Key': PROXY_API_KEY!
        }
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error listing subdomains:', error);
    res.status(500).json({
      error: 'Failed to list subdomains',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
TSEOF
```

### 步骤 4.3: 注册路由

编辑 `backend/src/index.ts`:

```bash
nano backend/src/index.ts
```

添加以下代码 (在其他路由注册之后):

```typescript
// ... 其他 imports
import publicAccessRouter from './routes/publicAccess.js';

// ... 其他路由注册

// Public Access routes
app.use('/api/public-access', publicAccessRouter);
```

### 步骤 4.4: 重启 AgentStudio 后端

```bash
cd /Users/kongjie/projects/agentstudio

# 重新构建
pnpm run build:backend

# 重启服务
pnpm run dev:backend
```

### 步骤 4.5: 测试新 API

在新终端:

```bash
# 测试检查子域名
curl http://localhost:4936/api/public-access/check/mytest

# 测试创建子域名
curl -X POST http://localhost:4936/api/public-access/create \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "mytest-'$(date +%s)'",
    "localPort": 4936,
    "description": "Test from AgentStudio"
  }'
```

**✅ 检查点**:
- [ ] 后端环境变量配置正确
- [ ] 新路由文件创建成功
- [ ] 路由注册成功
- [ ] API 测试通过

---

## 阶段五: 简化前端 UI (30分钟)

### 步骤 5.1: 创建简化的公网访问组件

创建新文件 `frontend/src/pages/settings/PublicAccessPage.tsx`:

```bash
# 先看看现有的实现
ls -la frontend/src/pages/settings/CloudflareTunnelPage.tsx
```

我会帮你创建一个简化版本。请在下一个对话中告诉我,我会继续...

---

## 阶段六: 端到端测试 (15分钟)

### 步骤 6.1: 完整流程测试

1. 打开 AgentStudio 前端
2. 进入设置 → 公网访问
3. 填写子域名 (可选)
4. 点击 "一键启用公网访问"
5. 复制返回的 cloudflared 命令
6. 在终端运行命令:
   ```bash
   docker run -d cloudflare/cloudflared:latest tunnel run --token <返回的token>
   ```
7. 等待 10 秒
8. 访问返回的公网 URL (如 `https://mytest.agentstudio.cc`)
9. 应该能看到 AgentStudio 界面!

### 步骤 6.2: 测试删除功能

1. 在前端点击 "删除公网访问"
2. 确认删除
3. 停止 cloudflared 容器:
   ```bash
   docker ps  # 找到 cloudflared 容器 ID
   docker stop <container_id>
   ```

**✅ 最终检查点**:
- [ ] 成功创建子域名
- [ ] cloudflared 连接成功
- [ ] 公网 URL 可访问
- [ ] 成功删除子域名

---

## 故障排查

### 问题 1: "Cloudflare API Error"

**原因**: API Token 权限不足或无效

**解决**:
```bash
# 检查 Token 权限
# 重新生成 Token,确保包含:
# - Zone → DNS → Edit
# - Account → Cloudflare Tunnel → Edit
```

### 问题 2: "Failed to connect to proxy service"

**原因**: 代理服务未启动或 URL 配置错误

**解决**:
```bash
# 检查代理服务状态
curl http://localhost:8000/health  # 本地
curl https://cf-proxy.agentstudio.cc/health  # 生产

# 检查 AgentStudio 后端环境变量
echo $CLOUDFLARE_PROXY_URL
echo $CLOUDFLARE_PROXY_API_KEY
```

### 问题 3: "Subdomain already taken"

**原因**: 子域名已被使用

**解决**:
```bash
# 检查子域名状态
curl -H "X-API-Key: your_key" \
  https://cf-proxy.agentstudio.cc/api/subdomain/check/yoursubdomain

# 如果是孤儿记录,手动从 Cloudflare 删除 DNS 记录
```

### 问题 4: 公网 URL 无法访问

**原因**: cloudflared 客户端未启动或连接失败

**解决**:
```bash
# 检查 cloudflared 日志
docker logs <cloudflared_container_id>

# 确认本地服务运行在正确端口
curl http://localhost:4936

# 检查 Cloudflare Dashboard 中 Tunnel 状态
```

---

## 下一步优化 (可选)

1. **监控告警**
   - 设置健康检查监控
   - 配置 Cloudflare Worker 进行健康检查
   - 邮件/Slack 告警

2. **定期清理**
   - 设置 cron job 清理 30 天前删除的记录
   - 自动清理孤儿 DNS 记录

3. **用户管理**
   - 为每个用户分配专属子域名
   - 限制每个用户的子域名数量
   - 添加使用统计

4. **性能优化**
   - 添加 Redis 缓存 DNS 查询结果
   - 实现连接池
   - 启用 Gzip 压缩

---

## 总结

完成以上步骤后,你将拥有:

✅ 一个生产级的 Cloudflare 子域名代理服务
✅ AgentStudio 与代理服务的完整集成
✅ 简化的用户体验 (一键生成公网访问)
✅ 统一的域名管理 (*.agentstudio.cc)

**预计总时间**: 2-3 小时

祝你部署顺利! 🚀
