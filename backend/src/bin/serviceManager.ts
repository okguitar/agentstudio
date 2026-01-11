/**
 * System Service Manager for AgentStudio
 * 
 * Supports:
 * - macOS: launchd (~/Library/LaunchAgents)
 * - Linux: systemd user services (~/.config/systemd/user)
 * - Windows: Basic instructions (manual setup)
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, platform } from 'os';

// Service configuration
const SERVICE_NAME = 'agentstudio';
const SERVICE_DESCRIPTION = 'AgentStudio - AI Agent Workspace';
const DEFAULT_PORT = 4936;

interface ServiceConfig {
  port: number;
  dataDir: string;
  envFile?: string;
}

// Get the path to the agentstudio executable
function getExecutablePath(): string {
  // In npm global install, the executable is linked to node_modules/.bin
  // We need to find the actual installed location
  try {
    const result = spawnSync('which', ['agentstudio'], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
  } catch {
    // Fall back to npm prefix
  }

  try {
    const npmPrefix = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
    return join(npmPrefix, 'bin', 'agentstudio');
  } catch {
    // Fall back to current directory
    return 'agentstudio';
  }
}

// Get Node.js path
function getNodePath(): string {
  return process.execPath;
}

// =============================================================================
// macOS launchd Support
// =============================================================================

function getLaunchdPlistPath(): string {
  return join(homedir(), 'Library', 'LaunchAgents', `cc.${SERVICE_NAME}.plist`);
}

function generateLaunchdPlist(config: ServiceConfig): string {
  const execPath = getExecutablePath();
  const nodePath = getNodePath();
  const logDir = join(homedir(), '.agentstudio', 'logs');
  
  // Ensure log directory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>cc.${SERVICE_NAME}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${execPath}</string>
        <string>start</string>
        <string>--port</string>
        <string>${config.port}</string>
        <string>--data-dir</string>
        <string>${config.dataDir}</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>${join(logDir, 'stdout.log')}</string>
    
    <key>StandardErrorPath</key>
    <string>${join(logDir, 'stderr.log')}</string>
    
    <key>WorkingDirectory</key>
    <string>${homedir()}</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>${homedir()}</string>
    </dict>
</dict>
</plist>`;
}

function installMacOSService(config: ServiceConfig): void {
  const plistPath = getLaunchdPlistPath();
  const plistDir = dirname(plistPath);

  // Ensure directory exists
  if (!existsSync(plistDir)) {
    mkdirSync(plistDir, { recursive: true });
  }

  // Stop existing service if running
  try {
    execSync(`launchctl unload ${plistPath} 2>/dev/null`, { stdio: 'ignore' });
  } catch {
    // Service might not exist
  }

  // Write plist file
  const plistContent = generateLaunchdPlist(config);
  writeFileSync(plistPath, plistContent);
  console.log(`✅ Created service file: ${plistPath}`);

  // Load and start service
  try {
    execSync(`launchctl load ${plistPath}`);
    console.log('✅ Service loaded and started');
  } catch (error) {
    console.error('❌ Failed to load service:', error);
    throw error;
  }
}

function uninstallMacOSService(): void {
  const plistPath = getLaunchdPlistPath();

  if (existsSync(plistPath)) {
    try {
      execSync(`launchctl unload ${plistPath}`);
    } catch {
      // Service might not be loaded
    }
    unlinkSync(plistPath);
    console.log('✅ Service uninstalled');
  } else {
    console.log('ℹ️  Service is not installed');
  }
}

function macOSServiceAction(action: string): void {
  const plistPath = getLaunchdPlistPath();
  const serviceName = `cc.${SERVICE_NAME}`;

  switch (action) {
    case 'start':
      execSync(`launchctl load ${plistPath}`);
      console.log('✅ Service started');
      break;
    case 'stop':
      execSync(`launchctl unload ${plistPath}`);
      console.log('✅ Service stopped');
      break;
    case 'restart':
      try {
        execSync(`launchctl unload ${plistPath}`);
      } catch { /* ignore */ }
      execSync(`launchctl load ${plistPath}`);
      console.log('✅ Service restarted');
      break;
    case 'status':
      try {
        const result = execSync(`launchctl list | grep ${serviceName}`, { encoding: 'utf8' });
        if (result.includes(serviceName)) {
          console.log('✅ Service is running');
          console.log(result.trim());
        }
      } catch {
        console.log('⚪ Service is not running');
      }
      break;
    case 'logs':
      const logDir = join(homedir(), '.agentstudio', 'logs');
      const stdoutLog = join(logDir, 'stdout.log');
      const stderrLog = join(logDir, 'stderr.log');
      
      console.log('\n📋 Standard Output (last 50 lines):');
      if (existsSync(stdoutLog)) {
        try {
          execSync(`tail -50 "${stdoutLog}"`, { stdio: 'inherit' });
        } catch { /* ignore */ }
      } else {
        console.log('(no logs yet)');
      }
      
      console.log('\n📋 Standard Error (last 20 lines):');
      if (existsSync(stderrLog)) {
        try {
          execSync(`tail -20 "${stderrLog}"`, { stdio: 'inherit' });
        } catch { /* ignore */ }
      } else {
        console.log('(no errors)');
      }
      break;
  }
}

