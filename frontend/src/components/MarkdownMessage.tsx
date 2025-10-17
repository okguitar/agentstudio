import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from './MermaidDiagram';

interface MarkdownMessageProps {
  content: string;
  isUserMessage?: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, isUserMessage = false }) => {
  // 检测暗色模式
  const [isDark, setIsDark] = useState(false);

  // 为用户消息获取白色文字样式
  const getUserTextStyle = (defaultStyle: string) => {
    if (isUserMessage) {
      return 'text-white';
    }
    return defaultStyle;
  };

  useEffect(() => {
    // 检查初始主题
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // 监听主题变化
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="break-words overflow-wrap-anywhere word-break-break-all">
      <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';

          // 检测 Mermaid 代码块
          if (!inline && language === 'mermaid') {
            return <MermaidDiagram code={String(children).replace(/\n$/, '')} isDark={isDark} />;
          }

          return !inline && match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={language}
              PreTag="div"
              className="rounded-md text-sm overflow-auto"
              wrapLines={true}
              wrapLongLines={true}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        },
        h1: ({ children }) => (
          <h1 className={`text-lg font-bold mt-4 mb-2 ${getUserTextStyle('text-gray-900 dark:text-gray-100')}`}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className={`text-base font-bold mt-3 mb-2 ${getUserTextStyle('text-gray-900 dark:text-gray-100')}`}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className={`text-sm font-bold mt-2 mb-1 ${getUserTextStyle('text-gray-900 dark:text-gray-100')}`}>{children}</h3>
        ),
        p: ({ children }) => (
          <p className={`mb-2 leading-relaxed break-words overflow-wrap-anywhere ${getUserTextStyle('text-gray-800 dark:text-gray-200')}`}>{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className={`leading-relaxed break-words overflow-wrap-anywhere ${getUserTextStyle('text-gray-800 dark:text-gray-200')}`}>{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className={`border-l-4 border-gray-300 dark:border-gray-600 pl-3 italic mb-2 ${getUserTextStyle('text-gray-600 dark:text-gray-400')}`}>
            {children}
          </blockquote>
        ),
        strong: ({ children }) => (
          <strong className={`font-semibold ${getUserTextStyle('text-gray-900 dark:text-gray-100')}`}>{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        a: ({ children, href }) => (
          <a 
            href={href} 
            className="text-blue-600 hover:text-blue-800 underline" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <table className="border-collapse border border-gray-300 dark:border-gray-600 mb-2 text-sm">
            {children}
          </table>
        ),
        th: ({ children }) => (
          <th className={`border border-gray-300 dark:border-gray-600 px-2 py-1 bg-gray-100 dark:bg-gray-800 font-semibold text-left ${getUserTextStyle('text-gray-900 dark:text-gray-100')}`}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className={`border border-gray-300 dark:border-gray-600 px-2 py-1 ${getUserTextStyle('text-gray-800 dark:text-gray-200')}`}>{children}</td>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};