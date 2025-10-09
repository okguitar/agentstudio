import { ClaudeVersion } from '@agentstudio/shared/types/claude-versions';

/**
 * 根据Claude版本配置生成可执行的终端命令
 * @param version Claude版本配置
 * @returns 生成的终端命令字符串
 */
export function generateClaudeCommand(version: ClaudeVersion): string {
  const envVars = version.environmentVariables || {};
  const executablePath = version.executablePath || 'claude';
  
  // 构建环境变量部分
  const envVarParts: string[] = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      // 如果值包含空格或特殊字符，需要用引号包围
      const escapedValue = value.includes(' ') || value.includes('"') || value.includes("'") 
        ? `"${value.replace(/"/g, '\\"')}"` 
        : value;
      envVarParts.push(`${key}=${escapedValue}`);
    }
  }
  
  // 组装完整命令
  const parts: string[] = [];
  
  // 添加环境变量
  if (envVarParts.length > 0) {
    parts.push(envVarParts.join(' '));
  }
  
  // 添加可执行文件路径
  // 如果路径包含空格，需要用引号包围
  const escapedPath = executablePath.includes(' ') 
    ? `"${executablePath}"` 
    : executablePath;
  parts.push(escapedPath);
  
  return parts.join(' ');
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean> 复制是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // 现代浏览器使用 Clipboard API
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 回退到传统方法
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
