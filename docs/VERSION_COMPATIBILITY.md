# 前后端版本兼容性设计方案

## 1. 背景与问题

### 1.1 当前状态

Agent Studio 是一个前后端分离的应用：
- **前端**：React SPA，通过 Vite 构建，可部署到 CDN
- **后端**：Node.js Express 服务，独立部署

目前前后端分别维护独立的版本号：
- `frontend/package.json` → `version: "0.1.0"`
- `backend/package.json` → `version: "0.2.0"`

但这些版本号**未被有效利用**，导致以下问题。

### 1.2 核心问题

#### 场景一：前端更新，后端未跟进

```
典型场景：
1. 开发者发布新版前端到 CDN (v0.3.0)
2. 新前端使用了新的 API 端点 /api/v2/projects
3. 用户 A 的后端仍是 v0.2.0，没有该端点
4. 用户 A 访问新前端 → 功能异常，但不知道原因
```

**痛点**：用户不知道需要升级后端，只会认为"系统有 bug"。

#### 场景二：后端更新，前端有缓存

```
典型场景：
1. 后端发布 v0.3.0，修改了某些 API 的响应格式
2. 用户 B 浏览器缓存了旧版前端 v0.2.0
3. 旧前端无法正确解析新 API 响应
4. 用户 B 看到数据展示异常
```

**痛点**：用户不知道需要刷新页面清除缓存。

#### 场景三：分布式部署的版本碎片化

```
典型场景：
1. Agent Studio 支持多后端服务配置
2. 不同用户连接到不同的后端服务
3. 各后端服务版本参差不齐
4. 前端无法为所有后端版本提供完美兼容
```

**痛点**：无法统一管理多个后端实例的版本状态。

### 1.3 需求目标

1. **前端能感知后端版本**：启动时检测后端版本是否满足要求
2. **后端能感知前端版本**：拒绝过旧的前端请求（可选）
3. **用户友好提示**：清晰告知用户需要采取的行动
4. **自动化版本管理**：构建时自动注入版本信息

---

## 2. 解决方案

### 2.1 版本策略：语义化版本 (SemVer)

采用 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/) 规范：

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── 向后兼容的问题修正
  │     └── 向后兼容的功能新增
  └── 不兼容的 API 变更
```

**版本兼容规则**：
- **MAJOR 不同**：完全不兼容，必须同时升级
- **MINOR 不同**：新功能可能不可用，但基础功能正常
- **PATCH 不同**：完全兼容

### 2.2 双向版本检查机制

#### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (CDN)                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  version.ts (构建时生成)                                   │  │
│  │  ├── FRONTEND_VERSION = "0.3.0"                          │  │
│  │  └── MIN_BACKEND_VERSION = "0.2.5"  ← 此前端需要的最低后端  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  VersionChecker 组件                                       │  │
│  │  1. 获取后端 /api/health                                   │  │
│  │  2. 比较 backend.version >= MIN_BACKEND_VERSION           │  │
│  │  3. 比较 FRONTEND_VERSION >= backend.minFrontendVersion   │  │
│  │  4. 根据结果显示提示                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼ HTTP GET /api/health
┌─────────────────────────────────────────────────────────────────┐
│                         后端服务                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  GET /api/health 响应:                                     │  │
│  │  {                                                        │  │
│  │    "status": "ok",                                        │  │
│  │    "version": "0.2.0",          ← 后端实际版本             │  │
│  │    "minFrontendVersion": "0.1.5" ← 此后端支持的最低前端    │  │
│  │  }                                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### 兼容性矩阵

| 场景 | 前端版本 | 后端版本 | 状态 | 用户操作 |
|------|----------|----------|------|----------|
| ✅ 完全兼容 | 0.3.0 (MIN_BE=0.2.0) | 0.2.5 | OK | 无需操作 |
| ⚠️ 后端过旧 | 0.3.0 (MIN_BE=0.2.5) | 0.2.0 | 警告 | 提示升级后端 |
| ⚠️ 前端过旧 | 0.2.0 | 0.3.0 (MIN_FE=0.2.5) | 警告 | 提示刷新页面 |
| ❌ 严重不兼容 | 0.3.0 (MIN_BE=0.3.0) | 0.1.0 | 阻断 | 强制升级后端 |

---

## 3. 技术实现

### 3.1 版本信息文件结构

#### 前端版本配置

**文件**: `frontend/src/lib/version.ts`

```typescript
/**
 * 版本兼容性配置
 * 此文件在构建时自动生成，请勿手动修改
 */

