#!/usr/bin/env node
import { program } from 'commander';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { homedir } from 'os';
import { installService, uninstallService, serviceAction, isServiceInstalled } from './serviceManager.js';

// Read version from package.json (works in both dev and npm package mode)
const getVersion = (): string => {
  // Try npm package mode first (package.json in same directory as dist)
  const npmPackagePath = path.join(__dirname, '../package.json');
  // Then try development mode (root package.json)
  const devPackagePath = path.join(__dirname, '../../../package.json');
  
  try {
    if (existsSync(npmPackagePath)) {
      const packageJson = JSON.parse(readFileSync(npmPackagePath, 'utf8'));
      return packageJson.version || '0.1.0';
    }
    if (existsSync(devPackagePath)) {
      const packageJson = JSON.parse(readFileSync(devPackagePath, 'utf8'));
      return packageJson.version || '0.1.0';
    }
  } catch (error) {
    console.warn('Could not read version from package.json');
  }
  return '0.1.0';
};

const version = getVersion();

program
  .name('agentstudio')
  .description('AgentStudio - AI-powered agent workspace with Claude integration')
  .version(version);

// Start command - main entry point
program
  .command('start')
  .description('Start AgentStudio server')
  .option('-p, --port <port>', 'server port', '4936')
  .option('-H, --host <host>', 'server host', '0.0.0.0')
  .option('--api-only', 'start API server only (no frontend)')
  .option('--env <path>', 'path to .env file')
  .option('--data-dir <path>', 'data directory for agents, sessions, etc.')
  .option('--no-auth', 'disable authentication (development only)')
  .action(async (options) => {
    console.log('🚀 Starting AgentStudio...');
    console.log(`   Version: ${version}`);

    // Set environment variables
    process.env.PORT = options.port;
    process.env.HOST = options.host;

    if (options.env) {
      process.env.ENV_PATH = path.resolve(options.env);
      console.log(`   Config: ${process.env.ENV_PATH}`);
    }

    if (options.dataDir) {
      process.env.DATA_DIR = path.resolve(options.dataDir);
      console.log(`   Data dir: ${process.env.DATA_DIR}`);
    }

    if (options.noAuth) {
      process.env.NO_AUTH = 'true';
      console.log('   Auth: disabled');
    }

    if (options.apiOnly) {
      process.env.API_ONLY = 'true';
      console.log('   Mode: API only');
    } else {
      console.log('   Mode: Full (frontend + API)');
    }

    try {
      // Import and start the app
      const app = await import('../index.js');
      const expressApp = app.default;
      
      expressApp.listen(parseInt(options.port), options.host, () => {
        console.log('');
        console.log(`✅ AgentStudio is running!`);
        console.log(`   URL: http://${options.host === '0.0.0.0' ? 'localhost' : options.host}:${options.port}`);
        if (!options.apiOnly) {
          console.log(`   Open your browser to start using AgentStudio`);
        }
        console.log('');
        console.log('   Press Ctrl+C to stop');
      });
    } catch (error) {
      console.error('❌ Failed to start AgentStudio:', error);
      process.exit(1);
    }
  });

// Upgrade command - self-upgrade
program
  .command('upgrade')
  .description('Upgrade AgentStudio to the latest version')
  .option('--check', 'check for updates without installing')
  .action(async (options) => {
    console.log('🔄 Checking for updates...');

    try {
      // Get current and latest versions
      const currentVersion = version;
      let latestVersion: string;

      try {
        const result = execSync('npm view agentstudio version', { encoding: 'utf8' });
        latestVersion = result.trim();
      } catch {
        console.log('❌ Failed to check for updates. Please check your network connection.');
        process.exit(1);
      }

      console.log(`   Current version: ${currentVersion}`);
      console.log(`   Latest version:  ${latestVersion}`);

      if (currentVersion === latestVersion) {
        console.log('\n✅ You are already on the latest version!');
        return;
      }

      if (options.check) {
        console.log('\n📦 A new version is available!');
        console.log('   Run `agentstudio upgrade` to install.');
        return;
      }

      console.log('\n📦 Upgrading to the latest version...');
      
      // Detect package manager and upgrade
      const npmUserAgent = process.env.npm_config_user_agent || '';
      let upgradeCommand: string;

      if (npmUserAgent.includes('pnpm')) {
        upgradeCommand = 'pnpm add -g agentstudio@latest';
      } else if (npmUserAgent.includes('yarn')) {
        upgradeCommand = 'yarn global add agentstudio@latest';
      } else {
        upgradeCommand = 'npm install -g agentstudio@latest';
      }

      console.log(`   Running: ${upgradeCommand}`);
      
      const child = spawn(upgradeCommand, {
        shell: true,
        stdio: 'inherit',
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Upgrade completed successfully!');
          console.log('   Run `agentstudio start` to start the new version.');
        } else {
          console.log('\n❌ Upgrade failed. Please try manually:');
          console.log(`   ${upgradeCommand}`);
        }
      });
    } catch (error) {
      console.error('❌ Upgrade failed:', error);
      process.exit(1);
    }
  });

