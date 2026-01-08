# API Key 生成指南

## 概述

本项目使用 A2A（Agent-to-Agent）协议进行项目间通信。每个项目可以生成多个 API key 用于外部调用。

## API Key 格式

```
agt_proj_{projectIdHash}_{random}
```

- `projectIdHash`: 项目路径的 SHA256 哈希前 8 位
- `random`: 32 位十六进制随机字符

示例: `agt_proj_7cdda11c_72eceb2fd8efd71fa3354bdf6184dcc4`

## 安全机制

1. **双重加密存储**:
   - `keyHash`: bcrypt 哈希（用于验证，salt rounds: 10）
   - `encryptedKey`: AES-256-GCM 加密（用于显示明文）

2. **存储位置**: `{projectPath}/.a2a/api-keys.json`

3. **并发安全**: 使用 `proper-lockfile` 实现文件锁

## 生成方法

### 方法 1: 使用命令行脚本（推荐）

```bash
# 基本用法
npx tsx scripts/generate-api-key.ts <项目绝对路径> [描述]

# 示例
npx tsx scripts/generate-api-key.ts /Users/john/my-project "Development key"

# 为当前项目生成
npx tsx scripts/generate-api-key.ts /Users/kongjie/slides/ai-editor "测试用 API Key"
```

**输出示例**:
```
✅ API Key generated successfully!

════════════════════════════════════════════════════════════
🔑 API Key (show once, save it now!):
════════════════════════════════════════════════════════════
agt_proj_7cdda11c_72eceb2fd8efd71fa3354bdf6184dcc4
════════════════════════════════════════════════════════════

📋 Key Metadata:
  ID:          13531672-61d7-49fb-8694-4038986bd6f3
  Project:     /Users/kongjie/slides/ai-editor
  Description: 测试用 API Key
  Created:     2026-01-06T14:53:56.184Z
```

### 方法 2: 直接调用 Service

```typescript
import { generateApiKey } from './backend/src/services/a2a/apiKeyService.js';

const { key, keyData } = await generateApiKey(
  '/Users/kongjie/slides/ai-editor',
  'My API Key'
);

console.log('Generated key:', key);
console.log('Key ID:', keyData.id);
```

### 方法 3: 使用 Web API

```bash
# 生成 API key
curl -X POST http://localhost:4936/api/a2a/api-keys/<url-encoded-project-path> \
  -H "Content-Type: application/json" \
  -d '{"description": "My API Key"}'

# 示例
curl -X POST 'http://localhost:4936/api/a2a/api-keys/%2FUsers%2Fkongjie%2Fslides%2Fai-editor' \
  -H "Content-Type: application/json" \
  -d '{"description": "测试用 API Key"}'
```

## 使用 API Key

### 在 HTTP 请求中使用

```bash
curl -X POST http://localhost:4936/a2a/<a2aAgentId>/messages \
  -H "Authorization: Bearer agt_proj_7cdda11c_72eceb2fd8efd71fa3354bdf6184dcc4" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from external agent"}'
```

### 在配置中使用

将 API key 添加到调用项目的 `.a2a/config.json`:

```json
{
  "allowedAgents": [
    {
      "name": "target-project",
      "url": "http://localhost:4936/a2a/<a2aAgentId>",
      "apiKey": "agt_proj_7cdda11c_72eceb2fd8efd71fa3354bdf6184dcc4",
      "description": "Target project agent",
      "enabled": true
    }
  ],
  "taskTimeout": 300000,
  "maxConcurrentTasks": 5
}
```

## 管理 API Keys

### 列出所有 API Keys

```bash
# 使用脚本
npx tsx scripts/list-api-keys.ts /Users/kongjie/slides/ai-editor

# 或使用 Web API
curl http://localhost:4936/api/a2a/api-keys/<url-encoded-project-path>
```

### 撤销 API Key

```bash
# 使用 Web API
curl -X DELETE http://localhost:4936/api/a2a/api-keys/<url-encoded-project-path>/<key-id>
```

### 验证 API Key

```typescript
import { validateApiKey } from './backend/src/services/a2a/apiKeyService.js';

const result = await validateApiKey(
  '/Users/kongjie/slides/ai-editor',
  'agt_proj_7cdda11c_72eceb2fd8efd71fa3354bdf6184dcc4'
);

if (result.valid) {
  console.log('Key is valid, key ID:', result.keyId);
}
```

## 安全最佳实践

1. **立即保存**: 生成后立即保存 API key，之后无法再次查看明文
2. **环境变量**: 将 key 存储在环境变量中，不要硬编码
3. **权限控制**: 为不同用途生成不同的 key
4. **定期轮换**: 使用 `rotateApiKey()` 函数定期更新
5. **监控使用**: 检查 `lastUsedAt` 字段监控异常使用

## 故障排查

### Key 验证失败

检查:
- Key 格式是否正确（`agt_proj_` 前缀）
- 项目路径是否匹配
- Key 是否已被撤销（`revokedAt` 字段）

### 文件锁冲突

如果遇到文件锁问题，检查:
- 是否有其他进程正在修改 `api-keys.json`
- 使用 `LOCK_OPTIONS` 调整重试配置

## 相关文件

- `backend/src/services/a2a/apiKeyService.ts`: API key 核心服务
- `backend/src/routes/a2aManagement.ts`: 管理 API 路由
- `backend/src/types/a2a.ts`: 类型定义
- `{projectPath}/.a2a/api-keys.json`: 存储文件