// 当前前端版本（从 package.json 读取）
export const FRONTEND_VERSION = "0.3.0";

// 此前端要求的最低后端版本
// 当后端版本低于此值时，显示升级警告
export const MIN_BACKEND_VERSION = "0.2.5";

// 构建信息
export const BUILD_INFO = {
  timestamp: "2024-01-15T10:30:00Z",
  commit: "abc1234",
  branch: "main"
};
```

#### 后端版本配置

**文件**: `backend/src/config/version.ts`

```typescript
/**
 * 后端版本配置
 */

// 当前后端版本（从 package.json 读取）
export const BACKEND_VERSION = "0.2.5";

// 此后端支持的最低前端版本
// 当前端版本低于此值时，建议用户刷新页面
export const MIN_FRONTEND_VERSION = "0.2.0";
```

### 3.2 后端 Health API 增强

**文件**: `backend/src/routes/health.ts`

```typescript
import { Router } from 'express';
import { BACKEND_VERSION, MIN_FRONTEND_VERSION } from '../config/version';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    name: 'agentstudio-backend',
    
    // 版本兼容性信息
    version: BACKEND_VERSION,
    minFrontendVersion: MIN_FRONTEND_VERSION,
    
    // 可选：附加信息
    features: {
      a2a: true,
      mcp: true,
      slides: true
    }
  });
});

export default router;
```

### 3.3 前端版本检查器

**文件**: `frontend/src/components/VersionChecker.tsx`

```tsx
import { useEffect, useState } from 'react';
import { FRONTEND_VERSION, MIN_BACKEND_VERSION } from '../lib/version';
import { getApiBase } from '../lib/config';
import semver from 'semver';

interface VersionStatus {
  compatible: boolean;
  frontendVersion: string;
  backendVersion: string;
  warning?: {
    type: 'backend_outdated' | 'frontend_outdated' | 'critical';
    message: string;
    action: string;
  };
}

export function useVersionCheck(): VersionStatus | null {
  const [status, setStatus] = useState<VersionStatus | null>(null);

  useEffect(() => {
    checkVersion();
  }, []);

  async function checkVersion() {
    try {
      const response = await fetch(`${getApiBase()}/health`);
      const data = await response.json();
      
      const backendVersion = data.version;
      const minFrontendVersion = data.minFrontendVersion || '0.0.0';
      
      let warning: VersionStatus['warning'] = undefined;
      let compatible = true;

      // 检查后端是否满足前端要求
      if (semver.lt(backendVersion, MIN_BACKEND_VERSION)) {
        compatible = false;
        const severity = semver.diff(backendVersion, MIN_BACKEND_VERSION);
        
        if (severity === 'major') {
          warning = {
            type: 'critical',
            message: `后端版本 (${backendVersion}) 与前端不兼容`,
            action: `请升级后端至 ${MIN_BACKEND_VERSION} 或更高版本`
          };
        } else {
          warning = {
            type: 'backend_outdated',
            message: `后端版本 (${backendVersion}) 较低，部分新功能可能不可用`,
            action: `建议升级后端至 ${MIN_BACKEND_VERSION}+`
          };
        }
      }
      
      // 检查前端是否满足后端要求
      if (semver.lt(FRONTEND_VERSION, minFrontendVersion)) {
        compatible = false;
        warning = {
          type: 'frontend_outdated',
          message: `前端版本 (${FRONTEND_VERSION}) 过旧`,
          action: '请刷新页面或清除浏览器缓存'
        };
      }

      setStatus({
        compatible,
        frontendVersion: FRONTEND_VERSION,
        backendVersion,
        warning
      });
    } catch (error) {
      console.error('Version check failed:', error);
    }
  }

  return status;
}

