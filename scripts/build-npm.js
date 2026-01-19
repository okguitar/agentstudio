#!/usr/bin/env node
/**
 * NPM Package Build Script
 * 
 * This script builds the AgentStudio npm package by:
 * 1. Building the frontend with embedded API path
 * 2. Building the backend
 * 3. Copying frontend dist to backend's public directory
 * 4. Preparing the package for publishing
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, rmSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const frontendDir = join(rootDir, 'frontend');
const backendDir = join(rootDir, 'backend');
const frontendDist = join(frontendDir, 'dist');
const backendDist = join(backendDir, 'dist');
const publicDir = join(backendDist, 'public');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function step(name, fn) {
  log(`\n📦 ${name}...`, 'blue');
  try {
    fn();
    log(`✅ ${name} completed`, 'green');
  } catch (error) {
    log(`❌ ${name} failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const skipFrontend = args.includes('--skip-frontend');
const skipBackend = args.includes('--skip-backend');
const cleanOnly = args.includes('--clean');

// Main build process
async function main() {
  log('\n🚀 AgentStudio NPM Package Build', 'green');
  log('================================\n', 'green');

  // Step 0: Clean previous build
  step('Cleaning previous build', () => {
    if (existsSync(backendDist)) {
      rmSync(backendDist, { recursive: true, force: true });
      log('  Removed backend/dist', 'yellow');
    }
  });

  if (cleanOnly) {
    log('\n✨ Clean completed!', 'green');
    return;
  }

  // Step 1: Build frontend with embedded API path
  if (!skipFrontend) {
    step('Building frontend', () => {
      log('  Setting VITE_API_BASE=/api for embedded mode', 'yellow');
      execSync('pnpm run build', {
        cwd: frontendDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          VITE_API_BASE: '/api',
        },
      });
    });
  }

  // Step 2: Build backend
  if (!skipBackend) {
    step('Building backend', () => {
      execSync('pnpm run build', {
        cwd: backendDir,
        stdio: 'inherit',
      });
    });
  }

  // Step 3: Copy frontend dist to backend public directory
  step('Embedding frontend into backend', () => {
    if (!existsSync(frontendDist)) {
      throw new Error('Frontend dist not found. Run without --skip-frontend first.');
    }

    // Create public directory
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    // Copy frontend files
    cpSync(frontendDist, publicDir, { recursive: true });
    log(`  Copied frontend files to ${publicDir}`, 'yellow');
  });

  // Step 4: Copy necessary files to dist
  step('Preparing package files', () => {
    // Copy package.json (we'll create a special one for npm)
    const packageJson = JSON.parse(readFileSync(join(backendDir, 'package.json'), 'utf8'));
    
    // Read root package.json for version sync
    const rootPackageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    
    // Update for npm publishing
    const npmPackageJson = {
      ...packageJson,
      name: 'agentstudio',
      version: rootPackageJson.version,
      description: 'AgentStudio - AI-powered agent workspace with Claude integration. One command to start your AI agent studio.',
      main: 'index.js',
      bin: {
        agentstudio: 'bin/agentstudio.js',
      },
      scripts: {
        start: 'node index.js',
        postinstall: 'node scripts/postinstall.js || true',
      },
      files: [
        '**/*',
      ],
      keywords: [
        'ai',
        'agent',
        'studio',
        'claude',
        'anthropic',
        'mcp',
        'ai-assistant',
        'workspace',
        'cli',
      ],
      engines: {
        node: '>=20.0.0',
      },
      // Remove devDependencies for npm package
      devDependencies: undefined,
    };

    writeFileSync(
      join(backendDist, 'package.json'),
      JSON.stringify(npmPackageJson, null, 2)
    );
    log('  Created package.json for npm', 'yellow');

    // Create README for npm
    const npmReadme = `# AgentStudio

AI-powered agent workspace with Claude integration.

## Quick Start

\`\`\`bash
# Install globally
npm install -g agentstudio

# Start the server
agentstudio start

# Or specify a port
agentstudio start --port 8080
\`\`\`

## Commands

- \`agentstudio start\` - Start the full server (frontend + backend)
- \`agentstudio start --api-only\` - Start API server only (for CDN frontend mode)
- \`agentstudio start --port <port>\` - Specify server port (default: 4936)
- \`agentstudio upgrade\` - Upgrade to the latest version
- \`agentstudio --version\` - Show version
- \`agentstudio --help\` - Show help

## Environment Variables

Create a \`.env\` file in your working directory:

\`\`\`env
# Required: AI API Key
ANTHROPIC_API_KEY=your_api_key_here

# Optional: Custom port
PORT=4936

# Optional: Data directory
DATA_DIR=~/.agentstudio
\`\`\`

## Documentation

For full documentation, visit: https://github.com/okguitar/agentstudio

## License

MIT
`;

    writeFileSync(join(backendDist, 'README.md'), npmReadme);
    log('  Created README.md', 'yellow');

    // Create postinstall script
    const postinstallDir = join(backendDist, 'scripts');
    if (!existsSync(postinstallDir)) {
      mkdirSync(postinstallDir, { recursive: true });
    }

    const postinstallScript = `#!/usr/bin/env node
/**
 * Post-install script for AgentStudio npm package
 */
console.log('\\n🎉 AgentStudio installed successfully!');
console.log('\\nQuick start:');
console.log('  agentstudio start');
console.log('\\nFor help:');
console.log('  agentstudio --help');
console.log('');
`;

    writeFileSync(join(postinstallDir, 'postinstall.js'), postinstallScript);
    log('  Created postinstall script', 'yellow');
  });

  // Done!
  log('\n✨ Build completed successfully!', 'green');
  log('\nNext steps:', 'blue');
  log('  1. Test locally: cd backend/dist && node bin/agentstudio.js start', 'yellow');
  log('  2. Publish to npm: cd backend/dist && npm publish', 'yellow');
  log('');
}

main().catch((error) => {
  log(`\n❌ Build failed: ${error.message}`, 'red');
  process.exit(1);
});
