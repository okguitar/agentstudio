import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FileContentViewerProps {
  content: string;
  filePath?: string;
  className?: string;
}

// 文件扩展名到语言的映射
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'bash',
  '.ps1': 'powershell',
  '.sql': 'sql',
  '.html': 'html',
  '.htm': 'html',
  '.xml': 'xml',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.cfg': 'ini',
  '.conf': 'ini',
  '.dockerfile': 'dockerfile',
  '.docker': 'dockerfile',
  '.vim': 'vim',
  '.lua': 'lua',
  '.r': 'r',
  '.R': 'r',
  '.matlab': 'matlab',
  '.m': 'matlab',
  '.pl': 'perl',
  '.pm': 'perl',
  '.tex': 'latex',
  '.cls': 'latex',
  '.sty': 'latex',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdown': 'markdown',
  '.mkd': 'markdown',
  '.mdx': 'markdown',
  '.txt': 'text',
  '.log': 'text',
  '.gitignore': 'text',
  '.gitattributes': 'text',
  '.editorconfig': 'text',
  '.env': 'bash',
  '.env.example': 'bash',
  '.env.local': 'bash',
  '.env.production': 'bash',
  '.env.development': 'bash',
};

// 根据文件路径获取语言
function getLanguageFromFilePath(filePath: string): string {
  if (!filePath) return 'text';
  
  // 获取文件扩展名
  const extension = filePath.toLowerCase().match(/\.[^.]*$/)?.[0];
  if (extension && EXTENSION_TO_LANGUAGE[extension]) {
    return EXTENSION_TO_LANGUAGE[extension];
  }
  
  // 检查特殊文件名
  const fileName = filePath.toLowerCase().split('/').pop() || '';
  if (fileName.startsWith('.env')) {
    return 'bash';
  }
  if (fileName === 'dockerfile' || fileName === 'dockerfile.dev' || fileName === 'dockerfile.prod') {
    return 'dockerfile';
  }
  if (fileName === 'makefile' || fileName === 'makefile.am') {
    return 'makefile';
  }
  if (fileName === 'package.json' || fileName === 'tsconfig.json' || fileName === 'tslint.json') {
    return 'json';
  }
  
  return 'text';
}

export const FileContentViewer: React.FC<FileContentViewerProps> = ({ 
  content, 
  filePath = '', 
  className = '' 
}) => {
  const language = getLanguageFromFilePath(filePath);
  
  // 如果是 Markdown 文件，使用 ReactMarkdown 渲染
  if (language === 'markdown') {
    return (
      <div className={`bg-white border border-gray-200 rounded-md p-4 ${className}`}>
        <div className="text-xs font-medium text-gray-600 mb-3">
          文件内容 ({language})
        </div>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow as any}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-md text-sm overflow-auto"
                    wrapLines={true}
                    wrapLongLines={true}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }
  
  // 对于其他文件类型，使用语法高亮
  return (
    <div className={`bg-white border border-gray-200 rounded-md ${className}`}>
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-md">
        <div className="text-xs font-medium text-gray-600">
          文件内容 ({language})
        </div>
      </div>
      <div className="p-4">
        <SyntaxHighlighter
          language={language}
          style={tomorrow}
          customStyle={{
            margin: 0,
            background: 'transparent',
            fontSize: '14px',
          }}
          wrapLines={true}
          wrapLongLines={true}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#666',
            borderRight: '1px solid #ddd',
            marginRight: '1em',
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};