// 版本警告横幅组件
export function VersionWarningBanner() {
  const status = useVersionCheck();
  
  if (!status?.warning) return null;
  
  const { type, message, action } = status.warning;
  
  const styles = {
    critical: 'bg-red-500 text-white',
    backend_outdated: 'bg-yellow-500 text-black',
    frontend_outdated: 'bg-blue-500 text-white'
  };

  return (
    <div className={`p-3 ${styles[type]} flex items-center justify-between`}>
      <div>
        <strong>⚠️ 版本提示：</strong> {message}
        <span className="ml-2 opacity-80">{action}</span>
      </div>
      {type === 'frontend_outdated' && (
        <button 
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-white/20 rounded hover:bg-white/30"
        >
          刷新页面
        </button>
      )}
    </div>
  );
}
```

### 3.4 构建时自动生成版本信息

**文件**: `frontend/scripts/generate-version.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 读取 package.json
const pkg = require('../package.json');

// 获取 git 信息
function getGitInfo() {
  try {
    return {
      commit: execSync('git rev-parse --short HEAD').toString().trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    };
  } catch {
    return { commit: 'unknown', branch: 'unknown' };
  }
}

// 读取版本配置（如果存在）
function getVersionConfig() {
  const configPath = path.join(__dirname, '../version.config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  // 默认配置
  return {
    minBackendVersion: '0.1.0'
  };
}

const gitInfo = getGitInfo();
const config = getVersionConfig();

const content = `/**
 * 版本兼容性配置
 * 自动生成于 ${new Date().toISOString()}
 * 请勿手动修改此文件
 */

// 当前前端版本
export const FRONTEND_VERSION = "${pkg.version}";

// 此前端要求的最低后端版本
export const MIN_BACKEND_VERSION = "${config.minBackendVersion}";

// 构建信息
export const BUILD_INFO = {
  timestamp: "${new Date().toISOString()}",
  commit: "${gitInfo.commit}",
  branch: "${gitInfo.branch}"
};
`;

const outputPath = path.join(__dirname, '../src/lib/version.ts');
fs.writeFileSync(outputPath, content);

console.log(`✅ Generated version.ts (v${pkg.version}, minBackend: ${config.minBackendVersion})`);
```

**文件**: `frontend/version.config.json`

```json
{
  "minBackendVersion": "0.2.0"
}
```

**更新 `frontend/package.json`**:

```json
{
  "scripts": {
    "prebuild": "node scripts/generate-version.js",
    "build": "tsc -b && vite build"
  }
}
```

### 3.5 在 App 入口集成

**文件**: `frontend/src/App.tsx`

```tsx
import { VersionWarningBanner } from './components/VersionChecker';

function App() {
  return (
    <>
      <VersionWarningBanner />
      {/* 其他组件 */}
    </>
  );
}
```

---

## 4. 使用流程

### 4.1 日常开发流程

```
1. 开发新功能（可能涉及前后端）
2. 如果新增/修改了 API：
   - 后端：更新 BACKEND_VERSION
   - 前端：更新 version.config.json 中的 minBackendVersion（如需要）
3. 提交代码，CI 自动构建
4. 发布
```

### 4.2 发布流程（需要前后端配合的功能）

```
Phase 1: 后端先行
├── 1. 后端开发新 API
├── 2. 更新 backend/package.json 版本 → 0.3.0
├── 3. 更新 MIN_FRONTEND_VERSION（如有前端依赖变更）
└── 4. 发布后端

Phase 2: 前端跟进  
├── 1. 前端使用新 API
├── 2. 更新 frontend/package.json 版本 → 0.3.0
├── 3. 更新 version.config.json: minBackendVersion → 0.3.0
├── 4. 构建（自动生成 version.ts）
└── 5. 发布前端到 CDN

Phase 3: 用户侧
├── 老后端 + 新前端 → 显示"请升级后端"警告
├── 新后端 + 老前端 → 显示"请刷新页面"警告
└── 新后端 + 新前端 → 正常使用
```

### 4.3 版本号更新时机

| 变更类型 | 后端版本 | 前端版本 | minBackendVersion |
|----------|----------|----------|-------------------|
| 后端 bug 修复 | PATCH +1 | 不变 | 不变 |
| 前端 bug 修复 | 不变 | PATCH +1 | 不变 |
| 新增功能（仅前端）| 不变 | MINOR +1 | 不变 |
| 新增功能（仅后端）| MINOR +1 | 不变 | 不变 |
| 新增功能（前后端）| MINOR +1 | MINOR +1 | 更新为新后端版本 |
| 破坏性变更 | MAJOR +1 | MAJOR +1 | 更新为新后端版本 |

---

## 5. 高级特性（可选）

### 5.1 版本信息页面

在前端添加一个版本信息页面，供用户查看：

```tsx
// pages/VersionPage.tsx
import { FRONTEND_VERSION, MIN_BACKEND_VERSION, BUILD_INFO } from '../lib/version';
import { useVersionCheck } from '../components/VersionChecker';

export function VersionPage() {
  const status = useVersionCheck();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">版本信息</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-bold">前端</h2>
          <p>版本: {FRONTEND_VERSION}</p>
          <p>构建时间: {BUILD_INFO.timestamp}</p>
          <p>Commit: {BUILD_INFO.commit}</p>
          <p>分支: {BUILD_INFO.branch}</p>
          <p className="text-sm text-gray-500">
            要求后端: ≥ {MIN_BACKEND_VERSION}
          </p>
        </div>
        
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-bold">后端</h2>
          <p>版本: {status?.backendVersion || '加载中...'}</p>
          <p>兼容状态: {status?.compatible ? '✅ 兼容' : '⚠️ 不兼容'}</p>
        </div>
      </div>
    </div>
  );
}
```

### 5.2 API 请求头携带版本信息

让后端能够识别请求来自哪个版本的前端：

```typescript
// frontend/src/lib/api.ts
import { FRONTEND_VERSION } from './version';

