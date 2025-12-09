// obsidigen service commands

import chalk from 'chalk';
import ora from 'ora';
import { resolve, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { isInitialized, getVaultConfig } from '../config/vault.js';
import { 
  getGlobalDir, 
  registerVault, 
  unregisterVault, 
  getRegisteredVaults,
  getGlobalConfig,
  saveGlobalConfig,
} from '../config/global.js';
import {
  generatePlist,
  getPlistPath,
  plistExists,
  writePlist,
  removePlist,
  loadService,
  unloadService,
  isServiceLoaded,
  startService,
  stopService,
  getServiceStatus,
} from '../utils/plist.js';

export async function serviceCommand(
  action: 'install' | 'remove' | 'start' | 'stop' | 'list'
): Promise<void> {
  switch (action) {
    case 'install':
      await handleInstall();
      break;
    case 'remove':
      await handleRemove();
      break;
    case 'start':
      await handleStart();
      break;
    case 'stop':
      await handleStop();
      break;
    case 'list':
      await handleList();
      break;
  }
}

async function handleInstall(): Promise<void> {
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
    
    // Ensure LaunchAgents directory exists
    const launchAgentsDir = join(homedir(), 'Library', 'LaunchAgents');
    if (!existsSync(launchAgentsDir)) {
      mkdirSync(launchAgentsDir, { recursive: true });
    }
    
    // Find obsidigen binary
    const obsidigenPath = getObsidigenPath();
    
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
    if (isServiceLoaded()) {
      unloadService();
    }
    loadService();
    
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

async function handleRemove(): Promise<void> {
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
      if (isServiceLoaded()) {
        unloadService();
      }
      removePlist();
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

async function handleStart(): Promise<void> {
  if (!plistExists()) {
    console.log(chalk.red('✗ Service not installed'));
    console.log(chalk.gray('  Run `obsidigen service install` first'));
    process.exit(1);
  }
  
  const spinner = ora('Starting service...').start();
  
  try {
    if (!isServiceLoaded()) {
      loadService();
    }
    
    startService();
    
    // Wait a moment and check status
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const status = getServiceStatus();
    
    if (status.running) {
      spinner.succeed(`Service started (PID: ${status.pid})`);
      
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
      console.log(chalk.gray('  Check logs at ~/.obsidigen/daemon.log'));
    }
    
  } catch (error) {
    spinner.fail('Failed to start service');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function handleStop(): Promise<void> {
  if (!plistExists()) {
    console.log(chalk.yellow('⚠ Service not installed'));
    return;
  }
  
  const spinner = ora('Stopping service...').start();
  
  try {
    stopService();
    spinner.succeed('Service stopped');
  } catch (error) {
    spinner.fail('Failed to stop service');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
  }
}

async function handleList(): Promise<void> {
  const vaults = getRegisteredVaults();
  const status = getServiceStatus();
  
  console.log('');
  console.log(chalk.bold('Obsidigen Service'));
  console.log('');
  
  if (status.loaded) {
    console.log(`  Status:  ${status.running ? chalk.green('● Running') : chalk.yellow('○ Stopped')}`);
    if (status.pid) {
      console.log(`  PID:     ${status.pid}`);
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
    const npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
    const possiblePath = join(npmRoot, 'obsidigen', 'dist', 'cli.js');
    
    if (existsSync(possiblePath)) {
      return process.execPath + ' ' + possiblePath;
    }
    
    // Last resort - use node to run from current location
    return process.argv[1];
  }
}

