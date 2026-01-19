# LAVS 开发者指南

本指南面向想要使用 LAVS 框架为 AgentStudio 开发可视化 Agent 的开发者。

## 什么是 LAVS？

**LAVS (Local Agent View Service)** 是一个协议，让本地 AI Agent 能够：
- 暴露结构化数据接口（类似 GraphQL/REST）
- 提供可交互的 UI 组件
- 实现 AI 和 UI 之间的双向同步

**类比**：MCP 让 Agent 调用外部工具，LAVS 让 Agent 将数据暴露给交互式前端。

## 快速开始

### 1. 创建 Agent 目录结构

```
agents/
└── my-agent/
    ├── lavs.json           # LAVS 清单文件（必需）
    ├── scripts/
    │   └── service.cjs     # 数据处理脚本
    ├── data/
    │   └── data.json       # 持久化数据
    └── view/
        └── index.html      # UI 组件（可选）
```

### 2. 编写 lavs.json 清单

这是 LAVS 的核心配置文件，定义了 Agent 的数据接口。

```json
{
  "lavs": "1.0",
  "name": "my-agent",
  "version": "1.0.0",
  "description": "我的第一个 LAVS Agent",

  "endpoints": [
    {
      "id": "listItems",
      "method": "query",
      "description": "获取所有项目",
      "handler": {
        "type": "script",
        "command": "node",
        "args": ["scripts/service.cjs", "list"],
        "input": "args",
        "timeout": 5000
      }
    },
    {
      "id": "addItem",
      "method": "mutation",
      "description": "添加新项目",
      "handler": {
        "type": "script",
        "command": "node",
        "args": ["scripts/service.cjs", "add"],
        "input": "stdin",
        "timeout": 5000
      },
      "schema": {
        "input": {
          "type": "object",
          "properties": {
            "name": { "type": "string" }
          },
          "required": ["name"]
        }
      }
    }
  ],

  "view": {
    "component": {
      "type": "local",
      "path": "view/index.html"
    }
  },

  "permissions": {
    "fileAccess": ["./data/**/*.json"],
    "networkAccess": false,
    "maxExecutionTime": 30000
  }
}
```

### 3. 实现数据处理脚本

创建 `scripts/service.cjs`：

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// 数据文件路径（支持项目隔离）
const projectPath = process.env.LAVS_PROJECT_PATH;
const dataDir = projectPath 
  ? path.join(projectPath, '.lavs-data', 'my-agent')
  : path.join(__dirname, '..', 'data');

const dataFile = path.join(dataDir, 'data.json');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 读取数据
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  } catch (e) {
    return { items: [] };
  }
}

// 保存数据
function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// 解析输入
function getInput() {
  // 从 stdin 读取 JSON 输入
  const input = fs.readFileSync(0, 'utf-8').trim();
  return input ? JSON.parse(input) : {};
}

// 命令处理
const command = process.argv[2];

switch (command) {
  case 'list': {
    const data = loadData();
    console.log(JSON.stringify(data.items));
    break;
  }

  case 'add': {
    const input = getInput();
    const data = loadData();
    
    const newItem = {
      id: Date.now(),
      name: input.name,
      createdAt: new Date().toISOString()
    };
    
    data.items.push(newItem);
    saveData(data);
    
    console.log(JSON.stringify(newItem));
    break;
  }

  default:
    console.error(JSON.stringify({ error: `Unknown command: ${command}` }));
    process.exit(1);
}
```

### 4. 创建 UI 组件（可选）

创建 `view/index.html`：

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
      background: #1a1a2e;
      color: white;
    }
    
    .item {
      padding: 12px;
      margin: 8px 0;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
    }
    
    button {
      background: #6366f1;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
    }
    
    button:hover {
      background: #5558dd;
    }
    
    input {
      padding: 10px;
      border-radius: 6px;
      border: none;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <h2>My Agent</h2>
  
  <div>
    <input type="text" id="nameInput" placeholder="输入名称">
    <button onclick="addItem()">添加</button>
  </div>
  
  <div id="items"></div>

  <script>
    // LAVS 客户端会被注入
    let lavsClient = null;
    
    // 设置 LAVS 客户端（由容器调用）
    window.setLAVSClient = function(client) {
      lavsClient = client;
      loadItems();
    };
    
    // AI 操作回调（由容器调用）
    window.onAgentAction = function(action) {
      console.log('AI 执行了操作:', action);
      loadItems(); // 刷新数据
    };
    
    async function loadItems() {
      if (!lavsClient) return;
      
      try {
        const items = await lavsClient.call('listItems');
        renderItems(items);
      } catch (e) {
        console.error('加载失败:', e);
      }
    }
    
    function renderItems(items) {
      const container = document.getElementById('items');
      container.innerHTML = items.map(item => `
        <div class="item">
          <strong>${item.name}</strong>
          <small style="color: #888; margin-left: 10px;">
            ${new Date(item.createdAt).toLocaleString()}
          </small>
        </div>
      `).join('');
    }
    
    async function addItem() {
      if (!lavsClient) return;
      
      const input = document.getElementById('nameInput');
      const name = input.value.trim();
      
      if (!name) return;
      
      try {
        await lavsClient.call('addItem', { name });
        input.value = '';
        loadItems();
      } catch (e) {
        console.error('添加失败:', e);
      }
    }
  </script>
</body>
</html>
```

