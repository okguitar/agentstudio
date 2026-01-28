import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_ENGINE, getSdkDir, getSdkDirName } from '../config/sdkConfig.js';

const router: RouterType = Router();

// NPM registry URL
const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const PACKAGE_NAME = 'agentstudio';

// Cache for version check results
let versionCache: {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  checkedAt: number;
} | null = null;

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache

/**
 * Get current package version from root package.json (agentstudio)
 * This is the version published to npm, so it's comparable with npm registry
 */
function getCurrentVersion(): string {
  // Priority: root package.json (agentstudio) - this is what's published to npm
  const possiblePaths = [
    // Dev mode: backend/src/routes -> root
    join(__dirname, '../../../../package.json'),
    // Dev mode alternate
    join(__dirname, '../../../package.json'),
    // npm package mode: dist/routes -> package root
    join(__dirname, '../../package.json'),
    // npm package mode alternate
    join(__dirname, '../package.json'),
  ];
  
  for (const packagePath of possiblePaths) {
    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      // Look for the root package (name: "agentstudio")
      if (packageJson.name === 'agentstudio' && packageJson.version) {
        return packageJson.version;
      }
    } catch {
      // Continue to next path
    }
  }
  
  // Fallback: try to find any package.json with a version
  for (const packagePath of possiblePaths) {
    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      if (packageJson.version) {
        console.warn(`[Version] Using fallback version from ${packagePath}`);
        return packageJson.version;
      }
    } catch {
      // Continue to next path
    }
  }
  
  console.warn('[Version] Could not read version from package.json');
  return '0.0.0';
}

/**
 * Compare two semver versions
 * Returns true if latest > current
 */
function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Fetch latest version from npm registry
 */
async function fetchLatestVersion(): Promise<string> {
  try {
    const response = await fetch(`${NPM_REGISTRY_URL}/${PACKAGE_NAME}/latest`);
    if (!response.ok) {
      throw new Error(`NPM registry returned ${response.status}`);
    }
    const data = await response.json() as { version?: string };
    return data.version || '0.0.0';
  } catch (error) {
    console.error('Failed to fetch latest version from npm:', error);
    throw error;
  }
}

/**
 * GET /api/version
 * Returns current version, latest version, and whether an update is available
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const currentVersion = getCurrentVersion();
    const now = Date.now();

    // Check cache
    if (versionCache && (now - versionCache.checkedAt) < CACHE_TTL) {
      // Update current version in case it changed
      versionCache.currentVersion = currentVersion;
      versionCache.hasUpdate = isNewerVersion(currentVersion, versionCache.latestVersion);
      return res.json(versionCache);
    }

    // Fetch from npm
    const latestVersion = await fetchLatestVersion();
    const hasUpdate = isNewerVersion(currentVersion, latestVersion);

    // Update cache
    versionCache = {
      currentVersion,
      latestVersion,
      hasUpdate,
      checkedAt: now,
    };

    res.json(versionCache);
  } catch (error) {
    // Return current version even if npm fetch fails
    const currentVersion = getCurrentVersion();
    res.json({
      currentVersion,
      latestVersion: null,
      hasUpdate: false,
      checkedAt: Date.now(),
      error: 'Failed to check for updates',
    });
  }
});

/**
 * POST /api/version/check
 * Force a fresh check, bypassing cache
 */
router.post('/check', async (_req: Request, res: Response) => {
  try {
    const currentVersion = getCurrentVersion();
    const latestVersion = await fetchLatestVersion();
    const hasUpdate = isNewerVersion(currentVersion, latestVersion);
    const now = Date.now();

    // Update cache
    versionCache = {
      currentVersion,
      latestVersion,
      hasUpdate,
      checkedAt: now,
    };

    res.json(versionCache);
  } catch (error) {
    const currentVersion = getCurrentVersion();
    res.status(500).json({
      currentVersion,
      latestVersion: null,
      hasUpdate: false,
      checkedAt: Date.now(),
      error: error instanceof Error ? error.message : 'Failed to check for updates',
    });
  }
});

/**
 * GET /api/version/info
 * Returns detailed system information
 */
router.get('/info', async (_req: Request, res: Response) => {
  try {
    const currentVersion = getCurrentVersion();
    
    // Try to get latest version from cache or fetch
    let latestVersion: string | null = null;
    let hasUpdate = false;
    
    if (versionCache && (Date.now() - versionCache.checkedAt) < CACHE_TTL) {
      latestVersion = versionCache.latestVersion;
      hasUpdate = isNewerVersion(currentVersion, latestVersion);
    } else {
      try {
        latestVersion = await fetchLatestVersion();
        hasUpdate = isNewerVersion(currentVersion, latestVersion);
        versionCache = {
          currentVersion,
          latestVersion,
          hasUpdate,
          checkedAt: Date.now(),
        };
      } catch {
        // Ignore fetch errors for info endpoint
      }
    }

    res.json({
      app: {
        name: 'AgentStudio',
        version: currentVersion,
        latestVersion,
        hasUpdate,
      },
      runtime: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      sdk: {
        engine: SDK_ENGINE,
        directory: getSdkDir(),
        dirName: getSdkDirName(),
      },
      links: {
        npm: `https://www.npmjs.com/package/${PACKAGE_NAME}`,
        github: 'https://github.com/okguitar/agentstudio',
        releases: 'https://github.com/okguitar/agentstudio/releases',
        changelog: 'https://github.com/okguitar/agentstudio/blob/main/CHANGELOG.md',
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get system info',
    });
  }
});

export default router;
