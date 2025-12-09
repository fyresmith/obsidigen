// obsidigen start/stop/status commands

import chalk from 'chalk';
import ora from 'ora';
import { spawn, fork } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isInitialized, getVaultConfig, getProcessInfo, saveProcessInfo, clearProcessInfo } from '../config/vault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface StartOptions {
  daemon?: boolean;
  port?: string;
}

export async function startCommand(options: StartOptions): Promise<void> {
  const vaultPath = resolve(process.cwd());
  
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized.'));
    console.log(chalk.gray('  Run `obsidigen init` first.'));
    process.exit(1);
  }
  
  const config = getVaultConfig(vaultPath);
  if (!config) {
    console.log(chalk.red('✗ Could not read configuration.'));
    process.exit(1);
  }
  
  // Check if already running
  const processInfo = getProcessInfo(vaultPath);
  if (processInfo) {
    try {
      process.kill(processInfo.pid, 0);
      console.log(chalk.yellow(`⚠ Server already running on port ${processInfo.port} (PID: ${processInfo.pid})`));
      return;
    } catch {
      // Process not running, clear stale PID
      clearProcessInfo(vaultPath);
    }
  }
  
  const port = options.port ? parseInt(options.port, 10) : config.port;
  
  if (options.daemon) {
    // Start as daemon (background process)
    const spinner = ora('Starting server in background...').start();
    
    try {
      const serverPath = resolve(__dirname, '../server/index.js');
      
      const child = fork(serverPath, [], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          OBSIDIGEN_VAULT_PATH: vaultPath,
          OBSIDIGEN_PORT: port.toString(),
        },
      });
      
      child.unref();
      
      if (child.pid) {
        saveProcessInfo(vaultPath, {
          pid: child.pid,
          port,
          startedAt: new Date().toISOString(),
        });
        
        spinner.succeed(`Server started on port ${port} (PID: ${child.pid})`);
        console.log(`  ${chalk.cyan(`http://localhost:${port}`)}`);
      } else {
        spinner.fail('Failed to start server');
      }
    } catch (error) {
      spinner.fail('Failed to start server');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  } else {
    // Start in foreground
    console.log(chalk.bold(`\n🌐 Starting Obsidigen server...\n`));
    console.log(`  Wiki:  ${chalk.cyan(config.name)}`);
    console.log(`  Path:  ${chalk.gray(vaultPath)}`);
    console.log(`  URL:   ${chalk.cyan(`http://localhost:${port}`)}`);
    console.log('');
    console.log(chalk.gray('  Press Ctrl+C to stop\n'));
    
    // Save process info for status command
    saveProcessInfo(vaultPath, {
      pid: process.pid,
      port,
      startedAt: new Date().toISOString(),
    });
    
    // Import and start server
    const { startServer } = await import('../server/index.js');
    
    // Handle shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\nShutting down...'));
      clearProcessInfo(vaultPath);
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      clearProcessInfo(vaultPath);
      process.exit(0);
    });
    
    await startServer(vaultPath, port);
  }
}

export async function stopCommand(): Promise<void> {
  const vaultPath = resolve(process.cwd());
  
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized.'));
    process.exit(1);
  }
  
  const processInfo = getProcessInfo(vaultPath);
  
  if (!processInfo) {
    console.log(chalk.yellow('⚠ No server running for this vault.'));
    return;
  }
  
  const spinner = ora('Stopping server...').start();
  
  try {
    process.kill(processInfo.pid, 'SIGTERM');
    clearProcessInfo(vaultPath);
    spinner.succeed(`Server stopped (was PID: ${processInfo.pid})`);
  } catch (error: any) {
    if (error.code === 'ESRCH') {
      clearProcessInfo(vaultPath);
      spinner.warn('Server was not running (cleaned up stale PID file)');
    } else {
      spinner.fail('Failed to stop server');
      console.error(chalk.red(error.message));
    }
  }
}

export async function statusCommand(): Promise<void> {
  const vaultPath = resolve(process.cwd());
  
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized.'));
    console.log(chalk.gray('  Run `obsidigen init` first.'));
    process.exit(1);
  }
  
  const config = getVaultConfig(vaultPath);
  const processInfo = getProcessInfo(vaultPath);
  
  console.log('');
  console.log(chalk.bold('Obsidigen Status'));
  console.log('');
  
  if (config) {
    console.log(`  Wiki Name:   ${chalk.cyan(config.name)}`);
    console.log(`  Vault Path:  ${chalk.gray(config.vaultPath)}`);
    console.log(`  Port:        ${chalk.cyan(config.port.toString())}`);
  }
  
  console.log('');
  
  if (processInfo) {
    // Check if process is actually running
    let isRunning = false;
    try {
      process.kill(processInfo.pid, 0);
      isRunning = true;
    } catch {
      isRunning = false;
    }
    
    if (isRunning) {
      console.log(`  Server:      ${chalk.green('● Running')}`);
      console.log(`  PID:         ${processInfo.pid}`);
      console.log(`  URL:         ${chalk.cyan(`http://localhost:${processInfo.port}`)}`);
      console.log(`  Started:     ${processInfo.startedAt}`);
      
      if (processInfo.tunnelPid) {
        console.log('');
        console.log(`  Tunnel:      ${chalk.green('● Connected')}`);
        console.log(`  Tunnel PID:  ${processInfo.tunnelPid}`);
      }
    } else {
      console.log(`  Server:      ${chalk.gray('○ Stopped')}`);
      clearProcessInfo(vaultPath);
    }
  } else {
    console.log(`  Server:      ${chalk.gray('○ Stopped')}`);
  }
  
  // Show tunnel config if present
  if (config?.tunnel) {
    console.log('');
    console.log(chalk.bold('Tunnel Configuration'));
    console.log(`  Name:        ${config.tunnel.name}`);
    if (config.tunnel.hostname) {
      console.log(`  Hostname:    ${chalk.cyan(config.tunnel.hostname)}`);
    }
  }
  
  console.log('');
}

