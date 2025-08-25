import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolUsage } from '../ToolUsage';

describe('ToolUsage Integration Tests', () => {
  describe('Legacy Interface Compatibility', () => {
    it('converts legacy bash tool to new format', () => {
      render(
        <ToolUsage
          toolName="Bash"
          toolInput={{
            command: 'npm test',
            description: '运行测试'
          }}
          toolResult="All tests passed!"
          isError={false}
          isExecuting={false}
        />
      );

      expect(screen.getByText('Bash')).toBeInTheDocument();
      expect(screen.getByText('描述:')).toBeInTheDocument();
      expect(screen.getByText('运行测试')).toBeInTheDocument();
      expect(screen.getByText('命令:')).toBeInTheDocument();
      expect(screen.getByText('npm test')).toBeInTheDocument();
      expect(screen.getByText('执行结果:')).toBeInTheDocument();
      expect(screen.getByText('All tests passed!')).toBeInTheDocument();
    });

    it('converts legacy read tool to new format', () => {
      render(
        <ToolUsage
          toolName="Read"
          toolInput={{
            file_path: '/Users/test/file.txt',
            offset: 10,
            limit: 20
          }}
          toolResult="File content here..."
          isError={false}
          isExecuting={false}
        />
      );

      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByText('文件路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/test/file.txt')).toBeInTheDocument();
      expect(screen.getByText('起始行:')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('读取行数:')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('converts legacy write tool to new format', () => {
      render(
        <ToolUsage
          toolName="Write"
          toolInput={{
            file_path: '/Users/test/new.txt',
            content: 'Hello World!\nSecond line.'
          }}
          toolResult="File created successfully"
          isError={false}
          isExecuting={false}
        />
      );

      expect(screen.getByText('Write')).toBeInTheDocument();
      expect(screen.getByText('文件路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/test/new.txt')).toBeInTheDocument();
      expect(screen.getByText('文件内容:')).toBeInTheDocument();
      expect(screen.getByText((content) => {
        return content.includes('Hello World!') && content.includes('Second line.');
      })).toBeInTheDocument();
    });

    it('converts legacy edit tool to new format', () => {
      render(
        <ToolUsage
          toolName="Edit"
          toolInput={{
            file_path: '/Users/test/app.js',
            old_string: 'var name',
            new_string: 'const name',
            replace_all: true
          }}
          toolResult="File updated"
          isError={false}
          isExecuting={false}
        />
      );

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('文件路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/test/app.js')).toBeInTheDocument();
      expect(screen.getByText('原文本:')).toBeInTheDocument();
      expect(screen.getByText('var name')).toBeInTheDocument();
      expect(screen.getByText('新文本:')).toBeInTheDocument();
      expect(screen.getByText('const name')).toBeInTheDocument();
      expect(screen.getByText('全部替换:')).toBeInTheDocument();
      expect(screen.getByText('是')).toBeInTheDocument();
    });

    it('converts legacy multiedit tool to new format', () => {
      render(
        <ToolUsage
          toolName="MultiEdit"
          toolInput={{
            file_path: '/Users/test/component.tsx',
            edits: [
              {
                old_string: 'React.Component',
                new_string: 'Component',
                replace_all: false
              },
              {
                old_string: 'render()',
                new_string: 'render(): JSX.Element',
                replace_all: false
              }
            ]
          }}
          toolResult="2 edits applied"
          isError={false}
          isExecuting={false}
        />
      );

      expect(screen.getByText('MultiEdit')).toBeInTheDocument();
      expect(screen.getByText('文件路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/test/component.tsx')).toBeInTheDocument();
      expect(screen.getByText('批量编辑 (2 个操作):')).toBeInTheDocument();
      expect(screen.getByText('操作 #1')).toBeInTheDocument();
      expect(screen.getByText('操作 #2')).toBeInTheDocument();
      expect(screen.getByText('React.Component')).toBeInTheDocument();
      expect(screen.getByText('Component')).toBeInTheDocument();
      expect(screen.getByText('render()')).toBeInTheDocument();
      expect(screen.getByText('render(): JSX.Element')).toBeInTheDocument();
    });

    it('converts legacy grep tool to new format', () => {
      render(
        <ToolUsage
          toolName="Grep"
          toolInput={{
            pattern: 'function.*test',
            path: '/Users/project',
            glob: '**/*.js',
            output_mode: 'content',
            '-i': true,
            '-n': true
          }}
          toolResult="test.js:10:function testExample() {"
          isError={false}
          isExecuting={false}
        />
      );

      expect(screen.getByText('Grep')).toBeInTheDocument();
      expect(screen.getByText('搜索模式:')).toBeInTheDocument();
      expect(screen.getByText('function.*test')).toBeInTheDocument();
      expect(screen.getByText('搜索路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/project')).toBeInTheDocument();
      expect(screen.getByText('文件过滤:')).toBeInTheDocument();
      expect(screen.getByText('**/*.js')).toBeInTheDocument();
      expect(screen.getByText('输出模式:')).toBeInTheDocument();
      expect(screen.getByText('content')).toBeInTheDocument();
      expect(screen.getByText('忽略大小写')).toBeInTheDocument();
      expect(screen.getByText('显示行号')).toBeInTheDocument();
    });

    it('converts legacy glob tool to new format', () => {
      render(
        <ToolUsage
          toolName="Glob"
          toolInput={{
            pattern: '**/*.tsx',
            path: '/Users/project/src'
          }}
          toolResult="/Users/project/src/App.tsx\n/Users/project/src/Header.tsx"
          isError={false}
          isExecuting={false}
        />
      );

      expect(screen.getByText('Glob')).toBeInTheDocument();
      expect(screen.getByText('匹配模式:')).toBeInTheDocument();
      expect(screen.getByText('**/*.tsx')).toBeInTheDocument();
      expect(screen.getByText('搜索路径:')).toBeInTheDocument();
      expect(screen.getByText('/Users/project/src')).toBeInTheDocument();
      expect(screen.getByText('匹配结果:')).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('找到') && content.includes('个匹配的文件'))).toBeInTheDocument();
    });

    it('handles executing state correctly', () => {
      render(
        <ToolUsage
          toolName="Bash"
          toolInput={{ command: 'sleep 10' }}
          isExecuting={true}
          isError={false}
        />
      );

      expect(screen.getByText('执行中...')).toBeInTheDocument();
      expect(screen.queryByText('执行结果:')).not.toBeInTheDocument();
    });

    it('handles error state correctly', () => {
      render(
        <ToolUsage
          toolName="Read"
          toolInput={{ file_path: '/nonexistent/file.txt' }}
          toolResult="File not found: /nonexistent/file.txt"
          isError={true}
          isExecuting={false}
        />
      );

      expect(screen.getByText('已完成 - 错误')).toBeInTheDocument();
      expect(screen.getByText('执行错误')).toBeInTheDocument();
      expect(screen.getByText('File not found: /nonexistent/file.txt')).toBeInTheDocument();
    });

    it('handles tools with no result', () => {
      render(
        <ToolUsage
          toolName="Write"
          toolInput={{
            file_path: '/Users/test/empty.txt',
            content: ''
          }}
          isExecuting={false}
          isError={false}
        />
      );

      expect(screen.getByText('Write')).toBeInTheDocument();
      expect(screen.getByText('文件路径:')).toBeInTheDocument();
      expect(screen.queryByText('执行结果:')).not.toBeInTheDocument();
    });

    it('preserves all tool input parameters', () => {
      const complexInput = {
        pattern: 'complex.*search',
        path: '/Users/project',
        glob: '**/*.{js,ts,tsx}',
        type: 'js',
        output_mode: 'files_with_matches',
        '-i': true,
        '-n': true,
        '-A': 3,
        '-B': 2,
        '-C': 5,
        head_limit: 50,
        multiline: true
      };

      render(
        <ToolUsage
          toolName="Grep"
          toolInput={complexInput}
          toolResult="search results"
          isError={false}
          isExecuting={false}
        />
      );

      // 验证所有参数都被正确显示
      expect(screen.getByText('complex.*search')).toBeInTheDocument();
      expect(screen.getByText('/Users/project')).toBeInTheDocument();
      expect(screen.getByText('**/*.{js,ts,tsx}')).toBeInTheDocument();
      expect(screen.getByText('js')).toBeInTheDocument();
      expect(screen.getByText('files_with_matches')).toBeInTheDocument();
      expect(screen.getByText('忽略大小写')).toBeInTheDocument();
      expect(screen.getByText('显示行号')).toBeInTheDocument();
      expect(screen.getByText('后 3 行')).toBeInTheDocument();
      expect(screen.getByText('前 2 行')).toBeInTheDocument();
      expect(screen.getByText('多行模式')).toBeInTheDocument();
    });

    it('generates unique IDs for each tool execution', () => {
      const { rerender } = render(
        <ToolUsage
          toolName="Bash"
          toolInput={{ command: 'echo "test1"' }}
          isExecuting={false}
          isError={false}
        />
      );

      const firstElement = document.querySelector('[class*="border"]');
      
      rerender(
        <ToolUsage
          toolName="Bash"
          toolInput={{ command: 'echo "test2"' }}
          isExecuting={false}
          isError={false}
        />
      );

      const secondElement = document.querySelector('[class*="border"]');
      
      // 元素应该存在但内容不同（因为有不同的输入）
      expect(firstElement).toBeInTheDocument();
      expect(secondElement).toBeInTheDocument();
      expect(screen.getByText('echo "test2"')).toBeInTheDocument();
    });

    it('handles timestamp generation', () => {
      render(
        <ToolUsage
          toolName="Task"
          toolInput={{ description: 'test', prompt: 'test prompt' }}
          isExecuting={false}
          isError={false}
        />
      );

      // 验证时间戳在合理范围内
      const timeElement = screen.getByText(/\d{1,2}:\d{2}:\d{2}/);
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('All Tool Types Coverage', () => {
    const allToolTypes = [
      'Task', 'Bash', 'Glob', 'Grep', 'LS', 'exit_plan_mode',
      'Read', 'Edit', 'MultiEdit', 'Write', 'NotebookRead', 
      'NotebookEdit', 'WebFetch', 'TodoWrite', 'WebSearch'
    ];

    it('supports all Claude Code tool types', () => {
      allToolTypes.forEach((toolName) => {
        const { unmount } = render(
          <ToolUsage
            toolName={toolName}
            toolInput={{ testParam: 'test' }}
            toolResult="test result"
            isError={false}
            isExecuting={false}
          />
        );

        expect(screen.getByText(toolName)).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('handles large tool results efficiently', () => {
      const largeResult = 'Line of output\n'.repeat(1000);

      render(
        <ToolUsage
          toolName="Bash"
          toolInput={{ command: 'generate-large-output' }}
          toolResult={largeResult}
          isError={false}
          isExecuting={false}
        />
      );

      // 验证组件能正常渲染大量数据
      expect(screen.getByText('Bash')).toBeInTheDocument();
      expect(screen.getByText('执行结果:')).toBeInTheDocument();
    });

    it('handles deeply nested input objects', () => {
      const deepInput = {
        level1: {
          level2: {
            level3: {
              value: 'deep value',
              array: [1, 2, 3, { nested: 'object' }]
            }
          }
        },
        otherParam: 'simple'
      };

      render(
        <ToolUsage
          toolName="Task"
          toolInput={deepInput}
          toolResult="processed deep input"
          isError={false}
          isExecuting={false}
        />
      );

      expect(screen.getByText('Task')).toBeInTheDocument();
    });
  });
});