export function createApiClient() {
  return {
    fetch: (url: string, options: RequestInit = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Frontend-Version': FRONTEND_VERSION
        }
      });
    }
  };
}
```

后端可以记录日志或做兼容性处理：

```typescript
// backend middleware
app.use((req, res, next) => {
  const frontendVersion = req.headers['x-frontend-version'];
  if (frontendVersion) {
    req.frontendVersion = frontendVersion;
    // 可以记录统计信息
  }
  next();
});
```

### 5.3 强制升级模式

对于重大安全更新，可以配置强制升级：

```typescript
// 后端 /api/health 响应
{
  "version": "0.3.0",
  "minFrontendVersion": "0.3.0",
  "forceUpgrade": true,  // 强制升级标志
  "upgradeMessage": "此版本包含重要安全更新，请立即升级"
}
```

```tsx
// 前端处理
if (data.forceUpgrade && semver.lt(FRONTEND_VERSION, data.minFrontendVersion)) {
  // 显示全屏遮罩，阻止使用
  showForceUpgradeModal(data.upgradeMessage);
}
```

---

## 6. 迁移计划

### Phase 1: 基础设施（1-2天）

- [ ] 创建 `frontend/src/lib/version.ts` 模板
- [ ] 创建 `frontend/scripts/generate-version.js`
- [ ] 创建 `frontend/version.config.json`
- [ ] 更新 `frontend/package.json` 添加 prebuild 脚本
- [ ] 更新后端 `/api/health` 端点

### Phase 2: 前端集成（1天）

- [ ] 实现 `VersionChecker` 组件
- [ ] 在 App 入口集成 `VersionWarningBanner`
- [ ] 添加版本信息页面（可选）

### Phase 3: 测试与发布（1天）

- [ ] 本地测试各种版本组合场景
- [ ] 在测试环境验证
- [ ] 发布并监控

---

## 7. 总结

本方案通过**双向版本检查**机制，解决了前后端分离架构中的版本兼容性问题：

1. **前端检查后端**：确保后端版本满足前端需求
2. **后端检查前端**：确保前端版本满足后端需求
3. **用户友好提示**：清晰告知用户需要采取的行动
4. **自动化管理**：构建时自动生成版本信息

这套机制适用于：
- CDN 部署的前端应用
- 多后端实例的分布式部署
- 需要严格版本控制的企业应用