// =============================================================================
// Linux systemd Support
// =============================================================================

function getSystemdServicePath(): string {
  const systemdDir = join(homedir(), '.config', 'systemd', 'user');
  return join(systemdDir, `${SERVICE_NAME}.service`);
}

function generateSystemdService(config: ServiceConfig): string {
  const execPath = getExecutablePath();
  const nodePath = getNodePath();

  return `[Unit]
Description=${SERVICE_DESCRIPTION}
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${execPath} start --port ${config.port} --data-dir ${config.dataDir}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
Environment=HOME=${homedir()}
WorkingDirectory=${homedir()}

[Install]
WantedBy=default.target
`;
}

function installLinuxService(config: ServiceConfig): void {
  const servicePath = getSystemdServicePath();
  const serviceDir = dirname(servicePath);

  // Ensure directory exists
  if (!existsSync(serviceDir)) {
    mkdirSync(serviceDir, { recursive: true });
  }

  // Write service file
  const serviceContent = generateSystemdService(config);
  writeFileSync(servicePath, serviceContent);
  console.log(`✅ Created service file: ${servicePath}`);

  // Reload systemd and enable service
  try {
    execSync('systemctl --user daemon-reload');
    execSync(`systemctl --user enable ${SERVICE_NAME}`);
    execSync(`systemctl --user start ${SERVICE_NAME}`);
    console.log('✅ Service enabled and started');
  } catch (error) {
    console.error('❌ Failed to enable service:', error);
    throw error;
  }
}

function uninstallLinuxService(): void {
  const servicePath = getSystemdServicePath();

  try {
    execSync(`systemctl --user stop ${SERVICE_NAME}`);
    execSync(`systemctl --user disable ${SERVICE_NAME}`);
  } catch {
    // Service might not be running
  }

  if (existsSync(servicePath)) {
    unlinkSync(servicePath);
    execSync('systemctl --user daemon-reload');
    console.log('✅ Service uninstalled');
  } else {
    console.log('ℹ️  Service is not installed');
  }
}

function linuxServiceAction(action: string): void {
  switch (action) {
    case 'start':
      execSync(`systemctl --user start ${SERVICE_NAME}`);
      console.log('✅ Service started');
      break;
    case 'stop':
      execSync(`systemctl --user stop ${SERVICE_NAME}`);
      console.log('✅ Service stopped');
      break;
    case 'restart':
      execSync(`systemctl --user restart ${SERVICE_NAME}`);
      console.log('✅ Service restarted');
      break;
    case 'status':
      try {
        execSync(`systemctl --user status ${SERVICE_NAME}`, { stdio: 'inherit' });
      } catch {
        // Status command returns non-zero for stopped services
      }
      break;
    case 'logs':
      try {
        execSync(`journalctl --user -u ${SERVICE_NAME} -n 50 --no-pager`, { stdio: 'inherit' });
      } catch (error) {
        console.error('Failed to get logs:', error);
      }
      break;
  }
}

// =============================================================================
// Windows Support (basic instructions)
// =============================================================================

