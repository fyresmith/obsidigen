// obsidigen tunnel commands

import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { isInitialized, getVaultConfig } from '../config/vault.js';
import {
  isCloudflaredInstalled,
  getInstallInstructions,
  isLoggedIn,
  login,
  createTunnel,
  startTunnel,
  stopTunnel,
  getTunnelStatus,
} from '../cloudflare/tunnel.js';
import { startServer } from '../server/index.js';

interface TunnelOptions {
  name?: string;
  domain?: string;
}

export async function tunnelCommand(
  action: 'login' | 'create' | 'start' | 'stop' | 'status',
  options: TunnelOptions = {}
): Promise<void> {
  const vaultPath = resolve(process.cwd());
  
  // Check cloudflared installation for all commands
  if (!isCloudflaredInstalled()) {
    console.log(chalk.red('✗ cloudflared is not installed'));
    console.log(getInstallInstructions());
    process.exit(1);
  }
  
  switch (action) {
    case 'login':
      await handleLogin();
      break;
    case 'create':
      await handleCreate(vaultPath, options);
      break;
    case 'start':
      await handleStart(vaultPath);
      break;
    case 'stop':
      await handleStop(vaultPath);
      break;
    case 'status':
      handleStatus(vaultPath);
      break;
  }
}

async function handleLogin(): Promise<void> {
  if (isLoggedIn()) {
    console.log(chalk.yellow('⚠ Already logged in to Cloudflare'));
    console.log(chalk.gray('  To re-authenticate, delete ~/.cloudflared/cert.pem first'));
    return;
  }
  
  console.log(chalk.bold('\nCloudflare Tunnel Login\n'));
  console.log('A browser window will open for you to authenticate with Cloudflare.');
  console.log(chalk.gray('Make sure you have a Cloudflare account and at least one domain.\n'));
  
  const success = await login();
  
  if (success) {
    console.log(chalk.green('\n✓ Successfully authenticated with Cloudflare'));
    console.log(chalk.gray('\nNext: Run `obsidigen tunnel create` to create a tunnel for your wiki'));
  } else {
    console.log(chalk.red('\n✗ Authentication failed'));
    process.exit(1);
  }
}

async function handleCreate(vaultPath: string, options: TunnelOptions): Promise<void> {
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized'));
    console.log(chalk.gray('  Run `obsidigen init` first'));
    process.exit(1);
  }
  
  if (!isLoggedIn()) {
    console.log(chalk.red('✗ Not logged in to Cloudflare'));
    console.log(chalk.gray('  Run `obsidigen tunnel login` first'));
    process.exit(1);
  }
  
  const vaultConfig = getVaultConfig(vaultPath);
  
  // Check if tunnel already exists
  if (vaultConfig?.tunnel?.tunnelId) {
    console.log(chalk.yellow('⚠ A tunnel already exists for this vault'));
    console.log(`  Name: ${vaultConfig.tunnel.name}`);
    console.log(`  Hostname: ${vaultConfig.tunnel.hostname}`);
    console.log(chalk.gray('\n  Delete the existing tunnel first to create a new one'));
    return;
  }
  
  // Get tunnel name
  const tunnelName = options.name || vaultConfig?.name || vaultPath.split('/').pop() || 'wiki';
  const sanitizedName = tunnelName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  console.log(chalk.bold('\nCreating Cloudflare Tunnel\n'));
  
  const spinner = ora(`Creating tunnel "${sanitizedName}"...`).start();
  
  const result = await createTunnel(vaultPath, sanitizedName, options.domain);
  
  if (result) {
    spinner.succeed(`Tunnel "${sanitizedName}" created`);
    
    const config = getVaultConfig(vaultPath);
    
    console.log('');
    console.log(chalk.bold('Tunnel Configuration:'));
    console.log(`  Tunnel ID: ${chalk.cyan(result.tunnelId)}`);
    console.log(`  Hostname:  ${chalk.cyan(config?.tunnel?.hostname || 'Not set')}`);
    console.log('');
    console.log(chalk.bold('Next steps:'));
    console.log(`  ${chalk.cyan('obsidigen tunnel start')}  Start the server with tunnel`);
    console.log('');
    
    if (!options.domain) {
      console.log(chalk.gray('Tip: Use --domain to specify a custom domain:'));
      console.log(chalk.gray(`  obsidigen tunnel create --domain wiki.yourdomain.com`));
    }
  } else {
    spinner.fail('Failed to create tunnel');
    process.exit(1);
  }
}

async function handleStart(vaultPath: string): Promise<void> {
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized'));
    console.log(chalk.gray('  Run `obsidigen init` first'));
    process.exit(1);
  }
  
  const vaultConfig = getVaultConfig(vaultPath);
  
  if (!vaultConfig?.tunnel) {
    console.log(chalk.red('✗ No tunnel configured'));
    console.log(chalk.gray('  Run `obsidigen tunnel create` first'));
    process.exit(1);
  }
  
  console.log(chalk.bold('\n🌐 Starting Obsidigen with Cloudflare Tunnel\n'));
  console.log(`  Wiki:      ${chalk.cyan(vaultConfig.name)}`);
  console.log(`  Local:     ${chalk.cyan(`http://localhost:${vaultConfig.port}`)}`);
  console.log(`  Public:    ${chalk.cyan(`https://${vaultConfig.tunnel.hostname}`)}`);
  console.log('');
  console.log(chalk.gray('  Press Ctrl+C to stop\n'));
  
  // Start the local server first
  const serverPromise = startServer(vaultPath, vaultConfig.port);
  
  // Wait a bit for server to start, then start tunnel
  setTimeout(async () => {
    const tunnelSuccess = await startTunnel(vaultPath);
    if (!tunnelSuccess) {
      console.log(chalk.yellow('\n⚠ Tunnel failed to start, but local server is running'));
    }
  }, 1000);
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nShutting down...'));
    stopTunnel(vaultPath);
    process.exit(0);
  });
  
  await serverPromise;
}

async function handleStop(vaultPath: string): Promise<void> {
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized'));
    process.exit(1);
  }
  
  const spinner = ora('Stopping tunnel...').start();
  
  const stopped = stopTunnel(vaultPath);
  
  if (stopped) {
    spinner.succeed('Tunnel stopped');
  } else {
    spinner.warn('No tunnel was running');
  }
}

function handleStatus(vaultPath: string): void {
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized'));
    process.exit(1);
  }
  
  const status = getTunnelStatus(vaultPath);
  
  console.log('');
  console.log(chalk.bold('Tunnel Status'));
  console.log('');
  
  if (!status.configured) {
    console.log(`  Status:    ${chalk.gray('○ Not configured')}`);
    console.log('');
    console.log(chalk.gray('  Run `obsidigen tunnel create` to set up a tunnel'));
  } else {
    console.log(`  Name:      ${chalk.cyan(status.tunnelName || 'Unknown')}`);
    console.log(`  Hostname:  ${chalk.cyan(status.hostname || 'Not set')}`);
    console.log(`  Status:    ${status.running ? chalk.green('● Running') : chalk.gray('○ Stopped')}`);
    
    if (status.running) {
      console.log('');
      console.log(`  Public URL: ${chalk.cyan(`https://${status.hostname}`)}`);
    }
  }
  
  console.log('');
}