## 核心概念

### Endpoint 类型

| 类型 | 用途 | 说明 |
|------|------|------|
| `query` | 查询数据 | 不修改状态，可缓存 |
| `mutation` | 修改数据 | 修改状态，需要刷新 |
| `subscription` | 实时订阅 | 需要 WebSocket（暂未实现） |

### Handler 类型

| 类型 | 用途 | 示例 |
|------|------|------|
| `script` | 执行脚本 | Node.js, Python, Shell |
| `function` | 调用函数 | JS/TS 模块（暂未实现） |
| `http` | 代理 HTTP | 转发到外部 API（暂未实现） |
| `mcp` | 桥接 MCP | 调用 MCP 工具（暂未实现） |

### 输入模式 (script handler)

| 模式 | 说明 | 用途 |
|------|------|------|
| `args` | 通过命令行参数传递 | 简单参数 |
| `stdin` | 通过标准输入传递 JSON | 复杂对象 |
| `env` | 通过环境变量传递 | 敏感数据 |

## 项目级数据隔离

LAVS 支持按项目隔离数据，脚本通过 `LAVS_PROJECT_PATH` 环境变量获取当前项目路径。

```javascript
const projectPath = process.env.LAVS_PROJECT_PATH;

if (projectPath) {
  // 每个项目有独立的数据目录
  dataDir = path.join(projectPath, '.lavs-data', 'my-agent');
} else {
  // 无项目时使用全局目录
  dataDir = path.join(__dirname, '..', 'data');
}
```

## AI 工具自动注册

LAVS 会自动将 endpoints 注册为 AI 工具。例如：

- `lavs_listItems` - 调用 listItems 端点
- `lavs_addItem` - 调用 addItem 端点

AI 可以直接使用这些工具操作数据，UI 会收到通知并刷新。

## 事件驱动同步

当 AI 调用 LAVS 工具时，UI 会通过 `onAgentAction` 回调收到通知：

```javascript
window.onAgentAction = function(action) {
  console.log('AI 执行了:', action.toolName, action.input);
  // 刷新数据
  loadItems();
};
```

## API 参考

### 后端 API

```
GET  /api/agents/:agentId/lavs/manifest     # 获取清单
POST /api/agents/:agentId/lavs/:endpointId  # 调用端点
GET  /api/agents/:agentId/lavs-view         # 获取 UI HTML
POST /api/agents/:agentId/lavs-cache/clear  # 清除缓存
```

### 前端 LAVSClient

```typescript
import { LAVSClient } from '@/lavs';

const client = new LAVSClient({
  agentId: 'my-agent',
  projectPath: '/path/to/project' // 可选
});

// 获取清单
const manifest = await client.getManifest();

// 调用端点
const items = await client.call('listItems');
await client.call('addItem', { name: 'New Item' });
```

## 调试技巧

### 1. 单独测试脚本

```bash
# 测试 list 命令
node agents/my-agent/scripts/service.cjs list

# 测试 add 命令（通过 stdin）
echo '{"name":"Test"}' | node agents/my-agent/scripts/service.cjs add
```

### 2. 清除缓存

开发时修改 lavs.json 后需要清除缓存：

```bash
curl -X POST http://localhost:4936/api/agents/my-agent/lavs-cache/clear
```

### 3. 查看日志

后端会输出 `[LAVS]` 前缀的日志，包含：
- Manifest 加载信息
- 脚本执行参数
- 执行时间和结果

## 完整示例

参考 `agents/todo-manager/` 目录，这是一个完整的 Todo 管理 Agent 实现。

## 常见问题

### Q: 脚本输出乱码？

确保脚本输出纯 JSON，不要有其他 console.log。

### Q: 权限被拒绝？

检查 lavs.json 的 permissions.fileAccess 配置。

### Q: UI 不刷新？

确保实现了 `window.onAgentAction` 回调。

---

*更多信息请参考 [LAVS-SPEC.md](./LAVS-SPEC.md) 和 [LAVS-POC-SUMMARY.md](./LAVS-POC-SUMMARY.md)*
