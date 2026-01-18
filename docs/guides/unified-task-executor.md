# 统一任务执行器配置指南

## 概述

AgentStudio 现在使用统一的任务执行器来处理:
- **A2A 异步任务** (`POST /a2a/:agentId/tasks`)
- **定时任务** (Scheduled Tasks)

任务执行器在独立的 Worker 线程中运行任务,**不会阻塞主进程**,确保 API 请求和其他操作不受影响。

## 环境变量配置

### 基础配置

```bash
# 任务执行器模式 (默认: builtin)
# - builtin: 使用内置 Worker Pool (推荐,无需额外依赖)
# - bullmq: 使用 BullMQ + Redis (生产环境,需要 Redis)
TASK_EXECUTOR_MODE=builtin

# 最大并发任务数 (默认: 5)
MAX_CONCURRENT_TASKS=5

# 默认任务超时时间,单位毫秒 (默认: 300000 = 5分钟)
TASK_TIMEOUT_DEFAULT=300000

# 每个 Worker 的最大内存限制,单位 MB (默认: 512)
TASK_MAX_MEMORY_MB=512
```

### BullMQ 模式配置 (可选)

```bash
# 使用 BullMQ 模式时需要
TASK_EXECUTOR_MODE=bullmq

# Redis 连接 URL
REDIS_URL=redis://localhost:6379

# 队列前缀 (默认: agentstudio:)
BULLMQ_QUEUE_PREFIX=agentstudio:
```

## 配置示例

### 开发环境 (.env)

```bash
# 使用默认的内置 Worker Pool
TASK_EXECUTOR_MODE=builtin
MAX_CONCURRENT_TASKS=3
TASK_TIMEOUT_DEFAULT=300000
TASK_MAX_MEMORY_MB=512

# 启用定时任务
ENABLE_SCHEDULER=true
```

### 生产环境 (.env.production)

```bash
# 使用内置 Worker Pool (单机部署)
TASK_EXECUTOR_MODE=builtin
MAX_CONCURRENT_TASKS=10
TASK_TIMEOUT_DEFAULT=600000
TASK_MAX_MEMORY_MB=1024

# 或使用 BullMQ (集群部署)
# TASK_EXECUTOR_MODE=bullmq
# REDIS_URL=redis://redis-cluster:6379
# MAX_CONCURRENT_TASKS=20
```

## 执行器模式对比

| 特性 | builtin (内置) | bullmq (队列) |
|------|---------------|---------------|
| **依赖** | 无 (Node.js 原生) | Redis |
| **部署复杂度** | 低 (单进程) | 中 (需要 Redis) |
| **任务持久化** | 无 (进程重启丢失) | 有 (Redis 持久化) |
| **集群支持** | 不支持 | 支持 |
| **任务重试** | 不支持 | 支持 |
| **监控 UI** | 无 | Bull Board |
| **适用场景** | 开发/小型部署 | 生产/大型部署 |

## 工作原理

### Builtin 模式 (默认)

```
主进程 (API Server)
    ↓
任务调度器 (Scheduler)
    ↓
任务执行器 (Worker Pool)
    ↓
Worker 1    Worker 2    Worker 3    ...
(独立线程)   (独立线程)   (独立线程)
```

**关键特性:**
- ✅ 每个 Task 在独立 Worker 线程执行
- ✅ 不阻塞主进程
- ✅ 资源隔离 (内存限制)
- ✅ 自动队列管理
- ✅ 一个进程启动

### BullMQ 模式 (可选)

```
主进程 (API Server)
    ↓
任务调度器
    ↓
BullMQ Producer
    ↓
Redis Queue
    ↓
BullMQ Worker (可多进程)
    ↓
Worker 线程池
```

**关键特性:**
- ✅ 任务持久化到 Redis
- ✅ 支持任务重试
- ✅ 支持多进程消费
- ✅ 适合集群部署

## 监控和调试

### 查看执行器状态

```bash
# 后端日志会显示:
[TaskExecutor] Initializing with mode: builtin
[TaskExecutor] Config: maxConcurrent=5, defaultTimeoutMs=300000
[TaskExecutor] Successfully initialized with mode: builtin
[TaskExecutor] Starting builtin executor with maxConcurrent=5
[TaskExecutor] Builtin executor started
```

