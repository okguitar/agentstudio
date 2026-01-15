# 后端从会话历史消息中识别自定义命令的逻辑分析

## 概述

本文档详细描述了后端系统如何从Claude历史会话消息中识别和提取自定义命令的完整逻辑流程。

## 核心组件

### 1. 数据结构

#### ClaudeHistoryMessage
```typescript
interface ClaudeHistoryMessage {
  type: 'summary' | 'user' | 'text' | 'assistant' | 'message' | 'thinking' | 'tool_use' | 'tool_result';
  uuid: string;
  timestamp: string;
  sessionId: string;
  message?: ClaudeMessage;
  parentUuid?: string | null;
  // ... 其他字段
}
```

#### SlashCommand
```typescript
interface SlashCommand {
  id: string;
  name: string;
  description: string;
  content: string;
  scope: 'project' | 'user';
  namespace?: string;
  argumentHint?: string;
  allowedTools?: string[];
  model?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. 主要函数

#### readClaudeHistorySessions()
- **位置**: `backend/src/routes/agents.ts:30`
- **功能**: 读取并解析Claude历史会话文件
- **输入**: `projectPath: string`
- **输出**: `ClaudeHistorySession[]`

#### extractContentFromClaudeMessage()
- **位置**: `backend/src/routes/agents.ts:226`
- **功能**: 从Claude消息中提取内容，特别处理命令格式
- **关键逻辑**: 识别 `<command-message>` 和 `<command-name>` 标签

#### convertClaudeMessageToMessageParts()
- **位置**: `backend/src/routes/agents.ts:248`
- **功能**: 将Claude消息转换为系统内部格式
- **关键逻辑**: 识别命令格式并创建特殊的 `command` 类型消息部分

## 命令识别逻辑

### 1. 命令标识符检测

系统通过正则表达式检测消息中的命令格式：

```javascript
const commandMatch = msg.message.content.match(
  /<command-message>.*?<\/command-message>\s*<command-name>(.+?)<\/command-name>/
);
```

**匹配模式**:
- `<command-message>` 标签：包含命令的描述信息
- `<command-name>` 标签：包含实际的命令名称

### 2. 消息过滤规则

#### 2.1 基本过滤条件
```javascript
const conversationMessages = messages.filter(msg => {
  // 排除特定类型的消息
  if (['summary', 'thinking'].includes(msg.type)) return false;
  
  // 排除某些工具输出消息
  if (msg.type === 'tool_result' && 
      msg.message?.content?.includes('<local-command-stdout></local-command-stdout>') && 
      msg.parentUuid) {
    // 检查父消息是否为 /clear 命令
    const parentMsg = messages.find(m => m.uuid === msg.parentUuid);
    if (parentMsg && parentMsg.message?.content?.includes('<command-name>/clear</command-name>')) {
      return false;
    }
  }
  
  // 处理 assistant 类型消息
  if (msg.type === 'assistant') return true;
  
  // 处理 user 类型消息
  if (msg.type === 'user') {
    if (msg.message?.content && Array.isArray(msg.message.content)) {
      const hasNonToolResult = msg.message.content.some(block => block.type !== 'tool_result');
      return hasNonToolResult;
    }
    return typeof msg.message?.content === 'string' || !msg.message?.content;
  }
  
  return false;
});
```

#### 2.2 特殊命令处理
- **清理命令**: 系统特别处理 `/clear` 命令，会过滤掉其相关的输出消息
- **工具结果**: 过滤掉纯工具结果消息，只保留包含用户内容的消息

### 3. 消息转换流程

#### 3.1 内容提取
```javascript
function extractContentFromClaudeMessage(msg) {
  if (typeof msg.message.content === 'string') {
    const commandMatch = msg.message.content.match(
      /<command-message>.*?<\/command-message>\s*<command-name>(.+?)<\/command-name>/
    );
    if (commandMatch) {
      return commandMatch[1]; // 返回命令名称
    }
    return msg.message.content;
  }
  
  if (Array.isArray(msg.message.content)) {
    return msg.message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');
  }
}
```

#### 3.2 消息部分创建
```javascript
function convertClaudeMessageToMessageParts(msg) {
  if (typeof msg.message.content === 'string') {
    // 检测命令格式
    const commandMatch = msg.message.content.match(
      /<command-message>.*?<\/command-message>\s*<command-name>(.+?)<\/command-name>/
    );
    
    if (commandMatch) {
      return [{
        id: `part_0_${msg.uuid}`,
        type: 'command',
        content: commandMatch[1], // 命令名称
        originalContent: msg.message.content, // 保留原始内容
        order: 0
      }];
    }
    
    // 普通文本消息
    return [{
      id: `part_0_${msg.uuid}`,
      type: 'text',
      content: msg.message.content,
      order: 0
    }];
  }
  
  // 处理数组内容（工具使用、图片等）
  if (Array.isArray(msg.message.content)) {
    return msg.message.content.map((block, index) => {
      if (block.type === 'text') {
        return {
          id: `part_${index}_${msg.uuid}`,
          type: 'text',
          content: block.text,
          order: index
        };
      } else if (block.type === 'tool_use') {
        return {
          id: `part_${index}_${msg.uuid}`,
          type: 'tool',
          toolData: {
            claudeId: block.id,
            toolName: block.name,
            toolInput: block.input || {},
            toolResult: '',
            isExecuting: false,
            isError: false
          },
          order: index
        };
      }
      // ... 处理其他类型
    }).filter(part => part !== null);
  }
}
```

## 自定义命令管理

### 1. 命令存储结构

#### 项目命令
- **路径**: `{projectPath}/.ai-commands/`
- **范围**: 项目级别，与团队共享

#### 用户命令
- **路径**: `~/.ai-commands/`
- **范围**: 用户级别，个人使用

### 2. 命令文件格式

```markdown
---
description: "命令描述"
argument-hint: "参数提示"
allowed-tools: "Read,Write,Edit"
model: "sonnet"
---

