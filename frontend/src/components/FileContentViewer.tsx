import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  '.csv': 'csv',
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
  
  // 检测当前是否为暗色模式
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  // 对于所有文件类型，使用语法高亮显示源代码
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md ${className}`}>
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-t-md">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
          文件内容 ({language})
        </div>
      </div>
      <div className="p-4">
        <SyntaxHighlighter
          language={language}
          style={isDarkMode ? vscDarkPlus : tomorrow}
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
            color: isDarkMode ? '#9ca3af' : '#666',
            borderRight: isDarkMode ? '1px solid #4b5563' : '1px solid #ddd',
            marginRight: '1em',
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};