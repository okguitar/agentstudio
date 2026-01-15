# LAVS 事件驱动同步 - 完整实现指南

## 🎯 架构设计原则

你说得对！**业务侧不应该关心LAVS的实现细节**。正确的架构应该是：

```
工具执行完成 (业务侧)
  ↓
通知 Store: "有工具被调用了" (不关心是什么工具)
  ↓
LAVSViewContainer 监听 Store 变化
  ↓
通知 iframe: onAgentAction()
  ↓
Agent开发者自己决定是否响应 (在 onAgentAction 里判断)
```

## ✅ 已完成的工作

### 1. Store 准备 (frontend/src/stores/useAgentStore.ts)

```typescript
interface AgentState {
  // ... 其他字段

  // Tool execution notification (for LAVS sync)
  lastToolExecution: { toolName: string; timestamp: number } | null;

  // Actions
  notifyToolExecution: (toolName: string) => void;
}
```

### 2. LAVSViewContainer 部分准备

- 已添加 `iframeRef` 用于保存iframe引用
- 已添加 `processedToolsRef` 用于去重
- 已添加详细的调试日志

## 🔧 需要完成的步骤

### 步骤1: 在工具结果返回时调用通知

**文件**: `frontend/src/hooks/agentChat/useAIStreamHandler.ts`

**位置**: 搜索 `tool_result` 处理逻辑（约1189行）

**添加代码**:

```typescript
// 在处理 tool_result 后，通知 store
if (block.type === 'tool_result' && block.tool_use_id) {
  console.log('🔧 Processing tool_result for tool_use_id:', block.tool_use_id);

  // 找到对应的 tool_use 获取工具名称
  const toolUsePart = /* 从消息中找到对应的 tool_use part */;
  if (toolUsePart && toolUsePart.name) {
    // 通知 store 有工具被执行了
    useAgentStore.getState().notifyToolExecution(toolUsePart.name);
    console.log('📢 Notified tool execution:', toolUsePart.name);
  }
}
```

### 步骤2: 在LAVSViewContainer中监听并通知iframe

**文件**: `frontend/src/components/LAVSViewContainer.tsx`

**替换现有的消息监听逻辑**:

```typescript
// 监听工具执行通知
const lastToolExecution = useAgentStore((state) => state.lastToolExecution);

useEffect(() => {
  if (!componentLoaded || !iframeRef.current || !lastToolExecution) return;

  console.log('[LAVS] Tool execution detected:', lastToolExecution);

  // 通知 iframe
  if (iframeRef.current.contentWindow) {
    const message = {
      type: 'lavs-agent-action',
      action: {
        type: 'tool_executed',
        tool: lastToolExecution.toolName,
        timestamp: lastToolExecution.timestamp,
      }
    };

    console.log('[LAVS] Sending postMessage to iframe:', message);
    iframeRef.current.contentWindow.postMessage(message, '*');
  }
}, [lastToolExecution, componentLoaded]);
```

### 步骤3: 更新 View 组件的 onAgentAction

**文件**: `agents/todo-manager/view/index.html`

**已经完成** - 当前实现已经正确：

```javascript
onAgentAction(action) {
  console.log('[TodoView] Agent action received:', action);

  // Agent开发者自己决定是否响应
  if (action.type === 'tool_executed') {
    // 可以进一步判断具体工具
    if (action.tool?.startsWith('lavs_')) {
      console.log('[TodoView] LAVS tool executed, refreshing...');
      this.loadTodos().then(() => {
        this.render();
        this.attachEventListeners();
      });
    }
  }
}
```

## 🎨 架构优势

### ✅ 关注点分离
- **业务侧**: 只负责通知"有工具被执行"
- **LAVS框架**: 负责事件路由
- **Agent开发者**: 决定如何响应

### ✅ 可扩展性
- 未来可以添加更多事件类型（不只是工具执行）
- Agent可以选择性响应特定工具
- 不需要修改业务代码

### ✅ 性能
- 无轮询开销
- 事件驱动，实时响应
- 去重机制避免重复刷新

## 🐛 调试技巧

### 1. 检查 Store 通知
```javascript
// 在浏览器控制台
useAgentStore.getState().lastToolExecution
```

### 2. 检查 postMessage
```javascript
// 在 iframe 内部（agents/todo-manager/view/index.html）
window.addEventListener('message', (e) => {
  console.log('[TodoView] Received message:', e.data);
});
```

### 3. 完整日志链路
```
🔧 Processing tool_result (useAIStreamHandler)
  ↓
📢 Notified tool execution (useAIStreamHandler)
  ↓
[LAVS] Tool execution detected (LAVSViewContainer)
  ↓
[LAVS] Sending postMessage to iframe (LAVSViewContainer)
  ↓
[TodoView] Received message (view component)
  ↓
[TodoView] Agent action received (onAgentAction)
  ↓
[TodoView] LAVS tool executed, refreshing... (onAgentAction)
```

## 📝 总结

这个架构的核心思想是：

1. **业务侧不关心LAVS** - 只通知"工具执行了"
2. **LAVS框架负责路由** - 将通知转发给正确的view
3. **Agent开发者决定响应** - 在 `onAgentAction()` 中自己判断

这样每个层次都只关心自己的职责，代码清晰、可维护、可扩展！
