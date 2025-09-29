import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { ClaudeVersion, ClaudeVersionCreate, ClaudeVersionUpdate } from '../types/claude-versions';

const CLAUDE_AGENT_DIR = join(homedir(), '.claude-agent');
const VERSIONS_FILE = join(CLAUDE_AGENT_DIR, 'claude-versions.json');

interface VersionStorage {
  versions: ClaudeVersion[];
  defaultVersionId: string | null;
}

// 确保目录存在
async function ensureClaudeAgentDir() {
  try {
    await mkdir(CLAUDE_AGENT_DIR, { recursive: true });
  } catch (error) {
    // 忽略目录已存在的错误
  }
}

// 读取版本配置
export async function loadClaudeVersions(): Promise<VersionStorage> {
  await ensureClaudeAgentDir();
  
  try {
    const content = await readFile(VERSIONS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // 文件不存在或解析失败，返回默认配置
    return {
      versions: [],
      defaultVersionId: null
    };
  }
}

// 保存版本配置
export async function saveClaudeVersions(storage: VersionStorage): Promise<void> {
  await ensureClaudeAgentDir();
  
  const content = JSON.stringify(storage, null, 2);
  await writeFile(VERSIONS_FILE, content, 'utf-8');
}

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 获取所有版本
export async function getAllVersions(): Promise<ClaudeVersion[]> {
  const storage = await loadClaudeVersions();
  return storage.versions;
}

// 获取默认版本ID
export async function getDefaultVersionId(): Promise<string | null> {
  const storage = await loadClaudeVersions();
  return storage.defaultVersionId;
}

// 设置默认版本
export async function setDefaultVersion(versionId: string): Promise<void> {
  const storage = await loadClaudeVersions();
  
  // 检查版本是否存在
  const version = storage.versions.find(v => v.id === versionId);
  if (!version) {
    throw new Error('版本不存在');
  }
  
  storage.defaultVersionId = versionId;
  await saveClaudeVersions(storage);
}

// 创建新版本
export async function createVersion(data: ClaudeVersionCreate): Promise<ClaudeVersion> {
  const storage = await loadClaudeVersions();
  
  // 检查别名是否已存在
  const existingAlias = storage.versions.find(v => v.alias === data.alias);
  if (existingAlias) {
    throw new Error('别名已存在');
  }
  
  const now = new Date().toISOString();
  const newVersion: ClaudeVersion = {
    id: generateId(),
    name: data.name,
    alias: data.alias,
    description: data.description,
    executablePath: data.executablePath,
    isDefault: storage.versions.length === 0, // 第一个版本默认为默认版本
    isSystem: false,
    environmentVariables: data.environmentVariables || {},
    createdAt: now,
    updatedAt: now
  };
  
  storage.versions.push(newVersion);
  
  // 如果这是第一个版本，设置为默认版本
  if (storage.versions.length === 1) {
    storage.defaultVersionId = newVersion.id;
  }
  
  await saveClaudeVersions(storage);
  return newVersion;
}

// 更新版本
export async function updateVersion(versionId: string, data: ClaudeVersionUpdate): Promise<ClaudeVersion> {
  const storage = await loadClaudeVersions();
  
  const versionIndex = storage.versions.findIndex(v => v.id === versionId);
  if (versionIndex === -1) {
    throw new Error('版本不存在');
  }
  
  const version = storage.versions[versionIndex];
  
  // 检查别名冲突（如果修改了别名）
  if (data.alias && data.alias !== version.alias) {
    const existingAlias = storage.versions.find(v => v.alias === data.alias && v.id !== versionId);
    if (existingAlias) {
      throw new Error('别名已存在');
    }
  }
  
  // 不允许修改系统版本的某些属性
  if (version.isSystem) {
    if (data.executablePath && data.executablePath !== version.executablePath) {
      throw new Error('不允许修改系统版本的可执行路径');
    }
  }
  
  const updatedVersion: ClaudeVersion = {
    ...version,
    ...data,
    updatedAt: new Date().toISOString()
  };
  
  storage.versions[versionIndex] = updatedVersion;
  await saveClaudeVersions(storage);
  
  return updatedVersion;
}

// 删除版本
export async function deleteVersion(versionId: string): Promise<void> {
  const storage = await loadClaudeVersions();
  
  const versionIndex = storage.versions.findIndex(v => v.id === versionId);
  if (versionIndex === -1) {
    throw new Error('版本不存在');
  }
  
  const version = storage.versions[versionIndex];
  
  // 不允许删除系统版本
  if (version.isSystem) {
    throw new Error('不允许删除系统版本');
  }
  
  storage.versions.splice(versionIndex, 1);
  
  // 如果删除的是默认版本，选择一个新的默认版本
  if (storage.defaultVersionId === versionId) {
    storage.defaultVersionId = storage.versions.length > 0 ? storage.versions[0].id : null;
  }
  
  await saveClaudeVersions(storage);
}

// 初始化系统版本（在启动时调用）
export async function initializeSystemVersion(executablePath: string): Promise<ClaudeVersion> {
  const storage = await loadClaudeVersions();
  
  // 检查是否已存在系统版本
  let systemVersion = storage.versions.find(v => v.isSystem);
  
  if (systemVersion) {
    // 更新系统版本的路径（如果有变化）
    if (systemVersion.executablePath !== executablePath) {
      systemVersion.executablePath = executablePath;
      systemVersion.updatedAt = new Date().toISOString();
      await saveClaudeVersions(storage);
    }
    return systemVersion;
  }
  
  // 创建系统版本
  const now = new Date().toISOString();
  systemVersion = {
    id: 'system',
    name: 'System Claude',
    alias: 'system',
    description: '系统默认的 Claude Code 版本（通过 which claude 查找）',
    executablePath,
    isDefault: storage.versions.length === 0,
    isSystem: true,
    environmentVariables: {},
    createdAt: now,
    updatedAt: now
  };
  
  storage.versions.unshift(systemVersion); // 系统版本放在最前面
  
  // 如果这是第一个版本，设置为默认版本
  if (storage.versions.length === 1) {
    storage.defaultVersionId = systemVersion.id;
  }
  
  await saveClaudeVersions(storage);
  return systemVersion;
}
