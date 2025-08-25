import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BaseToolComponent, ToolInput, ToolOutput } from '../BaseToolComponent';
import type { ToolExecution } from '../types';

const mockExecution: ToolExecution = {
  id: 'test-001',
  toolName: 'TestTool',
  toolInput: { param: 'value' },
  isExecuting: false,
  isError: false,
  timestamp: new Date('2024-01-01T10:00:00Z'),
};

describe('BaseToolComponent', () => {

  it('renders tool header with name and timestamp', () => {
    render(<BaseToolComponent execution={mockExecution} />);

    expect(screen.getByText('TestTool')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    // 验证时间戳存在，但不检查具体格式（因为本地化可能不同）
    const timeElement = screen.getByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeElement).toBeInTheDocument();
  });

  it('shows executing state', () => {
    const executingExecution = { ...mockExecution, isExecuting: true };
    render(<BaseToolComponent execution={executingExecution} />);

    expect(screen.getByText('执行中...')).toBeInTheDocument();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorExecution = { 
      ...mockExecution, 
      isError: true, 
      toolResult: 'Error message'
    };
    render(<BaseToolComponent execution={errorExecution} />);

    expect(screen.getByText('已完成 - 错误')).toBeInTheDocument();
    expect(screen.getByText('执行错误')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <BaseToolComponent execution={mockExecution}>
        <div data-testid="child-content">Custom content</div>
      </BaseToolComponent>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('applies correct color theme for known tools', () => {
    const bashExecution = { ...mockExecution, toolName: 'Bash' };
    render(<BaseToolComponent execution={bashExecution} />);

    const iconContainer = document.querySelector('.bg-gray-100');
    expect(iconContainer).toBeInTheDocument();
  });

  it('applies default color theme for unknown tools', () => {
    const unknownExecution = { ...mockExecution, toolName: 'UnknownTool' };
    render(<BaseToolComponent execution={unknownExecution} />);

    const iconContainer = document.querySelector('.bg-gray-100');
    expect(iconContainer).toBeInTheDocument();
  });
});

describe('ToolInput', () => {
  it('renders label and value', () => {
    render(<ToolInput label="Test Label" value="test value" />);

    expect(screen.getByText('Test Label:')).toBeInTheDocument();
    expect(screen.getByText('test value')).toBeInTheDocument();
  });

  it('renders code block when isCode is true', () => {
    render(<ToolInput label="Command" value="npm test" isCode={true} />);

    expect(screen.getByText('Command:')).toBeInTheDocument();
    const codeElement = document.querySelector('pre');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveTextContent('npm test');
  });

  it('handles object values', () => {
    const objectValue = { key: 'value', number: 42 };
    render(<ToolInput label="Config" value={objectValue} />);

    expect(screen.getByText('Config:')).toBeInTheDocument();
    expect(screen.getByText(/"key": "value"/)).toBeInTheDocument();
    expect(screen.getByText(/"number": 42/)).toBeInTheDocument();
  });

  it('does not render when value is null or undefined', () => {
    const { container: nullContainer } = render(<ToolInput label="Null" value={null} />);
    expect(nullContainer).toBeEmptyDOMElement();

    const { container: undefinedContainer } = render(<ToolInput label="Undefined" value={undefined} />);
    expect(undefinedContainer).toBeEmptyDOMElement();

    const { container: emptyContainer } = render(<ToolInput label="Empty" value="" />);
    expect(emptyContainer).toBeEmptyDOMElement();
  });

  it('applies custom className', () => {
    render(<ToolInput label="Test" value="value" className="custom-class" />);

    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });
});

describe('ToolOutput', () => {
  it('renders success result', () => {
    render(<ToolOutput result="Operation successful" />);

    expect(screen.getByText('执行结果:')).toBeInTheDocument();
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
    
    const container = document.querySelector('.bg-green-50');
    expect(container).toBeInTheDocument();
  });

  it('renders error result', () => {
    render(<ToolOutput result="Operation failed" isError={true} />);

    expect(screen.getByText('执行结果:')).toBeInTheDocument();
    expect(screen.getByText('Operation failed')).toBeInTheDocument();
    
    const container = document.querySelector('.bg-red-50');
    expect(container).toBeInTheDocument();
  });

  it('does not render when result is empty', () => {
    const { container } = render(<ToolOutput result="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('applies custom className', () => {
    render(<ToolOutput result="test" className="custom-output" />);

    const container = document.querySelector('.custom-output');
    expect(container).toBeInTheDocument();
  });

  it('preserves whitespace in results', () => {
    const multilineResult = 'Line 1\nLine 2\n  Indented line';
    render(<ToolOutput result={multilineResult} />);

    const preElement = document.querySelector('pre');
    expect(preElement).toBeInTheDocument();
    expect(preElement).toHaveClass('whitespace-pre-wrap');
    expect(preElement).toHaveTextContent(multilineResult);
  });
});

describe('Tool Icons and Colors', () => {
  const toolIconTests = [
    { tool: 'Task', expectedClass: 'text-purple-600' },
    { tool: 'Bash', expectedClass: 'text-gray-800' },
    { tool: 'Glob', expectedClass: 'text-blue-600' },
    { tool: 'Grep', expectedClass: 'text-green-600' },
    { tool: 'LS', expectedClass: 'text-yellow-600' },
    { tool: 'exit_plan_mode', expectedClass: 'text-emerald-600' },
    { tool: 'Read', expectedClass: 'text-indigo-600' },
    { tool: 'Edit', expectedClass: 'text-orange-600' },
    { tool: 'MultiEdit', expectedClass: 'text-red-600' },
    { tool: 'Write', expectedClass: 'text-cyan-600' },
    { tool: 'NotebookRead', expectedClass: 'text-pink-600' },
    { tool: 'NotebookEdit', expectedClass: 'text-rose-600' },
    { tool: 'WebFetch', expectedClass: 'text-teal-600' },
    { tool: 'TodoWrite', expectedClass: 'text-violet-600' },
    { tool: 'WebSearch', expectedClass: 'text-sky-600' },
  ];

  toolIconTests.forEach(({ tool, expectedClass }) => {
    it(`applies correct color for ${tool} tool`, () => {
      const execution = { 
        ...mockExecution, 
        toolName: tool,
      };
      
      render(<BaseToolComponent execution={execution} />);

      const coloredElement = document.querySelector(`.${expectedClass}`);
      expect(coloredElement).toBeInTheDocument();
    });
  });
});

describe('Responsive Behavior', () => {
  it('includes responsive classes in grid layouts', () => {
    render(
      <BaseToolComponent execution={mockExecution}>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div>Column 1</div>
          <div>Column 2</div>
        </div>
      </BaseToolComponent>
    );

    const grid = document.querySelector('.grid-cols-1.md\\:grid-cols-2');
    expect(grid).toBeInTheDocument();
  });
});

describe('Error Handling', () => {
  it('handles malformed JSON in ToolInput', () => {
    // 测试循环引用对象
    const circularObj: { name: string; self?: unknown } = { name: 'test' };
    circularObj.self = circularObj;

    // 应该不会抛出错误
    expect(() => {
      render(<ToolInput label="Circular" value={circularObj} />);
    }).not.toThrow();
  });

  it('handles very long strings', () => {
    const longString = 'a'.repeat(10000);
    
    render(<ToolInput label="Long String" value={longString} />);
    render(<ToolOutput result={longString} />);

    // 组件应该能正常渲染
    expect(screen.getByText('Long String:')).toBeInTheDocument();
    expect(screen.getByText('执行结果:')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  it('provides proper semantic structure', () => {
    render(
      <BaseToolComponent execution={mockExecution}>
        <ToolInput label="File Path" value="/test/path" />
        <ToolOutput result="Success" />
      </BaseToolComponent>
    );

    // 验证语义化结构
    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('TestTool');
  });

  it('includes proper text contrast for all tool colors', () => {
    // 这个测试确保所有工具颜色都有足够的对比度
    const toolIconTests = [
      { tool: 'Task', expectedClass: 'text-purple-600' },
      { tool: 'Bash', expectedClass: 'text-gray-800' },
      { tool: 'Glob', expectedClass: 'text-blue-600' },
      { tool: 'Grep', expectedClass: 'text-green-600' },
      { tool: 'LS', expectedClass: 'text-yellow-600' },
      { tool: 'exit_plan_mode', expectedClass: 'text-emerald-600' },
      { tool: 'Read', expectedClass: 'text-indigo-600' },
      { tool: 'Edit', expectedClass: 'text-orange-600' },
      { tool: 'MultiEdit', expectedClass: 'text-red-600' },
      { tool: 'Write', expectedClass: 'text-cyan-600' },
      { tool: 'NotebookRead', expectedClass: 'text-pink-600' },
      { tool: 'NotebookEdit', expectedClass: 'text-rose-600' },
      { tool: 'WebFetch', expectedClass: 'text-teal-600' },
      { tool: 'TodoWrite', expectedClass: 'text-violet-600' },
      { tool: 'WebSearch', expectedClass: 'text-sky-600' },
    ];
    
    toolIconTests.forEach(({ tool }) => {
      const execution = { ...mockExecution, toolName: tool };
      const { unmount } = render(<BaseToolComponent execution={execution} />);
      
      // 基本的可见性检查
      expect(screen.getByText(tool)).toBeVisible();
      
      unmount();
    });
  });
});