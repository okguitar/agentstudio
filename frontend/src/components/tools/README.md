# Claude Code 工具组件系统文档

本文档详细描述了Claude Code工具组件系统的设计、使用方法和所有支持的工具。

## 概述

Claude Code工具组件系统为Claude Code支持的所有15个工具提供了统一的可视化界面。每个工具都有专门的显示组件，能够清晰地展示工具的输入参数、执行状态和输出结果。

## 系统架构

```
tools/
├── types.ts                    # 类型定义
├── BaseToolComponent.tsx       # 基础组件
├── ToolRenderer.tsx           # 工具渲染器
├── index.ts                   # 导出入口
└── [具体工具组件]
    ├── TaskTool.tsx
    ├── BashTool.tsx
    ├── GlobTool.tsx
    ├── GrepTool.tsx
    ├── LSTool.tsx
    ├── ExitPlanModeTool.tsx
    ├── ReadTool.tsx
    ├── EditTool.tsx
    ├── MultiEditTool.tsx
    ├── WriteTool.tsx
    ├── NotebookReadTool.tsx
    ├── NotebookEditTool.tsx
    ├── WebFetchTool.tsx
    ├── TodoWriteTool.tsx
    └── WebSearchTool.tsx
```

## 核心接口

### ToolExecution

所有工具组件的统一数据接口：

```typescript
interface ToolExecution {
  id: string;                    // 唯一标识符
  toolName: string;              // 工具名称
  toolInput: BaseToolInput;      // 输入参数
  toolResult?: string;           // 执行结果
  isExecuting: boolean;          // 是否执行中
  isError?: boolean;             // 是否出错
  timestamp: Date;               // 执行时间戳
}
```

## 支持的工具

### 1. Task - 任务代理工具

**用途**: 启动新的代理来执行复杂任务

**输入参数**:
```typescript
interface TaskToolInput {
  description: string;    // 任务的简短描述 (3-5词)
  prompt: string;        // 详细的任务提示
}
```

**显示特性**:
- 紫色主题 (text-purple-600 bg-purple-100)
- 自动截断长提示文本 (300字符)
- 显示内容长度统计

**示例**:
```typescript
const taskExecution: ToolExecution = {
  id: "task_001",
  toolName: "Task",
  toolInput: {
    description: "搜索TypeScript文件",
    prompt: "在项目中搜索所有TypeScript文件并分析其结构"
  },
  isExecuting: false,
  timestamp: new Date()
};
```

### 2. Bash - 命令执行工具

**用途**: 在持久shell会话中执行bash命令

**输入参数**:
```typescript
interface BashToolInput {
  command: string;        // 要执行的命令
  description?: string;   // 命令描述
  timeout?: number;       // 超时时间(毫秒)
}
```

**显示特性**:
- 灰色主题 (text-gray-800 bg-gray-100)
- 代码块显示命令
- 显示超时设置
- 执行结果以绿色背景显示

**示例**:
```typescript
const bashExecution: ToolExecution = {
  id: "bash_001",
  toolName: "Bash",
  toolInput: {
    command: "npm run build",
    description: "构建前端项目",
    timeout: 120000
  },
  toolResult: "Build completed successfully!",
  isExecuting: false,
  timestamp: new Date()
};
```

### 3. Glob - 文件模式匹配工具

**用途**: 使用glob模式快速匹配文件路径

**输入参数**:
```typescript
interface GlobToolInput {
  pattern: string;    // glob模式 (如 "**/*.ts")
  path?: string;      // 搜索路径 (可选)
}
```

**显示特性**:
- 蓝色主题 (text-blue-600 bg-blue-100)
- 自动统计匹配文件数量
- 蓝色背景显示结果

**示例**:
```typescript
const globExecution: ToolExecution = {
  id: "glob_001",
  toolName: "Glob",
  toolInput: {
    pattern: "**/*.tsx",
    path: "/Users/project/src"
  },
  toolResult: "/Users/project/src/App.tsx\n/Users/project/src/index.tsx",
  isExecuting: false,
  timestamp: new Date()
};
```

### 4. Grep - 内容搜索工具

**用途**: 使用ripgrep进行强大的文本搜索

