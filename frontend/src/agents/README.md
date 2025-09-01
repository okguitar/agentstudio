# Agent插件架构

这个目录包含了重构后的Agent插件系统，用于解耦ChatPage与具体Agent类型的逻辑。

## 架构概述

### 核心原则
- **插件化**：每个Agent类型都是独立的插件
- **解耦**：主框架不依赖具体的业务逻辑
- **配置驱动**：布局和组件通过配置决定

### 目录结构

```
agents/
├── types.ts              # 插件接口定义
├── registry.ts           # 插件注册表
├── slides/               # 幻灯片Agent插件
│   ├── components/
│   │   └── SlidePreviewPanel.tsx
│   └── index.ts
├── chat/                 # 纯聊天Agent插件
│   └── index.ts
├── documents/            # 文档Agent插件
│   ├── components/
│   │   └── DocumentOutlinePanel.tsx
│   └── index.ts
└── code/                 # 代码Agent插件
    ├── components/
    │   └── CodeExplorerPanel.tsx
    └── index.ts
```

## 工作原理

### 1. 插件配置

每个Agent插件都导出一个`AgentPlugin`配置对象：

```typescript
interface AgentPlugin {
  rightPanelComponent?: React.ComponentType<AgentPanelProps>;
  onMount?: (agentId: string) => void;
  onUnmount?: (agentId: string) => void;
}
```

### 2. 布局决策

- **无 `rightPanelComponent`** = single布局（只有聊天面板）
- **有 `rightPanelComponent`** = split布局（聊天面板 + 右侧面板）

### 3. 组件加载

```typescript
// ChatPage 中的核心逻辑
const agentPlugin = getAgentPlugin(agent.ui.componentType);
const RightPanelComponent = agentPlugin?.rightPanelComponent;

if (!RightPanelComponent) {
  // 单栏布局
  return <AgentChatPanel agent={agent} />;
}

// 分栏布局
return (
  <SplitLayout>
    <AgentChatPanel agent={agent} />
    <RightPanelComponent agent={agent} />
  </SplitLayout>
);
```

## 现有Agent类型

### 1. Slides Agent (`slides`)
- **右侧面板**：`SlidePreviewPanel` - 幻灯片列表和预览
- **特性**：继承了原有的PPT功能

### 2. Chat Agent (`chat`)
- **布局**：单栏（无右侧面板）
- **特性**：纯聊天交互

### 3. Documents Agent (`documents`)
- **右侧面板**：`DocumentOutlinePanel` - 文档大纲（框架）
- **状态**：基础框架，待完善

### 4. Code Agent (`code`)
- **右侧面板**：`CodeExplorerPanel` - 代码浏览器（框架）
- **状态**：基础框架，待完善

## 添加新Agent类型

1. **创建插件目录**：`agents/your-agent/`

2. **实现右侧面板组件**（可选）：
```typescript
// agents/your-agent/components/YourPanel.tsx
export const YourPanel: React.FC<AgentPanelProps> = ({ agent }) => {
  // 组件内部自己管理所需的hooks和状态
  return <div>Your custom panel</div>;
};
```

3. **创建插件配置**：
```typescript
// agents/your-agent/index.ts
import { YourPanel } from './components/YourPanel';

export default {
  rightPanelComponent: YourPanel, // 可选
  onMount: (agentId) => console.log('mounted'),
  onUnmount: (agentId) => console.log('unmounted'),
};
```

4. **注册插件**：
```typescript
// agents/registry.ts
import yourAgent from './your-agent';

export const AgentRegistry = {
  // ...
  'your-type': yourAgent,
};
```

## 向后兼容性

重构保持了与现有代码的兼容性：

- PPT相关的状态同步逻辑仍然存在
- 所有现有的hooks和stores继续工作
- 原有的`PreviewPanel`组件被标记为deprecated但仍然可用

## 优势

✅ **解耦**：ChatPage不再包含特定Agent的业务逻辑  
✅ **可扩展**：添加新Agent类型无需修改主框架  
✅ **可维护**：每个Agent的代码完全独立  
✅ **类型安全**：完整的TypeScript支持  
✅ **按需加载**：支持动态导入（未来可扩展）