// Doctor command - system check
program
  .command('doctor')
  .description('Check system status and diagnose issues')
  .action(async () => {
    console.log('🩺 AgentStudio System Check\n');

    const checks: { name: string; status: 'ok' | 'warn' | 'error'; message: string }[] = [];

    // Check Node.js version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (nodeMajor >= 18) {
      checks.push({ name: 'Node.js', status: 'ok', message: `${nodeVersion} ✓` });
    } else {
      checks.push({ name: 'Node.js', status: 'error', message: `${nodeVersion} (requires >= 18.0.0)` });
    }

    // Check if Claude CLI is available
    try {
      const claudeVersion = execSync('claude --version', { encoding: 'utf8', timeout: 5000 }).trim();
      checks.push({ name: 'Claude CLI', status: 'ok', message: claudeVersion });
    } catch {
      checks.push({ name: 'Claude CLI', status: 'warn', message: 'Not found (optional, for advanced features)' });
    }

    // Check environment variables
    const envFile = path.resolve('.env');
    if (existsSync(envFile)) {
      checks.push({ name: 'Config file', status: 'ok', message: '.env found' });
    } else {
      checks.push({ name: 'Config file', status: 'warn', message: 'No .env file (using defaults)' });
    }

    // Check for API key
    if (process.env.ANTHROPIC_API_KEY) {
      checks.push({ name: 'API Key', status: 'ok', message: 'ANTHROPIC_API_KEY is set' });
    } else if (process.env.OPENAI_API_KEY) {
      checks.push({ name: 'API Key', status: 'ok', message: 'OPENAI_API_KEY is set' });
    } else {
      checks.push({ name: 'API Key', status: 'warn', message: 'No API key found in environment' });
    }

    // Print results
    let hasErrors = false;
    for (const check of checks) {
      const icon = check.status === 'ok' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`  ${icon} ${check.name}: ${check.message}`);
      if (check.status === 'error') hasErrors = true;
    }

    console.log('');
    if (hasErrors) {
      console.log('❌ Some issues were found. Please fix them before running AgentStudio.');
      process.exit(1);
    } else {
      console.log('✅ All checks passed! Run `agentstudio start` to begin.');
    }
  });

// Info command - show configuration
program
  .command('info')
  .description('Show AgentStudio information and paths')
  .action(() => {
    console.log('ℹ️  AgentStudio Information\n');
    console.log(`  Version:      ${version}`);
    console.log(`  Node.js:      ${process.version}`);
    console.log(`  Platform:     ${process.platform} ${process.arch}`);
    console.log(`  Install path: ${path.dirname(__dirname)}`);
    console.log(`  Working dir:  ${process.cwd()}`);
    console.log(`  Data dir:     ${path.join(homedir(), '.agentstudio')}`);
    
    // Check for frontend
    const embeddedFrontend = path.join(__dirname, '../public/index.html');
    if (existsSync(embeddedFrontend)) {
      console.log(`  Frontend:     Embedded ✓`);
    } else {
      console.log(`  Frontend:     Not found (API only mode)`);
    }

    // Check service status
    console.log(`  Service:      ${isServiceInstalled() ? 'Installed ✓' : 'Not installed'}`);
  });

// Install command - install as system service
program
  .command('install')
  .description('Install AgentStudio as a system service (auto-start on boot)')
  .option('-p, --port <port>', 'server port', '4936')
  .option('--data-dir <path>', 'data directory', path.join(homedir(), '.agentstudio'))
  .action((options) => {
    installService({
      port: parseInt(options.port),
      dataDir: options.dataDir,
    });
  });

// Uninstall command - remove system service
program
  .command('uninstall')
  .description('Uninstall AgentStudio system service')
  .action(() => {
    uninstallService();
  });

// Service command - manage the installed service
program
  .command('service <action>')
  .description('Manage AgentStudio service (start|stop|restart|status|logs)')
  .action((action) => {
    if (!isServiceInstalled()) {
      console.log('❌ Service is not installed.');
      console.log('   Run `agentstudio install` first.');
      process.exit(1);
    }
    serviceAction(action);
  });

program.parse();
