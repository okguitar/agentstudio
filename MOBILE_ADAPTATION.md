# 移动端适配实现文档

## 概述

本文档记录了AgentStudio项目的移动端适配实现，包括架构设计、组件实现和使用指南。

## 实现的功能

### 1. 响应式布局基础架构

#### Tailwind CSS 配置增强
- 添加了 `xs: 475px` 断点
- 添加了 `3xl: 1600px` 断点
- 新增移动端动画关键帧
- 扩展了 z-index 层级
- 添加了移动端友好的间距和最大宽度

#### 移动端检测 Hook
创建了 `useMobile` 系列 hooks：
- `useMobile(breakpoint)`: 检测是否为移动端
- `useBreakpoints()`: 获取所有断点状态
- `useScreenSize()`: 获取屏幕尺寸
- `useOrientation()`: 获取屏幕方向

### 2. 移动端上下文管理

#### MobileContext
提供了全局的移动端状态管理：
- `isMobile`, `isTablet`, `isDesktop`: 设备类型检测
- `sidebarOpen`, `rightPanelOpen`: 面板状态
- `activePanel`: 当前活动面板
- 自动处理面板状态协调和屏幕旋转适配

### 3. 核心组件适配

#### Layout 组件
- **桌面端**: 保持原有侧边栏 + 主内容布局
- **移动端**:
  - 隐藏固定侧边栏
  - 添加顶部header带菜单按钮
  - 集成移动端底部导航
  - 支持安全区域 (safe-area)

#### Sidebar 组件
- **MobileSidebar**: 移动端专用抽屉式侧边栏
- 支持遮罩层点击关闭
- 滑动动画效果
- 保持原有导航功能

#### SplitLayout 组件
- **桌面端**: 保持原有的拖拽调整布局
- **移动端**: 提供两种布局模式
  - `stack`: 堆叠模式，主界面始终显示，右侧面板以模态框显示
  - `tabs`: 标签模式，顶部标签切换不同面板
- 自动禁用移动端的拖拽功能
- 添加浮动操作按钮 (FAB)

#### MobileNavigation 组件
- 底部固定导航栏
- 包含主要导航项：Dashboard, Projects, Agents, MCP, Settings
- 响应式图标和文字
- 活跃状态高亮

#### MobileChatInput 组件
- 移动端优化的聊天输入界面
- 自动调整高度的文本框
- 支持语音录制、文件上传、表情选择
- 优化的触摸目标和键盘交互

### 4. 移动端优化

#### CSS 优化 (mobile.css)
- **安全区域支持**: `pb-safe`, `pt-safe` 等工具类
- **滚动优化**: `-webkit-overflow-scrolling: touch`
- **触摸优化**: 44px 最小触摸目标
- **滚动条样式**: 移动端友好的细滚动条
- **动画效果**: slideUp, slideDown, fadeIn 等预设动画
- **输入框优化**: 防止iOS输入框放大

#### 交互优化
- 手势友好的按钮大小
- 滑动和点击反馈
- 键盘弹出时的界面适配
- 横竖屏切换时的状态重置

## 使用方法

### 1. 开发环境
项目已在 `mobile-adaptation` 分支中开发，可以通过以下方式访问：

```bash
# 切换到 worktree
cd /Users/kongjie/projects/agentstudio-mobile-adaptation

# 启动开发服务器
pnpm --filter frontend run dev
# 访问 http://localhost:3003
```

### 2. 在组件中使用移动端功能

#### 使用 Mobile Context
```tsx
import { useMobileContext } from '../contexts/MobileContext';

const MyComponent = () => {
  const { isMobile, sidebarOpen, setSidebarOpen } = useMobileContext();

  if (isMobile) {
    // 移动端逻辑
    return <MobileView />;
  }

  // 桌面端逻辑
  return <DesktopView />;
};
```

#### 使用移动端检测 Hook
```tsx
import { useMobile, useBreakpoints } from '../hooks/useMobile';

const MyComponent = () => {
  const isMobile = useMobile('md');
  const { sm, md, lg } = useBreakpoints();

  return (
    <div className={isMobile ? 'mobile-styles' : 'desktop-styles'}>
      {/* 内容 */}
    </div>
  );
};
```

#### 响应式样式
```tsx
const MyComponent = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 移动端单列，桌面端3列布局 */}
    </div>
  );
};
```

### 3. 布局组件使用

#### Layout 组件
```tsx
import { Layout } from '../components/Layout';

const MyPage = () => {
  return (
    <Layout>
      {/* 页面内容 - 自动适配移动端 */}
    </Layout>
  );
};
```

#### SplitLayout 组件
```tsx
import { SplitLayout } from '../components/SplitLayout';

const ChatPage = () => {
  return (
    <SplitLayout mobileLayout="tabs">
      <ChatPanel />
      <PreviewPanel />
    </SplitLayout>
  );
};
```

## 测试

### 手动测试要点
1. **响应式布局**: 在不同屏幕尺寸下测试布局切换
2. **侧边栏交互**: 测试移动端抽屉开关
3. **底部导航**: 测试导航项切换和活跃状态
4. **聊天输入**: 测试文本框自动调整和功能按钮
5. **面板切换**: 测试移动端的标签或模态布局

### 自动化测试
创建了基础的测试框架 `test-mobile.tsx`，包含：
- MobileProvider 功能测试
- 组件渲染测试
- 视口检测测试

运行测试：
```bash
cd frontend && pnpm test
```

## 技术细节

### 断点策略
- `xs`: 475px - 小屏手机
- `sm`: 640px - 大屏手机
- `md`: 768px - 平板/移动端分界
- `lg`: 1024px - 小桌面
- `xl`: 1280px - 桌面
- `2xl`: 1536px - 大桌面
- `3xl`: 1600px - 超大屏

### 状态管理
使用 React Context 管理全局移动端状态，确保组件间的状态同步。

### 性能优化
- 使用 CSS 变换而非布局属性实现动画
- 懒加载移动端组件
- 避免重复的视口检测
- 使用 ResizeObserver 替代 window resize 事件

## 已知限制和后续改进

### 当前限制
1. 语音录制功能尚未完全实现
2. 表情选择器功能待完善
3. 文件上传移动端优化待加强
4. 某些复杂交互可能需要进一步优化

### 后续改进建议
1. 添加 PWA 支持离线使用
2. 实现触摸手势支持
3. 添加振动反馈
4. 优化加载性能
5. 添加更多的移动端友好动画

## 兼容性

- **iOS Safari 12+**: 完全支持
- **Chrome Mobile**: 完全支持
- **Samsung Internet**: 完全支持
- **Firefox Mobile**: 基本支持

---

**开发时间**: 2025年10月11日
**分支**: mobile-adaptation
**工作树**: /Users/kongjie/projects/agentstudio-mobile-adaptation