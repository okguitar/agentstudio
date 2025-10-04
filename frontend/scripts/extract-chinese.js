#!/usr/bin/env node

/**
 * 自动提取 React/TypeScript 文件中的中文字符串
 * 并生成 i18n 转换建议
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 中文字符正则
const CHINESE_REGEX = /[\u4e00-\u9fa5]/;

// 提取字符串中的中文文本（包括模板字符串、普通字符串）
function extractChineseStrings(content, filePath) {
  const results = [];

  // 匹配双引号字符串
  const doubleQuoteRegex = /"([^"]*[\u4e00-\u9fa5][^"]*)"/g;
  let match;
  while ((match = doubleQuoteRegex.exec(content)) !== null) {
    const text = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    results.push({
      text,
      line: lineNumber,
      type: 'string',
      original: match[0]
    });
  }

  // 匹配单引号字符串
  const singleQuoteRegex = /'([^']*[\u4e00-\u9fa5][^']*)'/g;
  while ((match = singleQuoteRegex.exec(content)) !== null) {
    const text = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    results.push({
      text,
      line: lineNumber,
      type: 'string',
      original: match[0]
    });
  }

  // 匹配反引号字符串（模板字符串）
  const templateRegex = /`([^`]*[\u4e00-\u9fa5][^`]*)`/g;
  while ((match = templateRegex.exec(content)) !== null) {
    const text = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    results.push({
      text,
      line: lineNumber,
      type: 'template',
      original: match[0]
    });
  }

  return results;
}

// 分析文件
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const strings = extractChineseStrings(content, filePath);

  return {
    filePath,
    count: strings.length,
    strings
  };
}

// 扫描目录
function scanDirectory(dir, pattern = /\.(tsx|ts|jsx|js)$/) {
  const results = [];

  function scan(currentDir) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // 跳过 node_modules, dist, build 等目录
        if (!['node_modules', 'dist', 'build', '.git', 'i18n'].includes(file)) {
          scan(fullPath);
        }
      } else if (pattern.test(file)) {
        const analysis = analyzeFile(fullPath);
        if (analysis.count > 0) {
          results.push(analysis);
        }
      }
    }
  }

  scan(dir);
  return results;
}

// 主函数
function main() {
  const srcDir = path.join(__dirname, '../src');
  console.log('📝 扫描中文字符串...\n');

  const results = scanDirectory(srcDir);

  // 按文件中文字符串数量排序
  results.sort((a, b) => b.count - a.count);

  console.log('📊 扫描结果：\n');
  console.log(`总文件数：${results.length}`);
  console.log(`总字符串数：${results.reduce((sum, r) => sum + r.count, 0)}\n`);

  console.log('🔝 优先级文件（按中文字符串数量排序）：\n');

  results.slice(0, 20).forEach((result, index) => {
    const relativePath = path.relative(srcDir, result.filePath);
    console.log(`${index + 1}. ${relativePath} (${result.count} 个中文字符串)`);
  });

  console.log('\n📋 详细信息已保存到 chinese-strings-report.json');

  // 保存详细报告
  const reportPath = path.join(__dirname, '../chinese-strings-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');

  // 生成待转换文件列表
  console.log('\n📝 生成待转换文件列表...');
  const todoFiles = results.map(r => ({
    file: path.relative(srcDir, r.filePath),
    count: r.count,
    priority: r.count > 50 ? 'HIGH' : r.count > 20 ? 'MEDIUM' : 'LOW'
  }));

  const todoPath = path.join(__dirname, '../i18n-todo.json');
  fs.writeFileSync(todoPath, JSON.stringify(todoFiles, null, 2), 'utf-8');
  console.log(`✅ 待转换文件列表已保存到 i18n-todo.json`);
}

main();
