import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolRenderer } from '../ToolRenderer';
import type { ToolExecution } from '../types';

describe('ToolRenderer E2E Tests', () => {
  const baseExecution = {
    id: 'test-tool-001',
    timestamp: new Date('2024-01-01T10:00:00Z'),
  };

  describe('Task Tool', () => {
    it('renders task tool with all components', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Task',
        toolInput: {
          description: '搜索文件',
          prompt: '在项目中搜索所有TypeScript文件并分析其结构。这是一个详细的提示，用来测试长文本的截断功能。'.repeat(5),
        },
        toolResult: '任务完成，找到25个TypeScript文件',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      // 验证工具名称和图标
      expect(screen.getByText('Task')).toBeInTheDocument();
      expect(screen.getByText('已完成')).toBeInTheDocument();

      // 验证输入参数
      expect(screen.getByText('描述:')).toBeInTheDocument();
      expect(screen.getByText('搜索文件')).toBeInTheDocument();
      expect(screen.getByText('任务提示:')).toBeInTheDocument();
      expect(screen.getByText(/...\(已截断\)/)).toBeInTheDocument();

      // 验证执行结果
      expect(screen.getByText('执行结果:')).toBeInTheDocument();
      expect(screen.getByText('任务完成，找到25个TypeScript文件')).toBeInTheDocument();

      // 验证时间戳存在
      expect(screen.getByText(/\d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument();
    });

    it('renders task tool in executing state', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Task',
        toolInput: {
          description: '分析代码',
          prompt: '分析React组件的结构',
        },
        isExecuting: true,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('执行中...')).toBeInTheDocument();
      expect(screen.queryByText('执行结果:')).not.toBeInTheDocument();
    });
  });

  describe('Bash Tool', () => {
    it('renders bash tool with command and description', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Bash',
        toolInput: {
          command: 'npm run build',
          description: '构建前端项目',
          timeout: 120000,
        },
        toolResult: 'Build completed successfully!\nOutput size: 1.2MB',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('Bash')).toBeInTheDocument();
      expect(screen.getByText('描述:')).toBeInTheDocument();
      expect(screen.getByText('构建前端项目')).toBeInTheDocument();
      expect(screen.getByText('命令:')).toBeInTheDocument();
      expect(screen.getByText('npm run build')).toBeInTheDocument();
      expect(screen.getByText('超时时间:')).toBeInTheDocument();
      expect(screen.getByText('120000ms')).toBeInTheDocument();
      expect(screen.getByText('Build completed successfully!\nOutput size: 1.2MB')).toBeInTheDocument();
    });

    it('renders bash tool with error state', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Bash',
        toolInput: {
          command: 'npm run invalid-command',
        },
        toolResult: 'Command not found: invalid-command',
        isExecuting: false,
        isError: true,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('已完成 - 错误')).toBeInTheDocument();
      expect(screen.getByText('执行错误')).toBeInTheDocument();
      expect(screen.getByText('Command not found: invalid-command')).toBeInTheDocument();
    });
  });

  describe('Glob Tool', () => {
    it('renders glob tool with file count', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Glob',
        toolInput: {
          pattern: '**/*.tsx',
          path: '/Users/project/src',
        },
        toolResult: '/Users/project/src/App.tsx\n/Users/project/src/components/Header.tsx\n/Users/project/src/pages/Home.tsx',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('Glob')).toBeInTheDocument();
      expect(screen.getByText('匹配模式:')).toBeInTheDocument();
      expect(screen.getByText('**/*.tsx')).toBeInTheDocument();
      expect(screen.getByText('搜索路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/project/src')).toBeInTheDocument();
      expect(screen.getByText('匹配结果:')).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('找到') && content.includes('个匹配的文件'))).toBeInTheDocument();
    });
  });

  describe('Grep Tool', () => {
    it('renders grep tool with search options', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Grep',
        toolInput: {
          pattern: 'interface.*Props',
          glob: '**/*.tsx',
          output_mode: 'files_with_matches' as const,
          '-i': true,
          '-n': true,
          '-A': 2,
          multiline: true,
        },
        toolResult: 'src/App.tsx\nsrc/components/Header.tsx',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('Grep')).toBeInTheDocument();
      expect(screen.getByText('搜索模式:')).toBeInTheDocument();
      expect(screen.getByText('interface.*Props')).toBeInTheDocument();
      expect(screen.getByText('文件过滤:')).toBeInTheDocument();
      expect(screen.getByText('**/*.tsx')).toBeInTheDocument();
      expect(screen.getByText('输出模式:')).toBeInTheDocument();
      expect(screen.getByText('files_with_matches')).toBeInTheDocument();

      // 验证搜索选项标签
      expect(screen.getByText('忽略大小写')).toBeInTheDocument();
      expect(screen.getByText('显示行号')).toBeInTheDocument();
      expect(screen.getByText('后 2 行')).toBeInTheDocument();
      expect(screen.getByText('多行模式')).toBeInTheDocument();

      // 验证搜索结果
      expect(screen.getByText('搜索结果:')).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('找到') && content.includes('个匹配的文件'))).toBeInTheDocument();
    });
  });

  describe('LS Tool', () => {
    it('renders ls tool with directory structure', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'LS',
        toolInput: {
          path: '/Users/project/src',
          ignore: ['node_modules', '*.log'],
        },
        toolResult: '- src/\n  - components/\n    - Header.tsx\n  - utils/\n  - App.tsx',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('LS')).toBeInTheDocument();
      expect(screen.getByText('目录路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/project/src')).toBeInTheDocument();
      expect(screen.getByText('忽略模式:')).toBeInTheDocument();
      expect(screen.getByText('node_modules, *.log')).toBeInTheDocument();
      expect(screen.getByText('目录结构:')).toBeInTheDocument();
    });
  });

  describe('Read Tool', () => {
    it('renders read tool with file content', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Read',
        toolInput: {
          file_path: '/Users/project/src/App.tsx',
          offset: 1,
          limit: 50,
        },
        toolResult: '     1→import React from \'react\';\n     2→import \'./App.css\';\n     3→\n     4→function App() {',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByText('文件路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/project/src/App.tsx')).toBeInTheDocument();
      expect(screen.getByText('起始行:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('读取行数:')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  describe('Edit Tool', () => {
    it('renders edit tool with old and new text comparison', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Edit',
        toolInput: {
          file_path: '/Users/project/src/App.tsx',
          old_string: 'const App = () => {',
          new_string: 'const App: React.FC = () => {',
          replace_all: false,
        },
        toolResult: 'File updated successfully',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('文件路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/project/src/App.tsx')).toBeInTheDocument();
      expect(screen.getByText('原文本:')).toBeInTheDocument();
      expect(screen.getByText('const App = () => {')).toBeInTheDocument();
      expect(screen.getByText('新文本:')).toBeInTheDocument();
      expect(screen.getByText('const App: React.FC = () => {')).toBeInTheDocument();
      expect(screen.queryByText('全部替换:')).not.toBeInTheDocument();
    });

    it('renders edit tool with replace_all flag', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Edit',
        toolInput: {
          file_path: '/Users/project/src/App.tsx',
          old_string: 'useState',
          new_string: 'React.useState',
          replace_all: true,
        },
        toolResult: 'File updated successfully',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('全部替换:')).toBeInTheDocument();
      expect(screen.getByText('是')).toBeInTheDocument();
    });
  });

  describe('MultiEdit Tool', () => {
    it('renders multiedit tool with multiple operations', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'MultiEdit',
        toolInput: {
          file_path: '/Users/project/src/App.tsx',
          edits: [
            {
              old_string: 'useState',
              new_string: 'React.useState',
              replace_all: true,
            },
            {
              old_string: 'useEffect',
              new_string: 'React.useEffect',
              replace_all: true,
            },
            {
              old_string: 'const App = () => {',
              new_string: 'const App: React.FC = () => {',
              replace_all: false,
            },
          ],
        },
        toolResult: 'All edits applied successfully',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('MultiEdit')).toBeInTheDocument();
      expect(screen.getByText('文件路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/project/src/App.tsx')).toBeInTheDocument();
      expect(screen.getByText('批量编辑 (3 个操作):')).toBeInTheDocument();

      // 验证每个编辑操作
      expect(screen.getByText('操作 #1')).toBeInTheDocument();
      expect(screen.getByText('操作 #2')).toBeInTheDocument();
      expect(screen.getByText('操作 #3')).toBeInTheDocument();

      // 验证全部替换标签
      const replaceAllTags = screen.getAllByText('全部替换');
      expect(replaceAllTags).toHaveLength(2); // 只有前两个操作有全部替换

      // 验证原文本和新文本
      expect(screen.getByText('useState')).toBeInTheDocument();
      expect(screen.getByText('React.useState')).toBeInTheDocument();
      expect(screen.getByText('useEffect')).toBeInTheDocument();
      expect(screen.getByText('React.useEffect')).toBeInTheDocument();
    });
  });

  describe('Write Tool', () => {
    it('renders write tool with file content', () => {
      const longContent = 'import React from \'react\';\n\nexport const Component = () => {\n  return <div>Hello World</div>;\n};'.repeat(10);
      
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Write',
        toolInput: {
          file_path: '/Users/project/src/NewComponent.tsx',
          content: longContent,
        },
        toolResult: 'File created successfully',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('Write')).toBeInTheDocument();
      expect(screen.getByText('文件路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/project/src/NewComponent.tsx')).toBeInTheDocument();
      expect(screen.getByText('文件内容:')).toBeInTheDocument();
      expect(screen.getByText(/...\(内容已截断\)/)).toBeInTheDocument();
      expect(screen.getByText(`总长度: ${longContent.length} 字符`)).toBeInTheDocument();
    });
  });

  describe('WebFetch Tool', () => {
    it('renders webfetch tool with clickable URL', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'WebFetch',
        toolInput: {
          url: 'https://example.com/api/docs',
          prompt: '提取API文档中的主要接口信息和使用示例',
        },
        toolResult: '页面标题: API Documentation\n主要接口:\n- GET /users\n- POST /users\n- PUT /users/:id',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('WebFetch')).toBeInTheDocument();
      expect(screen.getByText('URL:')).toBeInTheDocument();
      
      // 验证URL是可点击的链接
      const urlLink = screen.getByRole('link', { name: 'https://example.com/api/docs' });
      expect(urlLink).toBeInTheDocument();
      expect(urlLink).toHaveAttribute('href', 'https://example.com/api/docs');
      expect(urlLink).toHaveAttribute('target', '_blank');

      expect(screen.getByText('分析提示:')).toBeInTheDocument();
      expect(screen.getByText('提取API文档中的主要接口信息和使用示例')).toBeInTheDocument();
      expect(screen.getByText('网页分析结果:')).toBeInTheDocument();
    });
  });

  describe('TodoWrite Tool', () => {
    it('renders todowrite tool with todo items and statistics', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'TodoWrite',
        toolInput: {
          todos: [
            {
              id: '1',
              content: '完成用户界面设计',
              status: 'completed' as const,
              priority: 'high' as const,
            },
            {
              id: '2',
              content: '编写单元测试',
              status: 'in_progress' as const,
              priority: 'medium' as const,
            },
            {
              id: '3',
              content: '部署到生产环境',
              status: 'pending' as const,
              priority: 'low' as const,
            },
          ],
        },
        toolResult: 'Todo list updated successfully',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('TodoWrite')).toBeInTheDocument();
      expect(screen.getByText('待办事项列表 (3 项):')).toBeInTheDocument();

      // 验证待办事项内容
      expect(screen.getByText('完成用户界面设计')).toBeInTheDocument();
      expect(screen.getByText('编写单元测试')).toBeInTheDocument();
      expect(screen.getByText('部署到生产环境')).toBeInTheDocument();

      // 验证优先级标签
      expect(screen.getByText('高优先级')).toBeInTheDocument();
      expect(screen.getByText('中优先级')).toBeInTheDocument();
      expect(screen.getByText('低优先级')).toBeInTheDocument();

      // 验证状态
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('进行中')).toBeInTheDocument();
      expect(screen.getByText('待处理')).toBeInTheDocument();

      // 验证统计信息
      expect(screen.getByText('已完成: 1')).toBeInTheDocument();
      expect(screen.getByText('进行中: 1')).toBeInTheDocument();
      expect(screen.getByText('待处理: 1')).toBeInTheDocument();
    });
  });

  describe('WebSearch Tool', () => {
    it('renders websearch tool with domain filters', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'WebSearch',
        toolInput: {
          query: 'React TypeScript best practices',
          allowed_domains: ['stackoverflow.com', 'github.com'],
          blocked_domains: ['spam-site.com', 'low-quality.org'],
        },
        toolResult: '找到相关结果:\n1. React TypeScript Guide - stackoverflow.com\n2. Best Practices Repository - github.com',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('WebSearch')).toBeInTheDocument();
      expect(screen.getByText('搜索查询:')).toBeInTheDocument();
      expect(screen.getByText('React TypeScript best practices')).toBeInTheDocument();

      // 验证域名过滤标签
      expect(screen.getByText('允许域名:')).toBeInTheDocument();
      expect(screen.getByText('stackoverflow.com')).toBeInTheDocument();
      expect(screen.getByText('github.com')).toBeInTheDocument();

      expect(screen.getByText('屏蔽域名:')).toBeInTheDocument();
      expect(screen.getByText('spam-site.com')).toBeInTheDocument();
      expect(screen.getByText('low-quality.org')).toBeInTheDocument();

      expect(screen.getByText('搜索结果:')).toBeInTheDocument();
    });
  });

  describe('Notebook Tools', () => {
    it('renders notebook read tool', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'NotebookRead',
        toolInput: {
          notebook_path: '/Users/project/analysis.ipynb',
          cell_id: 'cell_123',
        },
        toolResult: 'Cell type: code\nSource: print("Hello World")',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('NotebookRead')).toBeInTheDocument();
      expect(screen.getByText('Notebook 路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/project/analysis.ipynb')).toBeInTheDocument();
      expect(screen.getByText('单元格 ID:')).toBeInTheDocument();
      expect(screen.getByText('cell_123')).toBeInTheDocument();
    });

    it('renders notebook edit tool with mode tags', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'NotebookEdit',
        toolInput: {
          notebook_path: '/Users/project/analysis.ipynb',
          new_source: 'print("Updated content")\nprint("Second line")',
          cell_type: 'code' as const,
          edit_mode: 'replace' as const,
        },
        toolResult: 'Cell updated successfully',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('NotebookEdit')).toBeInTheDocument();
      expect(screen.getByText('替换')).toBeInTheDocument();
      expect(screen.getByText('代码')).toBeInTheDocument();
      expect(screen.getByText('新内容:')).toBeInTheDocument();
      expect(screen.getByText(/print\("Updated content"\)/)).toBeInTheDocument();
    });
  });

  describe('Exit Plan Mode Tool', () => {
    it('renders exit plan mode tool with plan content', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'exit_plan_mode',
        toolInput: {
          plan: '实施计划:\n1. 创建React组件文件\n2. 编写TypeScript接口\n3. 添加样式和测试\n4. 集成到主应用中',
        },
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('exit_plan_mode')).toBeInTheDocument();
      expect(screen.getByText('实施计划:')).toBeInTheDocument();
      expect(screen.getByText(/1. 创建React组件文件/)).toBeInTheDocument();
      expect(screen.getByText('📋 计划模式已退出，准备开始实施')).toBeInTheDocument();
    });
  });

  describe('Unknown Tool', () => {
    it('renders unknown tool with fallback display', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'UnknownTool',
        toolInput: {
          customParam: 'custom value',
          anotherParam: 123,
        },
        toolResult: 'Unknown tool executed',
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      expect(screen.getByText('UnknownTool')).toBeInTheDocument();
      expect(screen.getByText('未知工具类型')).toBeInTheDocument();
      expect(screen.getByText(/"customParam": "custom value"/)).toBeInTheDocument();
      expect(screen.getByText(/"anotherParam": 123/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when tool is executing', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Bash',
        toolInput: { command: 'long-running-command' },
        isExecuting: true,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      // 检查是否有旋转的加载图标
      const loadingIcon = document.querySelector('.animate-spin');
      expect(loadingIcon).toBeInTheDocument();
      expect(screen.getByText('执行中...')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('displays error state correctly for all tools', () => {
      const toolNames = [
        'Task', 'Bash', 'Glob', 'Grep', 'LS', 'exit_plan_mode',
        'Read', 'Edit', 'MultiEdit', 'Write', 'NotebookRead',
        'NotebookEdit', 'WebFetch', 'TodoWrite', 'WebSearch'
      ];

      toolNames.forEach((toolName) => {
        const execution: ToolExecution = {
          ...baseExecution,
          id: `error-${toolName}`,
          toolName,
          toolInput: { testParam: 'test' },
          toolResult: `Error in ${toolName}: Something went wrong`,
          isExecuting: false,
          isError: true,
        };

        const { unmount } = render(<ToolRenderer execution={execution} />);

        expect(screen.getByText(toolName)).toBeInTheDocument();
        expect(screen.getByText('已完成 - 错误')).toBeInTheDocument();
        expect(screen.getByText('执行错误')).toBeInTheDocument();
        expect(screen.getByText(`Error in ${toolName}: Something went wrong`)).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility attributes', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'WebFetch',
        toolInput: {
          url: 'https://example.com',
          prompt: 'Test prompt',
        },
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      // 验证链接有正确的accessibility属性
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('Content Truncation', () => {
    it('truncates long content appropriately', () => {
      const longPrompt = 'This is a very long prompt that should be truncated when displayed in the UI. '.repeat(20);
      
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Task',
        toolInput: {
          description: 'Test task',
          prompt: longPrompt,
        },
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      // 验证长内容被截断
      expect(screen.getByText(/...\(已截断\)/)).toBeInTheDocument();
      expect(screen.getByText(`总长度: ${longPrompt.length} 字符`)).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('applies responsive classes correctly', () => {
      const execution: ToolExecution = {
        ...baseExecution,
        toolName: 'Edit',
        toolInput: {
          file_path: '/test.txt',
          old_string: 'old',
          new_string: 'new',
        },
        isExecuting: false,
        isError: false,
      };

      render(<ToolRenderer execution={execution} />);

      // 验证响应式布局类存在
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    });
  });
});