import {
  FaCss3Alt, FaHtml5, FaJsSquare,
  FaMarkdown, FaImage, FaPython, FaJava, FaFilePdf, FaFileWord, FaFile
} from 'react-icons/fa';
import { VscJson } from 'react-icons/vsc';
import { SiTypescript } from 'react-icons/si';

// 图标颜色配置
export const ICON_COLORS = {
  js: "#f7df1e",
  jsx: "#61dafb", 
  ts: "#3178c6",
  tsx: "#3178c6",
  css: "#1572b6",
  html: "#e34f26",
  htm: "#e34f26",
  json: "#f9d71c",
  jsonl: "#e6a23c", // JSONL 使用橙黄色区分于普通 JSON
  md: "#083fa1",
  csv: "#00a86b",
  pdf: "#d63031",
  ppt: "#d63031",
  pptx: "#d63031",
  ico: "#a9a9a9",
  png: "#a9a9a9",
  jpg: "#a9a9a9",
  jpeg: "#a9a9a9",
  gif: "#a9a9a9",
  svg: "#a9a9a9",
  webp: "#a9a9a9",
  py: "#3776ab",
  java: "#007396",
  default: "#6d8a9f"
} as const;

// 图标组件映射表
export const ICON_COMPONENTS = {
  js: FaJsSquare,
  jsx: FaJsSquare, // 使用 FaJsSquare 作为 jsx 的占位
  ts: SiTypescript,
  tsx: SiTypescript,
  css: FaCss3Alt,
  html: FaHtml5,
  htm: FaHtml5,
  json: VscJson,
  jsonl: VscJson, // JSONL 使用相同的 JSON 图标
  md: FaMarkdown,
  csv: FaFile,
  pdf: FaFilePdf,
  ppt: FaFileWord,
  pptx: FaFileWord,
  ico: FaImage,
  png: FaImage,
  jpg: FaImage,
  jpeg: FaImage,
  gif: FaImage,
  svg: FaImage,
  webp: FaImage,
  py: FaPython,
  java: FaJava,
  default: FaFile
} as const;

// 获取语言类型
export const getLanguageForFile = (fileName: string = ''): string => {
  // 特殊文件名处理
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName === 'dockerfile' || lowerFileName.startsWith('dockerfile.')) {
    return 'dockerfile';
  }

  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  switch (extension) {
    case 'js': case 'jsx': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'css': case 'scss': case 'sass': case 'less': return 'css';
    case 'json': case 'jsonl': return 'json';
    case 'html': case 'htm': return 'html';
    case 'md': case 'markdown': return 'markdown';
    case 'csv': return 'csv';
    case 'py': return 'python';
    case 'java': return 'java';
    case 'xml': return 'xml';
    case 'yaml': case 'yml': return 'yaml';
    case 'sh': case 'bash': return 'shell';
    case 'conf': case 'config': case 'ini': return 'ini';
    case 'nginx': return 'nginx';
    case 'sql': return 'sql';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'c': case 'cpp': case 'cc': case 'cxx': return 'cpp';
    case 'h': case 'hpp': return 'cpp';
    case 'cs': return 'csharp';
    case 'php': return 'php';
    case 'rb': return 'ruby';
    case 'swift': return 'swift';
    case 'kt': return 'kotlin';
    case 'dockerfile': return 'dockerfile';
    default: return 'plaintext';
  }
};

// 判断文件类型
export const getFileType = (fileName: string): 'text' | 'image' | 'binary' => {
  // 特殊文件名处理
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName === 'dockerfile' || lowerFileName.startsWith('dockerfile.')) {
    return 'text';
  }

  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  const textExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'sass', 'less',
    'html', 'htm', 'json', 'jsonl', 'md', 'markdown', 'txt',
    'py', 'java', 'xml', 'yaml', 'yml',
    'sh', 'bash', 'bat', 'cmd',
    'php', 'rb', 'go', 'rs',
    'cpp', 'c', 'h', 'hpp', 'cc', 'cxx',
    'cs', 'swift', 'kt', 'scala', 'clj',
    'sql', 'dockerfile', 'gitignore', 'env',
    'csv', 'tsv',
    'conf', 'config', 'ini', 'toml',
    'nginx', 'apache',
    'properties', 'cfg'
  ];

  const imageExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff'
  ];

  if (textExtensions.includes(extension)) return 'text';
  if (imageExtensions.includes(extension)) return 'image';
  return 'binary';
};

// 文件树项接口
export interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size: number | null;
  modified: string;
  isHidden: boolean;
  children?: FileTreeItem[];
}

// 标签页接口
export interface FileTab {
  id: string;
  name: string;
  path: string;
  isPinned: boolean; // 是否固定标签
  isActive: boolean; // 是否当前活跃
}