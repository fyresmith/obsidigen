// obsidigen service commands - cross-platform

import chalk from 'chalk';
import ora from 'ora';
import { resolve, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir, platform } from 'os';
import { execSync } from 'child_process';
import { isInitialized, getVaultConfig } from '../config/vault.js';
import { 
  getGlobalDir, 
  registerVault, 
  unregisterVault, 
  getRegisteredVaults,
} from '../config/global.js';

// macOS (launchd) support
import {
  generatePlist,
  plistExists,
  writePlist,
  removePlist,
  loadService as loadLaunchdService,
  unloadService as unloadLaunchdService,
  isServiceLoaded as isLaunchdServiceLoaded,
  startService as startLaunchdService,
  stopService as stopLaunchdService,
  getServiceStatus as getLaunchdServiceStatus,
} from '../utils/plist.js';

// Linux (systemd) support
import {
  generateSystemdService,
  systemdServiceExists,
  writeSystemdService,
  removeSystemdService,
  enableSystemdService,
  disableSystemdService,
  startSystemdService,
  stopSystemdService,
  isSystemdServiceActive,
  isSystemdServiceEnabled,
  getSystemdServiceStatus,
  isSystemdAvailable,
} from '../utils/systemd.js';

type Platform = 'darwin' | 'linux' | 'unknown';

function getPlatform(): Platform {
  const p = platform();
  if (p === 'darwin') return 'darwin';
  if (p === 'linux') return 'linux';
  return 'unknown';
}

export async function serviceCommand(
  action: 'install' | 'remove' | 'start' | 'stop' | 'list'
): Promise<void> {
  const currentPlatform = getPlatform();
  
  if (currentPlatform === 'unknown') {
    console.log(chalk.red('✗ Unsupported platform'));
    console.log(chalk.gray('  Service management is only available on macOS and Linux'));
    process.exit(1);
  }
  
  if (currentPlatform === 'linux' && !isSystemdAvailable()) {
    console.log(chalk.red('✗ systemd not available'));
    console.log(chalk.gray('  Linux service management requires systemd'));
    process.exit(1);
  }
  
  switch (action) {
    case 'install':
      await handleInstall(currentPlatform);
      break;
    case 'remove':
      await handleRemove(currentPlatform);
      break;
    case 'start':
      await handleStart(currentPlatform);
      break;
    case 'stop':
      await handleStop(currentPlatform);
      break;
    case 'list':
      await handleList(currentPlatform);
      break;
  }
}

