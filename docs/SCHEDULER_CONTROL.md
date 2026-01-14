# 定时任务调度器控制

## 功能说明

在多实例部署场景中,你可能不希望所有后端实例都执行定时任务。`ENABLE_SCHEDULER` 环境变量允许你控制哪些实例应该运行定时任务调度器。

## 环境变量

### `ENABLE_SCHEDULER`

控制是否启用定时任务调度器。

- **类型**: 布尔值(字符串)
- **默认值**: `true` (启用调度器)
- **可选值**:
  - `true` 或未设置 - 启用定时任务执行
  - `false` - 禁用定时任务执行

## 使用场景

### 场景 1: 单实例部署(默认)

默认情况下,调度器是启用的。不需要任何额外配置:

```bash
# .env 文件中可以不设置,或显式启用
ENABLE_SCHEDULER=true
```

### 场景 2: 多实例部署 - 仅一个实例执行任务

如果你在同一台机器或多个机器上运行多个后端实例,可以只在其中一个实例上启用调度器:

**实例 1 (执行定时任务):**
```bash
# .env
ENABLE_SCHEDULER=true
```

**实例 2, 3, ... (不执行定时任务):**
```bash
# .env
ENABLE_SCHEDULER=false
```

### 场景 3: 开发环境

在开发环境中,如果你不想让定时任务自动运行,可以禁用它们:

```bash
# .env.development
ENABLE_SCHEDULER=false
```

## 验证配置

启动后端时,你会在日志中看到调度器状态:

### 调度器已启用:
```
[Scheduler] Initializing scheduled tasks... (ENABLE_SCHEDULER=true)
[Scheduler] Initializing with config: maxConcurrent=3
[Scheduler] Found 2 enabled tasks out of 5 total
[Scheduler] Initialization complete
```

### 调度器已禁用:
```
[Scheduler] Scheduler DISABLED via ENABLE_SCHEDULER=false environment variable
[Scheduler] Set ENABLE_SCHEDULER=true to enable scheduled task execution
```

## 注意事项

1. **API 功能不受影响**: 禁用调度器后,你仍然可以通过 UI 手动执行定时任务,查看任务列表和执行历史。只是不会自动按计划执行。

2. **热重载**: 修改 `ENABLE_SCHEDULER` 环境变量后需要重启后端才能生效。

3. **多实例安全**: 确保同一时间只有一个实例的调度器是启用的,避免同一个任务被多个实例同时执行。

4. **任务存储**: 所有实例共享同一个任务存储文件,所以无论哪个实例创建或修改的任务,其他实例都能看到。

## 示例配置

### 使用 PM2 管理多实例

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'agentstudio-with-scheduler',
      script: './dist/index.js',
      env: {
        ENABLE_SCHEDULER: 'true',
        PORT: 4936
      }
    },
    {
      name: 'agentstudio-worker-1',
      script: './dist/index.js',
      env: {
        ENABLE_SCHEDULER: 'false',
        PORT: 4937
      }
    },
    {
      name: 'agentstudio-worker-2',
      script: './dist/index.js',
      env: {
        ENABLE_SCHEDULER: 'false',
        PORT: 4938
      }
    }
  ]
};
```

### 使用 Docker Compose

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  # 主实例 - 运行定时任务
  agentstudio-primary:
    image: agentstudio:latest
    environment:
      - ENABLE_SCHEDULER=true
      - PORT=4936
    ports:
      - "4936:4936"

  # 工作实例 - 不运行定时任务
  agentstudio-worker:
    image: agentstudio:latest
    environment:
      - ENABLE_SCHEDULER=false
      - PORT=4937
    ports:
      - "4937:4937"
```