**输入参数**:
```typescript
interface GrepToolInput {
  pattern: string;                           // 正则表达式模式
  path?: string;                            // 搜索路径
  glob?: string;                            // 文件过滤模式
  type?: string;                            // 文件类型
  output_mode?: 'content' | 'files_with_matches' | 'count';
  '-i'?: boolean;                           // 忽略大小写
  '-n'?: boolean;                           // 显示行号
  '-A'?: number;                            // 显示匹配后N行
  '-B'?: number;                            // 显示匹配前N行
  '-C'?: number;                            // 显示匹配前后N行
  head_limit?: number;                      // 限制输出行数
  multiline?: boolean;                      // 多行匹配模式
}
```

**显示特性**:
- 绿色主题 (text-green-600 bg-green-100)
- 搜索选项标签显示
- 智能格式化搜索结果
- 根据输出模式调整显示方式

**示例**:
```typescript
const grepExecution: ToolExecution = {
  id: "grep_001",
  toolName: "Grep",
  toolInput: {
    pattern: "interface.*Props",
    glob: "**/*.tsx",
    output_mode: "files_with_matches",
    "-i": true,
    "-n": true
  },
  toolResult: "找到 5 个匹配的文件:\n\nsrc/App.tsx\nsrc/components/Header.tsx",
  isExecuting: false,
  timestamp: new Date()
};
```

### 5. LS - 目录列表工具

**用途**: 列出指定路径的文件和目录

**输入参数**:
```typescript
interface LSToolInput {
  path: string;        // 绝对路径
  ignore?: string[];   // 忽略的glob模式列表
}
```

**显示特性**:
- 黄色主题 (text-yellow-600 bg-yellow-100)
- 树形结构显示目录

**示例**:
```typescript
const lsExecution: ToolExecution = {
  id: "ls_001",
  toolName: "LS",
  toolInput: {
    path: "/Users/project/src",
    ignore: ["node_modules", "*.log"]
  },
  toolResult: "- src/\n  - components/\n  - utils/\n  - App.tsx",
  isExecuting: false,
  timestamp: new Date()
};
```

### 6. exit_plan_mode - 计划模式退出工具

**用途**: 退出计划模式并开始实施

**输入参数**:
```typescript
interface ExitPlanModeToolInput {
  plan: string;    // 实施计划的详细描述
}
```

**显示特性**:
- 翠绿色主题 (text-emerald-600 bg-emerald-100)
- 计划内容以特殊背景显示
- 状态提示信息

**示例**:
```typescript
const exitPlanExecution: ToolExecution = {
  id: "exit_plan_001",
  toolName: "exit_plan_mode",
  toolInput: {
    plan: "1. 创建组件文件\n2. 编写测试\n3. 更新文档"
  },
  isExecuting: false,
  timestamp: new Date()
};
```

### 7. Read - 文件读取工具

**用途**: 读取本地文件系统中的文件

**输入参数**:
```typescript
interface ReadToolInput {
  file_path: string;    // 文件绝对路径
  limit?: number;       // 读取行数限制
  offset?: number;      // 起始行号
}
```

**显示特性**:
- 靛蓝色主题 (text-indigo-600 bg-indigo-100)
- 显示读取范围参数
- 行号格式的输出显示

**示例**:
```typescript
const readExecution: ToolExecution = {
  id: "read_001",
  toolName: "Read",
  toolInput: {
    file_path: "/Users/project/src/App.tsx",
    offset: 1,
    limit: 50
  },
  toolResult: "     1→import React from 'react';\n     2→import './App.css';",
  isExecuting: false,
  timestamp: new Date()
};
```

### 8. Edit - 文件编辑工具

**用途**: 对文件进行精确的字符串替换

**输入参数**:
```typescript
interface EditToolInput {
  file_path: string;      // 文件路径
  old_string: string;     // 要替换的原文本
  new_string: string;     // 新文本
  replace_all?: boolean;  // 是否替换所有匹配项
}
```

**显示特性**:
- 橙色主题 (text-orange-600 bg-orange-100)
- 并排显示新旧文本对比
- 自动截断长文本 (200字符)
- 全部替换标识

**示例**:
```typescript
const editExecution: ToolExecution = {
  id: "edit_001",
  toolName: "Edit",
  toolInput: {
    file_path: "/Users/project/src/App.tsx",
    old_string: "const App = () => {",
    new_string: "const App: React.FC = () => {",
    replace_all: false
  },
  toolResult: "File updated successfully",
  isExecuting: false,
  timestamp: new Date()
};
```

### 9. MultiEdit - 批量文件编辑工具