function installWindowsService(config: ServiceConfig): void {
  console.log('\n📘 Windows Service Installation\n');
  console.log('Windows service installation requires additional tools.');
  console.log('Here are your options:\n');

  console.log('Option 1: Use Task Scheduler (Recommended for personal use)');
  console.log('-----------------------------------------------------------');
  console.log('1. Open Task Scheduler (taskschd.msc)');
  console.log('2. Click "Create Basic Task"');
  console.log('3. Name: AgentStudio');
  console.log(`4. Trigger: "When the computer starts"`);
  console.log(`5. Action: Start a program`);
  console.log(`   Program: ${getNodePath()}`);
  console.log(`   Arguments: ${getExecutablePath()} start --port ${config.port}`);
  console.log(`   Start in: ${homedir()}\n`);

  console.log('Option 2: Use NSSM (Non-Sucking Service Manager)');
  console.log('------------------------------------------------');
  console.log('1. Download NSSM from https://nssm.cc/');
  console.log('2. Run: nssm install AgentStudio');
  console.log(`3. Path: ${getNodePath()}`);
  console.log(`4. Arguments: ${getExecutablePath()} start --port ${config.port}\n`);

  console.log('Option 3: Use pm2 (Cross-platform process manager)');
  console.log('--------------------------------------------------');
  console.log('npm install -g pm2');
  console.log(`pm2 start ${getExecutablePath()} -- start --port ${config.port}`);
  console.log('pm2 save');
  console.log('pm2 startup\n');
}

// =============================================================================
// Public API
// =============================================================================

export function installService(options: { port?: number; dataDir?: string } = {}): void {
  const config: ServiceConfig = {
    port: options.port || DEFAULT_PORT,
    dataDir: options.dataDir || join(homedir(), '.agentstudio'),
  };

  // Ensure data directory exists
  if (!existsSync(config.dataDir)) {
    mkdirSync(config.dataDir, { recursive: true });
  }

  console.log('\n🔧 Installing AgentStudio as system service...\n');
  console.log(`   Port: ${config.port}`);
  console.log(`   Data directory: ${config.dataDir}`);
  console.log('');

  const os = platform();

  switch (os) {
    case 'darwin':
      installMacOSService(config);
      break;
    case 'linux':
      installLinuxService(config);
      break;
    case 'win32':
      installWindowsService(config);
      return; // Don't print the success message for Windows
    default:
      console.error(`❌ Unsupported operating system: ${os}`);
      process.exit(1);
  }

  console.log('\n🎉 Installation complete!\n');
  console.log(`   Access AgentStudio at: http://localhost:${config.port}`);
  console.log('   Data stored in: ' + config.dataDir);
  console.log('\n   Manage the service with:');
  console.log('     agentstudio service status');
  console.log('     agentstudio service stop');
  console.log('     agentstudio service restart');
  console.log('     agentstudio service logs');
  console.log('');
}

export function uninstallService(): void {
  console.log('\n🔧 Uninstalling AgentStudio service...\n');

  const os = platform();

  switch (os) {
    case 'darwin':
      uninstallMacOSService();
      break;
    case 'linux':
      uninstallLinuxService();
      break;
    case 'win32':
      console.log('Please manually remove the service using Task Scheduler or NSSM.');
      return;
    default:
      console.error(`❌ Unsupported operating system: ${os}`);
      process.exit(1);
  }
}

export function serviceAction(action: string): void {
  const os = platform();

  const validActions = ['start', 'stop', 'restart', 'status', 'logs'];
  if (!validActions.includes(action)) {
    console.error(`❌ Unknown action: ${action}`);
    console.log('Valid actions: ' + validActions.join(', '));
    process.exit(1);
  }

  switch (os) {
    case 'darwin':
      macOSServiceAction(action);
      break;
    case 'linux':
      linuxServiceAction(action);
      break;
    case 'win32':
      console.log('Please use Task Scheduler or your installed service manager to manage the service.');
      break;
    default:
      console.error(`❌ Unsupported operating system: ${os}`);
      process.exit(1);
  }
}

export function isServiceInstalled(): boolean {
  const os = platform();

  switch (os) {
    case 'darwin':
      return existsSync(getLaunchdPlistPath());
    case 'linux':
      return existsSync(getSystemdServicePath());
    default:
      return false;
  }
}