### 任务执行日志

```bash
# 任务提交
[Scheduler] Submitting task abc123 to executor, execution: exec_xxx
[TaskExecutor] Starting task: exec_xxx (type=scheduled)

# 任务进度
[TaskWorker:exec_xxx] Starting task execution: exec_xxx
[TaskWorker:exec_xxx] Task type: scheduled
[TaskWorker:exec_xxx] Agent: claude-code
[TaskWorker:exec_xxx] Model: sonnet

# 任务完成
[TaskExecutor] Task exec_xxx completed: status=completed, time=1523ms
```

### 健康检查

执行器会在任务完成时自动更新状态,可以通过以下方式检查:

1. **A2A 任务:** `GET /a2a/:agentId/tasks/:taskId`
2. **定时任务:** `GET /api/scheduled-tasks/:taskId/executions`

## 故障排查

### 问题: 任务一直处于 pending 状态

**原因:** 执行器未正确初始化

**解决方案:**
```bash
# 检查后端日志
grep "TaskExecutor" logs/backend.log

# 应该看到:
# [TaskExecutor] Successfully initialized with mode: builtin

# 如果看到错误:
# [TaskExecutor] Initialization failed
# 检查环境变量和依赖
```

### 问题: 任务执行超时

**原因:** 任务执行时间超过配置的超时时间

**解决方案:**
```bash
# 增加超时时间
TASK_TIMEOUT_DEFAULT=600000  # 10 分钟

# 或针对特定任务配置超时
```

### 问题: 内存不足

**原因:** Worker 内存限制过低

**解决方案:**
```bash
# 增加内存限制
TASK_MAX_MEMORY_MB=1024
```

### 问题: 定时任务不执行

**原因:** 执行器未启动或调度器未启用

**解决方案:**
```bash
# 检查调度器状态
ENABLE_SCHEDULER=true

# 检查执行器状态
# 后端日志应该显示:
# [Scheduler] Task xxx submitted to executor successfully
```

## 性能调优

### 并发任务数

```bash
# CPU 密集型任务
MAX_CONCURRENT_TASKS=2  # 建议 CPU 核心数

# I/O 密集型任务
MAX_CONCURRENT_TASKS=10  # 可以更高

# Claude AI 调用 (推荐)
MAX_CONCURRENT_TASKS=5   # 避免过载 API
```

### 内存限制

```bash
# 小型任务
TASK_MAX_MEMORY_MB=256

# 大型任务 (如代码库分析)
TASK_MAX_MEMORY_MB=1024
```

### 超时时间

```bash
# 快速任务 (简单问答)
TASK_TIMEOUT_DEFAULT=60000  # 1 分钟

# 中等任务 (代码生成)
TASK_TIMEOUT_DEFAULT=300000  # 5 分钟

# 长时间任务 (复杂分析)
TASK_TIMEOUT_DEFAULT=900000  # 15 分钟
```

## 迁移指南

### 从旧版本迁移

如果你之前使用的是 A2A 异步任务或定时任务的旧实现:

1. **无需修改代码** - 新实现向后兼容
2. **更新环境变量** - 添加配置到 `.env`
3. **重启服务** - 新执行器会自动初始化

### 验证迁移

```bash
# 1. 启动服务
pnpm run dev:backend

# 2. 检查日志
# 应该看到: [TaskExecutor] Successfully initialized

# 3. 创建测试任务
# A2A 任务:
curl -X POST http://localhost:4936/a2a/{agentId}/tasks \
  -H "Authorization: Bearer {apiKey}" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# 4. 检查任务状态
curl http://localhost:4936/a2a/{agentId}/tasks/{taskId}
```

## 最佳实践

1. **开发环境:** 使用 `builtin` 模式,简单快速
2. **生产环境:**
   - 单机部署: 使用 `builtin` 模式
   - 集群部署: 使用 `bullmq` 模式
3. **监控:** 定期检查任务执行日志和状态
4. **资源限制:** 根据服务器配置调整并发数和内存限制
5. **超时配置:** 根据任务类型设置合理的超时时间

## 相关文档

- [A2A 任务管理](./a2a-task-management-analysis.md)
- [定时任务配置](../api/scheduled-tasks.md)
- [系统架构](../architecture/overview.md)
