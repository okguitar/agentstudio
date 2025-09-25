import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  getAllVersions, 
  getDefaultVersionId, 
  setDefaultVersion, 
  createVersion, 
  updateVersion, 
  deleteVersion, 
  initializeSystemVersion 
} from '../../../shared/utils/claudeVersionStorage';
import { ClaudeVersionCreate, ClaudeVersionUpdate } from '../../../shared/types/claude-versions';

const router = express.Router();
const execAsync = promisify(exec);

// Package manager detection and utilities
const detectPackageManagers = async () => {
  const managers = {
    npm: false,
    pnpm: false,
    yarn: false
  };

  // Check npm
  try {
    await execAsync('npm --version');
    managers.npm = true;
  } catch (error) {
    // npm not available
  }

  // Check pnpm
  try {
    await execAsync('pnpm --version');
    managers.pnpm = true;
  } catch (error) {
    // pnpm not available
  }

  // Check yarn
  try {
    await execAsync('yarn --version');
    managers.yarn = true;
  } catch (error) {
    // yarn not available
  }

  return managers;
};

// Detect which package manager installed Claude Code
const detectClaudeCodeInstallationSource = async () => {
  try {
    // Get Claude Code executable path
    const { stdout: claudePath } = await execAsync('which claude');
    if (!claudePath) return null;
    
    const cleanPath = claudePath.trim();
    console.log('Claude Code executable path:', cleanPath);
    
    // Skip local node_modules paths - we want global installation
    if (cleanPath.includes('node_modules/.bin')) {
      console.log('Skipping local node_modules path, looking for global installation');
      
      // Try to find global installation by checking PATH without local node_modules
      try {
        const { stdout: allClaudes } = await execAsync('which -a claude');
        const claudes = allClaudes.trim().split('\n');
        
        // Find the first non-local installation
        for (const claudePathOption of claudes) {
          if (!claudePathOption.includes('node_modules/.bin')) {
            console.log('Found global Claude installation:', claudePathOption);
            const globalPath = claudePathOption.trim();
            
            // Check for pnpm patterns
            if (globalPath.includes('/pnpm/') || globalPath.includes('pnpm')) {
              console.log('Detected pnpm installation from global path');
              return 'pnpm';
            }
            
            // Continue with other checks using this global path
            const cleanGlobalPath = globalPath;
            
            // Check for yarn patterns
            if (cleanGlobalPath.includes('/yarn/') || cleanGlobalPath.includes('yarn')) {
              console.log('Detected yarn installation from global path');
              return 'yarn';
            }
            
            // Check npm patterns
            try {
              const { stdout: npmPrefix } = await execAsync('npm config get prefix');
              if (cleanGlobalPath.startsWith(npmPrefix.trim())) {
                console.log('Detected npm installation from global path');
                return 'npm';
              }
            } catch (error) {
              // Ignore npm prefix error
            }
            
            break; // Use the first non-local path found
          }
        }
      } catch (error) {
        console.log('Could not find alternative Claude installations');
      }
    }
    
    // Check for pnpm patterns
    if (cleanPath.includes('/pnpm/') || cleanPath.includes('pnpm')) {
      console.log('Detected pnpm installation from path');
      return 'pnpm';
    }
    
    // Check for yarn patterns
    if (cleanPath.includes('/yarn/') || cleanPath.includes('yarn')) {
      return 'yarn';
    }
    
    // Check npm patterns - could be in node_modules or npm prefix
    try {
      const { stdout: npmPrefix } = await execAsync('npm config get prefix');
      if (cleanPath.startsWith(npmPrefix.trim())) {
        return 'npm';
      }
    } catch (error) {
      // Ignore npm prefix error
    }
    
    // Additional checks for npm global installation patterns
    if (cleanPath.includes('/node_modules/.bin/') || 
        cleanPath.includes('/npm/') ||
        cleanPath.includes('/.npm/')) {
      return 'npm';
    }
    
    // Fallback: check for the presence of Claude Code in different package managers' global directories
    const managers = await detectPackageManagers();
    
    // Check pnpm global directory
    if (managers.pnpm) {
      try {
        const { stdout: pnpmRoot } = await execAsync('pnpm root -g');
        const pnpmClaudePath = `${pnpmRoot.trim()}/@anthropic-ai/claude-code`;
        await execAsync(`test -d "${pnpmClaudePath}"`);
        return 'pnpm';
      } catch (error) {
        // Claude Code not found in pnpm global
      }
    }
    
    // Check yarn global directory
    if (managers.yarn) {
      try {
        const { stdout: yarnGlobalDir } = await execAsync('yarn global dir');
        const yarnClaudePath = `${yarnGlobalDir.trim()}/node_modules/@anthropic-ai/claude-code`;
        await execAsync(`test -d "${yarnClaudePath}"`);
        return 'yarn';
      } catch (error) {
        // Claude Code not found in yarn global
      }
    }
    
    // Check npm global directory
    if (managers.npm) {
      try {
        const { stdout: npmPrefix } = await execAsync('npm config get prefix');
        const npmClaudePath = `${npmPrefix.trim()}/lib/node_modules/@anthropic-ai/claude-code`;
        await execAsync(`test -d "${npmClaudePath}"`);
        return 'npm';
      } catch (error) {
        // Claude Code not found in npm global
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting Claude Code installation source:', error);
    return null;
  }
};

// Get preferred package manager for global installs
const getPreferredPackageManager = async () => {
  // First try to detect which package manager installed Claude Code
  const claudeInstallSource = await detectClaudeCodeInstallationSource();
  if (claudeInstallSource) {
    return claudeInstallSource;
  }
  
  // Fallback to priority order if detection fails
  const managers = await detectPackageManagers();
  if (managers.pnpm) return 'pnpm';
  if (managers.yarn) return 'yarn';
  if (managers.npm) return 'npm';
  
  return null;
};

// Get package manager version
const getPackageManagerVersion = async (manager: string) => {
  try {
    const { stdout } = await execAsync(`${manager} --version`);
    return stdout.trim();
  } catch (error) {
    return 'Not found';
  }
};

// Get user's home directory
const getUserHomeDir = () => homedir();
const getGlobalMemoryPath = () => join(getUserHomeDir(), '.claude', 'CLAUDE.md');

// GET /api/settings/global-memory - Read global memory file
router.get('/global-memory', async (req, res) => {
  try {
    const filePath = getGlobalMemoryPath();
    
    try {
      const content = await readFile(filePath, 'utf-8');
      res.type('text/plain').send(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty content
        res.type('text/plain').send('');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error reading global memory:', error);
    res.status(500).json({
      error: 'Failed to read global memory',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/settings/global-memory - Write global memory file
router.post('/global-memory', express.text({ type: 'text/plain' }), async (req, res) => {
  try {
    const content = req.body;
    
    if (typeof content !== 'string') {
      return res.status(400).json({
        error: 'Invalid content type',
        message: 'Content must be a string'
      });
    }

    const filePath = getGlobalMemoryPath();
    
    await writeFile(filePath, content, 'utf-8');
    
    res.json({
      success: true,
      message: 'Global memory saved successfully',
      filePath
    });
  } catch (error) {
    console.error('Error writing global memory:', error);
    res.status(500).json({
      error: 'Failed to save global memory',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/settings/global-memory/path - Get the path to the global memory file
router.get('/global-memory/path', (req, res) => {
  try {
    const filePath = getGlobalMemoryPath();
    res.json({
      path: filePath,
      homeDir: getUserHomeDir()
    });
  } catch (error) {
    console.error('Error getting global memory path:', error);
    res.status(500).json({
      error: 'Failed to get file path',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/settings/versions - Get version information for Claude Code, Node.js, and package managers
router.get('/versions', async (req, res) => {
  try {
    const availableManagers = await detectPackageManagers();
    const preferredManager = await getPreferredPackageManager();

    const claudeInstallSource = await detectClaudeCodeInstallationSource();
    
    const versions: any = {
      nodejs: null,
      packageManagers: {},
      preferredManager: preferredManager,
      claudeInstallSource: claudeInstallSource,
      claudeCode: null,
      lastChecked: new Date().toISOString()
    };

    // Get Node.js version
    try {
      const { stdout: nodeVersion } = await execAsync('node --version');
      versions.nodejs = nodeVersion.trim();
    } catch (error) {
      console.error('Failed to get Node.js version:', error);
      versions.nodejs = 'Not found';
    }

    // Get all available package manager versions
    for (const [manager, available] of Object.entries(availableManagers)) {
      if (available) {
        versions.packageManagers[manager] = await getPackageManagerVersion(manager);
      } else {
        versions.packageManagers[manager] = 'Not installed';
      }
    }

    // Get Claude Code version using the correct global path
    try {
      let claudeCommand = 'claude --version';
      
      // If we detected a specific installation source, try to use the correct path
      if (claudeInstallSource) {
        try {
          const { stdout: claudePath } = await execAsync('which claude');
          if (claudePath && claudePath.includes('node_modules/.bin')) {
            // We're getting the local version, try to find the global one
            const { stdout: allClaudes } = await execAsync('which -a claude');
            const claudes = allClaudes.trim().split('\n');
            
            for (const claudePathOption of claudes) {
              if (!claudePathOption.includes('node_modules/.bin')) {
                claudeCommand = `"${claudePathOption.trim()}" --version`;
                console.log('Using global Claude path for version:', claudePathOption.trim());
                break;
              }
            }
          }
        } catch (error) {
          // Fallback to default command
        }
      }
      
      const { stdout: claudeVersion } = await execAsync(claudeCommand);
      versions.claudeCode = claudeVersion.trim();
      console.log('Claude Code version detected:', claudeVersion.trim());
    } catch (error) {
      console.error('Failed to get Claude Code version:', error);
      versions.claudeCode = 'Not installed';
    }

    res.json(versions);
  } catch (error) {
    console.error('Error getting version information:', error);
    res.status(500).json({
      error: 'Failed to get version information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/settings/update-claude - Update Claude Code using preferred package manager
router.post('/update-claude', async (req, res) => {
  try {
    const preferredManager = await getPreferredPackageManager();
    
    if (!preferredManager) {
      return res.status(400).json({
        success: false,
        error: 'No package manager available',
        message: 'Please install npm, pnpm, or yarn to update Claude Code'
      });
    }

    // Different commands for different package managers
    let updateCommand: string;
    switch (preferredManager) {
      case 'pnpm':
        updateCommand = 'pnpm add -g @anthropic-ai/claude-code@latest';
        break;
      case 'yarn':
        updateCommand = 'yarn global add @anthropic-ai/claude-code@latest';
        break;
      case 'npm':
      default:
        updateCommand = 'npm update -g @anthropic-ai/claude-code';
        break;
    }

    console.log(`Updating Claude Code using ${preferredManager}: ${updateCommand}`);
    const { stdout, stderr } = await execAsync(updateCommand);
    
    res.json({
      success: true,
      message: `Claude Code update completed using ${preferredManager}`,
      packageManager: preferredManager,
      command: updateCommand,
      output: stdout,
      error: stderr || null
    });
  } catch (error: any) {
    console.error('Failed to update Claude Code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Claude Code',
      message: error.message,
      output: error.stdout || null,
      stderr: error.stderr || null
    });
  }
});

// Claude 版本管理 API

// GET /api/settings/claude-versions - 获取所有 Claude 版本
router.get('/claude-versions', async (req, res) => {
  try {
    // 首先确保系统版本存在
    try {
      const { stdout: claudePath } = await execAsync('which claude');
      if (claudePath) {
        await initializeSystemVersion(claudePath.trim());
      }
    } catch (error) {
      console.warn('No system claude found:', error);
    }
    
    const versions = await getAllVersions();
    const defaultVersionId = await getDefaultVersionId();
    
    res.json({
      versions,
      defaultVersionId
    });
  } catch (error) {
    console.error('Error getting Claude versions:', error);
    res.status(500).json({
      error: 'Failed to get Claude versions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/settings/claude-versions - 创建新的 Claude 版本
router.post('/claude-versions', async (req, res) => {
  try {
    const data: ClaudeVersionCreate = req.body;
    
    // 验证必填字段
    if (!data.name || !data.alias || !data.executablePath) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'name, alias, and executablePath are required'
      });
    }
    
    const version = await createVersion(data);
    res.json(version);
  } catch (error) {
    console.error('Error creating Claude version:', error);
    const status = error instanceof Error && error.message.includes('已存在') ? 409 : 500;
    res.status(status).json({
      error: 'Failed to create Claude version',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/settings/claude-versions/:id - 更新 Claude 版本
router.put('/claude-versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data: ClaudeVersionUpdate = req.body;
    
    const version = await updateVersion(id, data);
    res.json(version);
  } catch (error) {
    console.error('Error updating Claude version:', error);
    const status = error instanceof Error && (
      error.message.includes('不存在') || 
      error.message.includes('已存在') ||
      error.message.includes('不允许')
    ) ? 400 : 500;
    res.status(status).json({
      error: 'Failed to update Claude version',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/settings/claude-versions/:id - 删除 Claude 版本
router.delete('/claude-versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await deleteVersion(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting Claude version:', error);
    const status = error instanceof Error && (
      error.message.includes('不存在') || 
      error.message.includes('不允许')
    ) ? 400 : 500;
    res.status(status).json({
      error: 'Failed to delete Claude version',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/settings/claude-versions/:id/set-default - 设置默认版本
router.put('/claude-versions/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;
    
    await setDefaultVersion(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting default Claude version:', error);
    const status = error instanceof Error && error.message.includes('不存在') ? 400 : 500;
    res.status(status).json({
      error: 'Failed to set default Claude version',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