async function handleInstall(platform: Platform): Promise<void> {
  const vaultPath = resolve(process.cwd());
  
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized'));
    console.log(chalk.gray('  Run `obsidigen init` first'));
    process.exit(1);
  }
  
  const vaultConfig = getVaultConfig(vaultPath);
  if (!vaultConfig) {
    console.log(chalk.red('✗ Could not read vault configuration'));
    process.exit(1);
  }
  
  console.log(chalk.bold('\nRegistering vault with boot service\n'));
  
  const spinner = ora('Installing service...').start();
  
  try {
    // Register vault in global config
    registerVault({
      path: vaultPath,
      name: vaultConfig.name,
      port: vaultConfig.port,
      autostart: true,
    });
    
    // Find obsidigen binary
    const obsidigenPath = getObsidigenPath();
    
    if (platform === 'darwin') {
      await installMacOSService(obsidigenPath);
    } else if (platform === 'linux') {
      await installLinuxService(obsidigenPath);
    }
    
    spinner.succeed('Service installed');
    
    console.log('');
    console.log(chalk.green('✓ Vault registered for autostart'));
    console.log(`  Name: ${chalk.cyan(vaultConfig.name)}`);
    console.log(`  Path: ${chalk.gray(vaultPath)}`);
    console.log(`  Port: ${chalk.cyan(vaultConfig.port.toString())}`);
    console.log('');
    console.log('The service will start automatically on login.');
    console.log(`To start now: ${chalk.cyan('obsidigen service start')}`);
    console.log('');
    
  } catch (error) {
    spinner.fail('Failed to install service');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function installMacOSService(obsidigenPath: string): Promise<void> {
  // Ensure LaunchAgents directory exists
  const launchAgentsDir = join(homedir(), 'Library', 'LaunchAgents');
  if (!existsSync(launchAgentsDir)) {
    mkdirSync(launchAgentsDir, { recursive: true });
  }
  
  // Generate and write plist
  const plist = generatePlist({
    label: 'com.obsidigen.daemon',
    program: obsidigenPath,
    programArguments: [obsidigenPath, 'daemon'],
    runAtLoad: true,
    keepAlive: true,
    standardOutPath: join(getGlobalDir(), 'daemon.log'),
    standardErrorPath: join(getGlobalDir(), 'daemon.error.log'),
    workingDirectory: homedir(),
  });
  
  writePlist(plist);
  
  // Load the service
  if (isLaunchdServiceLoaded()) {
    unloadLaunchdService();
  }
  loadLaunchdService();
}

async function installLinuxService(obsidigenPath: string): Promise<void> {
  // Generate systemd service
  const serviceContent = generateSystemdService({
    description: 'Obsidigen Wiki Daemon',
    execStart: `${obsidigenPath} daemon`,
    workingDirectory: homedir(),
    restart: 'on-failure',
    restartSec: 5,
  });
  
  writeSystemdService(serviceContent);
  enableSystemdService();
}

async function handleRemove(platform: Platform): Promise<void> {
  const vaultPath = resolve(process.cwd());
  
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized'));
    process.exit(1);
  }
  
  const spinner = ora('Removing from service...').start();
  
  try {
    // Unregister vault
    const removed = unregisterVault(vaultPath);
    
    if (!removed) {
      spinner.warn('Vault was not registered');
      return;
    }
    
    // Check if any vaults still registered
    const vaults = getRegisteredVaults();
    
    if (vaults.length === 0) {
      // No more vaults, remove the service entirely
      if (platform === 'darwin') {
        if (isLaunchdServiceLoaded()) {
          unloadLaunchdService();
        }
        removePlist();
      } else if (platform === 'linux') {
        if (isSystemdServiceActive()) {
          stopSystemdService();
        }
        disableSystemdService();
        removeSystemdService();
      }
      spinner.succeed('Service removed (no more vaults registered)');
    } else {
      spinner.succeed('Vault removed from service');
      console.log(chalk.gray(`  ${vaults.length} vault(s) still registered`));
    }
    
  } catch (error) {
    spinner.fail('Failed to remove from service');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function handleStart(platform: Platform): Promise<void> {
  const serviceExists = platform === 'darwin' ? plistExists() : systemdServiceExists();
  
  if (!serviceExists) {
    console.log(chalk.red('✗ Service not installed'));
    console.log(chalk.gray('  Run `obsidigen service install` first'));
    process.exit(1);
  }
  
  const spinner = ora('Starting service...').start();
  
  try {
    if (platform === 'darwin') {
      if (!isLaunchdServiceLoaded()) {
        loadLaunchdService();
      }
      startLaunchdService();
    } else if (platform === 'linux') {
      startSystemdService();
    }
    
    // Wait a moment and check status
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let isRunning = false;
    let pid: number | undefined;
    
    if (platform === 'darwin') {
      const status = getLaunchdServiceStatus();
      isRunning = status.running;
      pid = status.pid;
    } else {
      const status = getSystemdServiceStatus();
      isRunning = status.active;
      pid = status.pid;
    }
    
    if (isRunning) {
      spinner.succeed(`Service started${pid ? ` (PID: ${pid})` : ''}`);
      
      // Show registered vaults
      const vaults = getRegisteredVaults().filter(v => v.autostart);
      if (vaults.length > 0) {
        console.log('');
        console.log(chalk.bold('Running vaults:'));
        for (const vault of vaults) {
          console.log(`  ${chalk.cyan(vault.name)} - http://localhost:${vault.port}`);
        }
      }
    } else {
      spinner.warn('Service started but may not be running');
      const logPath = platform === 'darwin' 
        ? '~/.obsidigen/daemon.log' 
        : 'journalctl --user -u obsidigen-daemon';
      console.log(chalk.gray(`  Check logs: ${logPath}`));
    }
    
  } catch (error) {
    spinner.fail('Failed to start service');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function handleStop(platform: Platform): Promise<void> {
  const serviceExists = platform === 'darwin' ? plistExists() : systemdServiceExists();
  
  if (!serviceExists) {
    console.log(chalk.yellow('⚠ Service not installed'));
    return;
  }
  
  const spinner = ora('Stopping service...').start();
  
  try {
    if (platform === 'darwin') {
      stopLaunchdService();
    } else if (platform === 'linux') {
      stopSystemdService();
    }
    spinner.succeed('Service stopped');
  } catch (error) {
    spinner.fail('Failed to stop service');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
  }
}

async function handleList(platform: Platform): Promise<void> {
  let isRunning = false;
  let isLoaded = false;
  let pid: number | undefined;
  let enabled: boolean | undefined;
  
  if (platform === 'darwin') {
    const status = getLaunchdServiceStatus();
    isRunning = status.running;
    isLoaded = status.loaded;
    pid = status.pid;
  } else {
    const status = getSystemdServiceStatus();
    isRunning = status.active;
    isLoaded = status.loaded;
    pid = status.pid;
    enabled = status.enabled;
  }
  
  const vaults = getRegisteredVaults();
  
  console.log('');
  console.log(chalk.bold('Obsidigen Service'));
  console.log('');
  
  if (isLoaded) {
    console.log(`  Status:  ${isRunning ? chalk.green('● Running') : chalk.yellow('○ Stopped')}`);
    if (pid) {
      console.log(`  PID:     ${pid}`);
    }
    if (platform === 'linux' && enabled !== undefined) {
      console.log(`  Enabled: ${enabled ? 'Yes' : 'No'}`);
    }
  } else {
    console.log(`  Status:  ${chalk.gray('○ Not installed')}`);
  }
  
  console.log('');
  console.log(chalk.bold('Registered Vaults'));
  console.log('');
  
  if (vaults.length === 0) {
    console.log(chalk.gray('  No vaults registered'));
    console.log(chalk.gray('  Run `obsidigen service install` in a vault directory'));
  } else {
    for (const vault of vaults) {
      const statusIcon = vault.autostart ? chalk.green('●') : chalk.gray('○');
      console.log(`  ${statusIcon} ${chalk.cyan(vault.name)}`);
      console.log(`    Path: ${chalk.gray(vault.path)}`);
      console.log(`    Port: ${vault.port}`);
      console.log(`    Autostart: ${vault.autostart ? 'Yes' : 'No'}`);
      console.log('');
    }
  }
}

/**
 * Find the obsidigen binary path
 */
function getObsidigenPath(): string {
  try {
    const result = execSync('which obsidigen', { encoding: 'utf-8' });
    return result.trim();
  } catch {
    // Fallback to npm global path
    try {
      const npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
      const possiblePath = join(npmRoot, 'obsidigen', 'dist', 'cli.js');
      
      if (existsSync(possiblePath)) {
        return `${process.execPath} ${possiblePath}`;
      }
    } catch {
      // Ignore
    }
    
    // Last resort - use node to run from current location
    return `${process.execPath} ${process.argv[1]}`;
  }
}
