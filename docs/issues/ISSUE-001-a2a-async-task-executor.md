# ISSUE-001: A2A 异步任务执行器未实现

**创建时间**: 2026-01-05  
**状态**: 待开发  
**优先级**: 中  
**模块**: backend/src/services/a2a/

---

## 问题描述

当前 A2A 异步任务功能只实现了"骨架"，缺少核心的任务执行器。创建任务后，任务会一直保持 `pending` 状态直到超时失败。

### 已完成部分

| 模块 | 文件 | 状态 |
|------|------|------|
| 任务管理器 | `services/a2a/taskManager.ts` | ✅ 完成 |
| API 路由 | `routes/a2a.ts` | ✅ 完成 |
| 超时监控 | `jobs/taskTimeoutMonitor.ts` | ✅ 完成 |
| 类型定义 | `types/a2a.ts` | ✅ 完成 |
| 任务清理 | `services/a2a/taskCleanup.ts` | ✅ 完成 |

### 缺失部分

- **任务执行器（Task Worker/Executor）**: 后台消费 pending 任务并执行
- **执行结果存储**: 将 Claude SDK 响应写入任务的 `output` 字段

---

## 当前流程（有问题）

```
POST /a2a/:agentId/tasks
    ↓
创建任务 (status: pending)
    ↓
返回 202 Accepted + taskId
    ↓
❌ 没有执行器消费任务
    ↓
任务一直是 pending
    ↓
超时监控标记为 failed
```

## 预期流程

```
POST /a2a/:agentId/tasks
    ↓
创建任务 (status: pending)
    ↓
返回 202 Accepted + taskId
    ↓
✅ 任务执行器拾取任务
    ↓
更新状态为 running
    ↓
调用 Claude SDK 处理
    ↓
完成后更新为 completed + output
    ↓
客户端轮询 GET /tasks/:taskId 获取结果
```

---

## 解决方案

### 方案 A: 内存队列 + 立即执行（推荐）

**复杂度**: 低  
**适用场景**: 单实例部署，任务量不大

#### 实现思路

1. 在 `POST /tasks` 创建任务后，立即将任务放入内存队列
2. 使用 `setImmediate` 或 `process.nextTick` 异步执行
3. 任务执行完成后更新状态和结果

#### 代码示例

```typescript
// backend/src/services/a2a/taskExecutor.ts

import { taskManager } from './taskManager.js';
import { sessionManager } from '../sessionManager.js';
import { AgentStorage } from '../agentStorage.js';

interface ExecutorConfig {
  maxConcurrent: number;  // 最大并发任务数
}

class TaskExecutor {
  private runningCount = 0;
  private config: ExecutorConfig = { maxConcurrent: 5 };
  private agentStorage = new AgentStorage();

  /**
   * 提交任务执行
   * 在创建任务后调用
   */
  async submitTask(
    workingDirectory: string,
    taskId: string,
    agentType: string
  ): Promise<void> {
    // 并发控制
    if (this.runningCount >= this.config.maxConcurrent) {
      console.warn(`[TaskExecutor] Max concurrent reached, task ${taskId} queued`);
      // 可以实现排队逻辑，这里简化处理
      return;
    }

    // 异步执行，不阻塞响应
    setImmediate(() => {
      this.executeTask(workingDirectory, taskId, agentType).catch(error => {
        console.error(`[TaskExecutor] Task ${taskId} failed:`, error);
      });
    });
  }

  /**
   * 执行单个任务
   */
  private async executeTask(
    workingDirectory: string,
    taskId: string,
    agentType: string
  ): Promise<void> {
    this.runningCount++;

    try {
      // 1. 获取任务
      const task = await taskManager.getTask(workingDirectory, taskId);
      if (!task || task.status !== 'pending') {
        console.warn(`[TaskExecutor] Task ${taskId} not pending, skipping`);
        return;
      }

      // 2. 更新为 running
      await taskManager.updateTaskStatus(workingDirectory, taskId, 'running', {
        startedAt: new Date().toISOString(),
      });

      // 3. 获取 Agent 配置
      const agentConfig = this.agentStorage.getAgent(agentType);
      if (!agentConfig) {
        throw new Error(`Agent not found: ${agentType}`);
      }

      // 4. 构建查询选项并执行
      const { queryOptions } = await buildQueryOptions({
        systemPrompt: agentConfig.systemPrompt,
        allowedTools: agentConfig.allowedTools || [],
        maxTurns: 30,
        workingDirectory,
        permissionMode: 'bypassPermissions', // 无人值守模式
        model: agentConfig.model || 'sonnet',
      }, workingDirectory);

      // 5. 创建会话并执行
      const claudeSession = sessionManager.createSession(
        agentType,
        workingDirectory,
        queryOptions
      );

      let fullResponse = '';
      
      await new Promise<void>((resolve, reject) => {
        const userMessage = {
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'text', text: task.input.message }]
          }
        };

        claudeSession.sendMessage(userMessage, (sdkMessage) => {
          if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
            for (const block of sdkMessage.message.content) {
              if (block.type === 'text') {
                fullResponse += block.text;
              }
            }
          }
          if (sdkMessage.type === 'result') {
            resolve();
          }
        }).catch(reject);
      });

      // 6. 更新为 completed
      await taskManager.updateTaskStatus(workingDirectory, taskId, 'completed', {
        completedAt: new Date().toISOString(),
        output: {
          result: fullResponse,
        },
      });

      console.info(`[TaskExecutor] Task ${taskId} completed successfully`);

    } catch (error: any) {
      // 更新为 failed
      await taskManager.updateTaskStatus(workingDirectory, taskId, 'failed', {
        completedAt: new Date().toISOString(),
        errorDetails: {
          message: error.message || 'Unknown error',
          code: 'EXECUTION_ERROR',
        },
      });
      throw error;

    } finally {
      this.runningCount--;
    }
  }
}

export const taskExecutor = new TaskExecutor();
```