**用途**: 对单个文件进行多个编辑操作

**输入参数**:
```typescript
interface MultiEditToolInput {
  file_path: string;
  edits: Array<{
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  }>;
}
```

**显示特性**:
- 红色主题 (text-red-600 bg-red-100)
- 可滚动的编辑操作列表
- 每个操作的新旧文本对比
- 操作序号和替换标识

**示例**:
```typescript
const multiEditExecution: ToolExecution = {
  id: "multiedit_001",
  toolName: "MultiEdit",
  toolInput: {
    file_path: "/Users/project/src/App.tsx",
    edits: [
      {
        old_string: "useState",
        new_string: "React.useState",
        replace_all: true
      },
      {
        old_string: "useEffect",
        new_string: "React.useEffect",
        replace_all: true
      }
    ]
  },
  toolResult: "All edits applied successfully",
  isExecuting: false,
  timestamp: new Date()
};
```

### 10. Write - 文件写入工具

**用途**: 创建新文件或覆盖现有文件

**输入参数**:
```typescript
interface WriteToolInput {
  file_path: string;    // 文件路径
  content: string;      // 文件内容
}
```

**显示特性**:
- 青色主题 (text-cyan-600 bg-cyan-100)
- 自动截断长内容 (500字符)
- 显示内容长度统计
- 代码块显示内容

**示例**:
```typescript
const writeExecution: ToolExecution = {
  id: "write_001",
  toolName: "Write",
  toolInput: {
    file_path: "/Users/project/src/NewComponent.tsx",
    content: "import React from 'react';\n\nexport const NewComponent = () => {\n  return <div>Hello</div>;\n};"
  },
  toolResult: "File created successfully",
  isExecuting: false,
  timestamp: new Date()
};
```

### 11. NotebookRead - Jupyter读取工具

**用途**: 读取Jupyter notebook文件

**输入参数**:
```typescript
interface NotebookReadToolInput {
  notebook_path: string;    // notebook文件路径
  cell_id?: string;         // 特定单元格ID
}
```

**显示特性**:
- 粉色主题 (text-pink-600 bg-pink-100)
- 显示单元格ID (如果指定)

**示例**:
```typescript
const notebookReadExecution: ToolExecution = {
  id: "notebook_read_001",
  toolName: "NotebookRead",
  toolInput: {
    notebook_path: "/Users/project/analysis.ipynb",
    cell_id: "cell_123"
  },
  toolResult: "Cell content: print('Hello World')",
  isExecuting: false,
  timestamp: new Date()
};
```

### 12. NotebookEdit - Jupyter编辑工具

**用途**: 编辑Jupyter notebook单元格

**输入参数**:
```typescript
interface NotebookEditToolInput {
  notebook_path: string;
  new_source: string;
  cell_id?: string;
  cell_type?: 'code' | 'markdown';
  edit_mode?: 'replace' | 'insert' | 'delete';
}
```

**显示特性**:
- 玫瑰色主题 (text-rose-600 bg-rose-100)
- 编辑模式标签 (插入/删除/替换)
- 单元格类型标签 (代码/Markdown)
- 删除模式不显示内容

**示例**:
```typescript
const notebookEditExecution: ToolExecution = {
  id: "notebook_edit_001",
  toolName: "NotebookEdit",
  toolInput: {
    notebook_path: "/Users/project/analysis.ipynb",
    new_source: "print('Updated content')",
    cell_type: "code",
    edit_mode: "replace"
  },
  toolResult: "Cell updated successfully",
  isExecuting: false,
  timestamp: new Date()
};
```

### 13. WebFetch - 网页获取工具

**用途**: 获取并分析网页内容

**输入参数**:
```typescript
interface WebFetchToolInput {
  url: string;      // 要获取的URL
  prompt: string;   // 分析提示
}
```

**显示特性**:
- 蓝绿色主题 (text-teal-600 bg-teal-100)
- URL可点击跳转
- 自动截断长提示 (200字符)
- 分析结果以特殊背景显示

**示例**:
```typescript
const webFetchExecution: ToolExecution = {
  id: "webfetch_001",
  toolName: "WebFetch",
  toolInput: {
    url: "https://example.com",
    prompt: "提取页面中的主要信息"
  },
  toolResult: "页面标题: Example Site\n主要内容: ...",
  isExecuting: false,
  timestamp: new Date()
};
```

### 14. TodoWrite - 待办事项工具

