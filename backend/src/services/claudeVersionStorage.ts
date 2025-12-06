import { readFile, writeFile, mkdir } from 'fs/promises';
import { ClaudeVersion, ClaudeVersionCreate, ClaudeVersionUpdate, ModelConfig } from '../types/claude-versions';
import { CLAUDE_AGENT_DIR, CLAUDE_VERSIONS_FILE } from '../config/paths.js';

// 默认模型配置（用于Claude系统版本）
const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'sonnet',
    name: 'Sonnet',
    isVision: true,
    description: 'Claude 3.5 Sonnet - 平衡性能和成本的模型'
  },
  {
    id: 'opus',
    name: 'Opus',
    isVision: true,
    description: 'Claude 3 Opus - 最强大的模型'
  }
];

const VERSIONS_FILE = CLAUDE_VERSIONS_FILE;

interface VersionStorage {
  versions: ClaudeVersion[];
  defaultVersionId: string | null;
}

// 确保目录存在
async function ensureClaudeAgentDir() {
  try {
    await mkdir(CLAUDE_AGENT_DIR, { recursive: true });
  } catch {
    // 忽略目录已存在的错误
  }
}

// 数据迁移：为旧版本添加models字段
function migrateVersionData(storage: VersionStorage): VersionStorage {
  let needsSave = false;

  const migratedVersions = storage.versions.map(version => {
    // 如果版本没有models字段，添加默认模型
    if (!version.models || version.models.length === 0) {
      needsSave = true;
      return {
        ...version,
        models: DEFAULT_MODELS
      };
    }
    return version;
  });

  const result = {
    ...storage,
    versions: migratedVersions
  };
  
  // 标记是否需要保存
  (result as any)._needsSave = needsSave;
  
  return result;
}

// 读取版本配置
export async function loadClaudeVersions(): Promise<VersionStorage> {
  await ensureClaudeAgentDir();

  try {
    const content = await readFile(VERSIONS_FILE, 'utf-8');
    const storage = JSON.parse(content);

    // 执行数据迁移
    const migrated = migrateVersionData(storage);

    // 如果数据有变化，保存回文件
    if ((migrated as any)._needsSave) {
      delete (migrated as any)._needsSave;
      await saveClaudeVersions(migrated);
    }

    return migrated;
  } catch {
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

// 隐藏敏感环境变量（如ANTHROPIC_AUTH_TOKEN）
function hideSensitiveEnvVars(envVars: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(envVars)) {
    if (key === 'ANTHROPIC_AUTH_TOKEN') {
      // 藏头露尾：显示前4位和后4位，中间用***代替
      if (value && value.length > 8) {
        const start = value.substring(0, 4);
        const end = value.substring(value.length - 4);
        result[key] = `${start}***${end}`;
      } else {
        // 如果值太短，全部隐藏
        result[key] = '***';
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// 获取所有版本（隐藏敏感信息）
export async function getAllVersions(): Promise<ClaudeVersion[]> {
  const storage = await loadClaudeVersions();
  
  // 对每个版本隐藏敏感环境变量
  return storage.versions.map(version => ({
    ...version,
    environmentVariables: hideSensitiveEnvVars(version.environmentVariables || {})
  }));
}

// 获取所有版本（内部使用，不隐藏敏感信息）
export async function getAllVersionsInternal(): Promise<ClaudeVersion[]> {
  const storage = await loadClaudeVersions();
  
  // 返回原始版本信息，不隐藏敏感环境变量
  return storage.versions;
}

// 根据ID获取版本（内部使用，不隐藏敏感信息）
export async function getVersionByIdInternal(versionId: string): Promise<ClaudeVersion | null> {
  const storage = await loadClaudeVersions();
  
  // 返回原始版本信息，不隐藏敏感环境变量
  const version = storage.versions.find(v => v.id === versionId) || null;
  
  if (version) {
    console.log(`📦 Loaded version ${version.alias} (${versionId})`);
    const envVarKeys = Object.keys(version.environmentVariables || {});
    if (envVarKeys.length > 0) {
      console.log(`   Environment variables: ${envVarKeys.join(', ')}`);
    } else {
      console.log(`   No environment variables configured`);
    }
  } else {
    console.log(`⚠️ Version not found: ${versionId}`);
  }
  
  return version;
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
    models: data.models || DEFAULT_MODELS, // 使用提供的模型或默认模型
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
export async function updateVersion(versionId: string, data: ClaudeVersionUpdate & { authTokenChanged?: boolean }): Promise<ClaudeVersion> {
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
  
  // 合并更新数据，允许 undefined 值以便删除字段
  const updatedVersion: ClaudeVersion = {
    ...version,
    ...data,
    updatedAt: new Date().toISOString()
  };

  // 对于明确设置为 undefined 的可选字段，从对象中删除
  // 这样 JSON.stringify 就不会保存这些字段
  if (data.executablePath === undefined) {
    delete (updatedVersion as any).executablePath;
  }
  if (data.description === undefined) {
    delete (updatedVersion as any).description;
  }
  
  // 如果环境变量中有 ANTHROPIC_AUTH_TOKEN 且 authTokenChanged 为 false，
  // 则恢复原有的值（不更新）
  if (!data.authTokenChanged && data.environmentVariables?.ANTHROPIC_AUTH_TOKEN !== undefined) {
    // 保留原有的 ANTHROPIC_AUTH_TOKEN，不更新
    const originalToken = version.environmentVariables?.ANTHROPIC_AUTH_TOKEN || '';
    updatedVersion.environmentVariables = {
      ...data.environmentVariables,
      ANTHROPIC_AUTH_TOKEN: originalToken
    };
  }

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
    models: DEFAULT_MODELS, // 系统版本使用默认模型
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
