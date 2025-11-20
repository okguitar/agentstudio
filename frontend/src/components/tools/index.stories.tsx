import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Tools/Overview',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '# 工具组件系统概览\n\n这个系统包含 22 种不同的工具组件，每种组件都有其特定的用途和显示方式。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToolSystemOverview: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">AI 工具组件系统</h1>
        <p className="text-lg text-gray-600">
          完整的工具可视化系统，支持 22 种不同类型的 AI 工具
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">🔧 开发者工具</h2>
          <ul className="space-y-2 text-blue-800">
            <li>• <strong>Bash</strong> - 命令行执行</li>
            <li>• <strong>Task</strong> - AI 代理任务</li>
            <li>• <strong>Edit</strong> - 文件编辑</li>
            <li>• <strong>MultiEdit</strong> - 批量文件编辑</li>
            <li>• <strong>Write</strong> - 文件写入</li>
            <li>• <strong>Read</strong> - 文件读取</li>
            <li>• <strong>NotebookEdit</strong> - Jupyter Notebook 编辑</li>
            <li>• <strong>NotebookRead</strong> - Jupyter Notebook 读取</li>
          </ul>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-green-900 mb-3">🔍 搜索工具</h2>
          <ul className="space-y-2 text-green-800">
            <li>• <strong>Grep</strong> - 文本搜索</li>
            <li>• <strong>Glob</strong> - 文件模式匹配</li>
            <li>• <strong>LS</strong> - 目录列表</li>
            <li>• <strong>WebFetch</strong> - 网页内容获取</li>
            <li>• <strong>WebSearch</strong> - 网络搜索</li>
          </ul>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-purple-900 mb-3">🤖 MCP 工具</h2>
          <ul className="space-y-2 text-purple-800">
            <li>• <strong>ListMcpResources</strong> - MCP 资源列表</li>
            <li>• <strong>ReadMcpResource</strong> - MCP 资源读取</li>
            <li>• <strong>Mcp</strong> - 通用 MCP 工具</li>
          </ul>
        </div>

        <div className="bg-orange-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-orange-900 mb-3">⚡ 高级工具</h2>
          <ul className="space-y-2 text-orange-800">
            <li>• <strong>TimeMachine</strong> - 时间回溯</li>
            <li>• <strong>AskUserQuestion</strong> - 用户交互</li>
            <li>• <strong>TodoWrite</strong> - 任务管理</li>
            <li>• <strong>ExitPlanMode</strong> - 退出规划模式</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">🔧 系统工具</h2>
        <ul className="space-y-2 text-gray-800">
          <li>• <strong>KillBash</strong> - 终止 Bash 进程</li>
          <li>• <strong>BashOutput</strong> - Bash 输出查看</li>
        </ul>
      </div>

      <div className="bg-yellow-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-yellow-900 mb-3">✨ 核心特性</h2>
        <ul className="space-y-2 text-yellow-800">
          <li>• <strong>统一设计</strong> - 基于 BaseToolComponent 的统一布局</li>
          <li>• <strong>状态管理</strong> - 支持等待、执行中、成功、错误等状态</li>
          <li>• <strong>国际化</strong> - 完整的多语言支持</li>
          <li>• <strong>响应式设计</strong> - 适配不同屏幕尺寸</li>
          <li>• <strong>无障碍支持</strong> - 符合 WCAG 标准</li>
          <li>• <strong>实时更新</strong> - 支持工具执行状态的实时更新</li>
        </ul>
      </div>

      <div className="text-center">
        <p className="text-gray-600 mb-4">使用左侧导航栏探索各个工具组件</p>
        <div className="flex justify-center space-x-4 text-sm text-gray-500">
          <span>📚 包含 {22} 个工具组件</span>
          <span>•</span>
          <span>🎨 {5} 个主要分类</span>
          <span>•</span>
          <span>✅ 100% 类型安全</span>
        </div>
      </div>
    </div>
  ),
};