**用途**: 创建和管理待办事项列表

**输入参数**:
```typescript
interface TodoWriteToolInput {
  todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'high' | 'medium' | 'low';
    id: string;
  }>;
}
```

**显示特性**:
- 紫罗兰色主题 (text-violet-600 bg-violet-100)
- 状态图标显示 (CheckCircle, Clock, AlertCircle)
- 优先级彩色标签
- 统计信息显示
- 可滚动列表 (最大高度320px)

**示例**:
```typescript
const todoWriteExecution: ToolExecution = {
  id: "todowrite_001",
  toolName: "TodoWrite",
  toolInput: {
    todos: [
      {
        id: "1",
        content: "完成用户界面设计",
        status: "completed",
        priority: "high"
      },
      {
        id: "2", 
        content: "编写单元测试",
        status: "in_progress",
        priority: "medium"
      }
    ]
  },
  toolResult: "Todo list updated successfully",
  isExecuting: false,
  timestamp: new Date()
};
```

### 15. WebSearch - 网页搜索工具

**用途**: 在网络上搜索信息

**输入参数**:
```typescript
interface WebSearchToolInput {
  query: string;              // 搜索查询
  allowed_domains?: string[]; // 允许的域名
  blocked_domains?: string[]; // 屏蔽的域名
}
```

**显示特性**:
- 天蓝色主题 (text-sky-600 bg-sky-100)
- 域名过滤标签显示 (绿色允许，红色屏蔽)
- 搜索结果格式化显示

**示例**:
```typescript
const webSearchExecution: ToolExecution = {
  id: "websearch_001",
  toolName: "WebSearch",
  toolInput: {
    query: "React TypeScript best practices",
    allowed_domains: ["stackoverflow.com", "github.com"],
    blocked_domains: ["spam-site.com"]
  },
  toolResult: "找到相关结果:\n1. React TypeScript Guide...",
  isExecuting: false,
  timestamp: new Date()
};
```

## 使用方法

### 基本使用

```typescript
import { ToolRenderer } from './components/tools';

// 创建工具执行对象
const execution: ToolExecution = {
  id: "unique_id",
  toolName: "Bash",
  toolInput: { command: "ls -la" },
  isExecuting: false,
  timestamp: new Date()
};

// 渲染工具组件
<ToolRenderer execution={execution} />
```

### 兼容现有代码

```typescript
import { ToolUsage } from './components/ToolUsage';

// 使用现有接口（自动转换为新格式）
<ToolUsage
  toolName="Bash"
  toolInput={{ command: "npm test" }}
  toolResult="Tests passed!"
  isError={false}
  isExecuting={false}
/>
```

## 设计原则

1. **统一性**: 所有工具遵循统一的视觉和交互规范
2. **可识别性**: 每个工具有独特的颜色和图标
3. **信息层次**: 重要信息优先显示，长内容智能截断
4. **状态清晰**: 执行中、成功、失败状态一目了然
5. **响应式**: 适配不同屏幕尺寸
6. **可扩展**: 易于添加新工具支持

## 样式系统

### 颜色主题
- Task: 紫色 (purple)
- Bash: 灰色 (gray) 
- Glob: 蓝色 (blue)
- Grep: 绿色 (green)
- LS: 黄色 (yellow)
- exit_plan_mode: 翠绿色 (emerald)
- Read: 靛蓝色 (indigo)
- Edit: 橙色 (orange)
- MultiEdit: 红色 (red)
- Write: 青色 (cyan)
- NotebookRead: 粉色 (pink)
- NotebookEdit: 玫瑰色 (rose)
- WebFetch: 蓝绿色 (teal)
- TodoWrite: 紫罗兰色 (violet)
- WebSearch: 天蓝色 (sky)

### 响应式断点
- `md:grid-cols-2`: 中等屏幕及以上使用两列布局
- `max-h-*`: 限制最大高度，提供滚动
- `break-words`: 长文本自动换行

## 错误处理

所有组件都支持错误状态显示：
- 错误时显示红色边框和背景
- 错误信息以红色文本显示
- 执行失败时显示相应的错误图标

## 性能优化

1. **按需加载**: 只渲染当前需要的工具组件
2. **内容截断**: 长内容自动截断，避免渲染卡顿
3. **虚拟化**: 长列表使用滚动容器，限制DOM节点数量
4. **记忆化**: 对于静态内容使用React.memo优化