#### 路由集成

```typescript
// routes/a2a.ts - POST /tasks 端点修改

import { taskExecutor } from '../services/a2a/taskExecutor.js';

router.post('/tasks', a2aStrictRateLimiter, async (req: A2ARequest, res: Response) => {
  // ... 现有代码 ...

  // 创建任务后，提交执行
  const task = await taskManager.createTask({ ... });
  
  // 新增：提交任务执行
  await taskExecutor.submitTask(
    a2aContext.workingDirectory,
    task.id,
    a2aContext.agentType
  );

  res.status(202).json({
    taskId: task.id,
    status: task.status,
    checkUrl: `/a2a/${a2aContext.a2aAgentId}/tasks/${task.id}`,
  });
});
```

---

### 方案 B: 轮询式任务拾取

**复杂度**: 中  
**适用场景**: 需要更可靠的任务处理，多实例部署

#### 实现思路

1. 创建后台 job，定期扫描所有项目的 pending 任务
2. 使用文件锁防止重复拾取
3. 类似现有的 `taskTimeoutMonitor` 模式

```typescript
// backend/src/jobs/taskExecutorJob.ts

import { taskManager } from '../services/a2a/taskManager.js';
import { scanAllProjects } from '../utils/projectScanner.js';

const POLL_INTERVAL_MS = 5000; // 5秒

async function pollPendingTasks(): Promise<void> {
  const projects = await scanAllProjects();
  
  for (const project of projects) {
    const pendingTasks = await taskManager.listTasks(project.workingDirectory, 'pending');
    
    for (const task of pendingTasks) {
      // 执行任务（需要防止并发拾取）
      await executeTaskWithLock(project.workingDirectory, task.id);
    }
  }
}

export function startTaskExecutorJob(): void {
  setInterval(pollPendingTasks, POLL_INTERVAL_MS);
}
```

---

### 方案 C: Redis/Bull 队列（生产级）

**复杂度**: 高  
**适用场景**: 大规模、高可用、多实例部署

#### 依赖

```bash
pnpm add bull ioredis
```

#### 实现思路

1. 使用 Redis 作为消息队列
2. Bull 提供可靠的任务队列功能
3. 支持重试、优先级、延迟执行

```typescript
import Bull from 'bull';

const taskQueue = new Bull('a2a-tasks', {
  redis: process.env.REDIS_URL,
});

// 生产者
taskQueue.add({
  workingDirectory,
  taskId,
  agentType,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});

// 消费者
taskQueue.process(async (job) => {
  const { workingDirectory, taskId, agentType } = job.data;
  await executeTask(workingDirectory, taskId, agentType);
});
```

---

## 推荐方案

**对于当前项目规模，推荐方案 A（内存队列 + 立即执行）**

原因：
1. 实现简单，改动小
2. 不引入额外依赖
3. 单实例场景足够用
4. 可以后续平滑升级到方案 B 或 C

---

## 测试用例

```bash
# 1. 创建异步任务
curl -X POST \
  "http://localhost:4936/a2a/{agentId}/tasks" \
  -H "Authorization: Bearer {api_key}" \
  -H "Content-Type: application/json" \
  -d '{"message": "生成一个测试报告", "timeout": 300000}'

# 预期返回
# {"taskId": "xxx", "status": "pending", "checkUrl": "/a2a/.../tasks/xxx"}

# 2. 轮询任务状态（应该很快变成 running -> completed）
curl -X GET \
  "http://localhost:4936/a2a/{agentId}/tasks/{taskId}" \
  -H "Authorization: Bearer {api_key}"

# 预期返回（完成后）
# {"taskId": "xxx", "status": "completed", "output": {...}}
```

---

## 工作量估算

| 方案 | 预估时间 | 复杂度 |
|------|----------|--------|
| 方案 A | 2-4 小时 | 低 |
| 方案 B | 4-8 小时 | 中 |
| 方案 C | 1-2 天 | 高 |

---

## 相关文件

- `backend/src/services/a2a/taskManager.ts` - 任务管理器
- `backend/src/routes/a2a.ts` - A2A 路由
- `backend/src/jobs/taskTimeoutMonitor.ts` - 超时监控（可参考模式）
- `backend/src/services/schedulerService.ts` - 定时任务服务（可参考执行逻辑）

---

## 备注

当前企业微信集成可先使用同步模式 `/messages` 接口，该接口已完整可用。