命令的具体内容...
```

### 3. 命令扫描逻辑

```javascript
async function scanCommands(dirPath, scope) {
  const commands = [];
  
  async function scanDirectory(currentDir, namespace) {
    const items = await readdir(currentDir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const subNamespace = namespace ? `${namespace}/${item.name}` : item.name;
        await scanDirectory(path.join(currentDir, item.name), subNamespace);
      } else if (item.name.endsWith('.md')) {
        const commandName = item.name.replace('.md', '');
        const content = await readFile(path.join(currentDir, item.name), 'utf-8');
        const parsed = parseCommandContent(content);
        
        commands.push({
          id: `${scope}:${namespace ? namespace + '/' : ''}${commandName}`,
          name: commandName,
          description: parsed.frontmatter.description || '',
          content: parsed.body,
          scope,
          namespace,
          // ... 其他属性
        });
      }
    }
  }
  
  await scanDirectory(dirPath);
  return commands;
}
```

## 关键技术点

### 1. 正则表达式模式
- **命令识别**: `/<command-message>.*?<\/command-message>\s*<command-name>(.+?)<\/command-name>/`
- **非贪婪匹配**: 使用 `.*?` 避免跨命令匹配
- **命名捕获**: 提取 `<command-name>` 标签内的内容

### 2. 消息层次结构
- **父子关系**: 通过 `parentUuid` 建立消息间的层次关系
- **工具链**: 工具使用和工具结果的关联处理
- **会话隔离**: 按 `sessionId` 组织消息

### 3. 内容类型处理
- **字符串内容**: 直接处理文本消息
- **数组内容**: 处理包含多种类型（文本、工具、图片）的复合消息
- **工具消息**: 特殊处理工具使用和结果消息

### 4. 错误处理
- **文件不存在**: 优雅处理命令文件缺失
- **解析错误**: 容错处理格式错误的命令文件
- **权限问题**: 处理文件系统访问权限

## 性能优化

### 1. 缓存策略
- 避免重复扫描命令目录
- 使用文件修改时间检测变更

### 2. 内存管理
- 流式处理大型历史文件
- 及时释放不需要的消息数据

### 3. 并发处理
- 并行扫描多个命令目录
- 异步文件操作

## 安全考虑

### 1. 路径安全
- 验证命令文件路径，防止目录遍历攻击
- 限制命令文件的访问范围

### 2. 内容验证
- 验证命令内容的格式和语法
- 过滤恶意代码和脚本

### 3. 权限控制
- 区分项目级和用户级命令权限
- 验证用户对命令的访问权限
