// Daemon mode - runs all registered vaults

import chalk from 'chalk';
import { fork, ChildProcess, spawn } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { getRegisteredVaults } from '../config/global.js';
import { getVaultConfig, isInitialized, getObsidigenDir } from '../config/vault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RunningVault {
  path: string;
  name: string;
  port: number;
  process: ChildProcess;
  tunnelProcess?: ChildProcess;
  hasTunnel: boolean;
}

const runningVaults: Map<string, RunningVault> = new Map();

/**
 * Start the daemon (runs all registered vaults)
 */
export async function startDaemon(): Promise<void> {
  console.log(chalk.bold('Obsidigen Daemon Starting...\n'));
  
  const vaults = getRegisteredVaults().filter(v => v.autostart);
  
  if (vaults.length === 0) {
    console.log(chalk.yellow('No vaults registered for autostart'));
    console.log(chalk.gray('Register a vault with: obsidigen service install'));
    // Keep daemon running but idle
    setInterval(() => {}, 60000);
    return;
  }
  
  console.log(`Starting ${vaults.length} vault(s)...\n`);
  
  for (const vault of vaults) {
    await startVault(vault.path, vault.name, vault.port);
  }
  
  // Handle shutdown
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  console.log(chalk.green('\n✓ Daemon running'));
  console.log(chalk.gray('  Press Ctrl+C to stop all vaults\n'));
  
  // Periodically check vault health
  setInterval(checkVaultHealth, 30000);
}

/**
 * Start a single vault
 */
async function startVault(vaultPath: string, name: string, port: number): Promise<boolean> {
  // Verify vault still exists and is initialized
  if (!isInitialized(vaultPath)) {
    console.log(chalk.yellow(`⚠ Skipping ${name}: not initialized at ${vaultPath}`));
    return false;
  }
  
  const config = getVaultConfig(vaultPath);
  if (!config) {
    console.log(chalk.yellow(`⚠ Skipping ${name}: could not read config`));
    return false;
  }
  
  // Check if vault has tunnel configured
  const hasTunnel = config.tunnel?.tunnelId ? true : false;
  const obsidigenDir = getObsidigenDir(vaultPath);
  const tunnelConfigPath = join(obsidigenDir, 'tunnel.yml');
  const hasTunnelConfig = hasTunnel && existsSync(tunnelConfigPath);
  
  const serverPath = resolve(__dirname, '../server/index.js');
  
  try {
    // Start the server
    const child = fork(serverPath, [], {
      env: {
        ...process.env,
        OBSIDIGEN_VAULT_PATH: vaultPath,
        OBSIDIGEN_PORT: port.toString(),
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    
    child.stdout?.on('data', (data) => {
      console.log(`[${name}] ${data.toString().trim()}`);
    });
    
    child.stderr?.on('data', (data) => {
      console.error(`[${name}] ${chalk.red(data.toString().trim())}`);
    });
    
    child.on('exit', (code) => {
      console.log(chalk.yellow(`[${name}] Server exited with code ${code}`));
      
      // Stop tunnel if running
      const vault = runningVaults.get(vaultPath);
      if (vault?.tunnelProcess) {
        vault.tunnelProcess.kill('SIGTERM');
      }
      
      runningVaults.delete(vaultPath);
      
      // Attempt restart after delay
      setTimeout(() => {
        if (!runningVaults.has(vaultPath)) {
          console.log(chalk.gray(`[${name}] Attempting restart...`));
          startVault(vaultPath, name, port);
        }
      }, 5000);
    });
    
    let tunnelProcess: ChildProcess | undefined;
    
    // Start tunnel if configured
    if (hasTunnelConfig) {
      try {
        tunnelProcess = spawn('cloudflared', ['tunnel', '--config', tunnelConfigPath, 'run'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
        });
        
        tunnelProcess.stdout?.on('data', (data) => {
          const text = data.toString().trim();
          if (text.includes('Registered tunnel connection') || text.includes('Starting tunnel')) {
            console.log(`[${name}] ${chalk.cyan(text)}`);
          }
        });
        
        tunnelProcess.stderr?.on('data', (data) => {
          const text = data.toString().trim();
          if (text.includes('ERR') || text.includes('error')) {
            console.error(`[${name}] Tunnel: ${chalk.red(text)}`);
          }
        });
        
        tunnelProcess.on('exit', (code) => {
          console.log(chalk.yellow(`[${name}] Tunnel exited with code ${code}`));
          
          // Try to restart tunnel
          setTimeout(() => {
            const vault = runningVaults.get(vaultPath);
            if (vault && !vault.tunnelProcess) {
              console.log(chalk.gray(`[${name}] Restarting tunnel...`));
              startVault(vaultPath, name, port);
            }
          }, 5000);
        });
        
        console.log(chalk.green(`✓ Started ${name} on port ${port} with Cloudflare Tunnel`));
        console.log(chalk.gray(`  Public URL: https://${config.tunnel?.hostname}`));
      } catch (error) {
        console.error(chalk.yellow(`⚠ Failed to start tunnel for ${name}: ${error}`));
        console.log(chalk.gray(`  Server will run locally only`));
      }
    } else {
      console.log(chalk.green(`✓ Started ${name} on port ${port}`));
    }
    
    runningVaults.set(vaultPath, {
      path: vaultPath,
      name,
      port,
      process: child,
      tunnelProcess,
      hasTunnel: hasTunnelConfig,
    });
    
    return true;
    
  } catch (error) {
    console.error(chalk.red(`✗ Failed to start ${name}: ${error}`));
    return false;
  }
}

/**
 * Stop a single vault
 */
function stopVault(vaultPath: string): void {
  const vault = runningVaults.get(vaultPath);
  if (vault) {
    vault.process.kill('SIGTERM');
    if (vault.tunnelProcess) {
      vault.tunnelProcess.kill('SIGTERM');
    }
    runningVaults.delete(vaultPath);
  }
}

/**
 * Shutdown all vaults
 */
function shutdown(): void {
  console.log(chalk.yellow('\n\nShutting down daemon...'));
  
  for (const [path, vault] of runningVaults) {
    console.log(`  Stopping ${vault.name}...`);
    vault.process.kill('SIGTERM');
    if (vault.tunnelProcess) {
      console.log(`  Stopping tunnel for ${vault.name}...`);
      vault.tunnelProcess.kill('SIGTERM');
    }
  }
  
  runningVaults.clear();
  
  setTimeout(() => {
    console.log(chalk.green('✓ Daemon stopped'));
    process.exit(0);
  }, 1000);
}

/**
 * Check health of running vaults
 */
function checkVaultHealth(): void {
  const vaults = getRegisteredVaults().filter(v => v.autostart);
  
  for (const vault of vaults) {
    if (!runningVaults.has(vault.path)) {
      console.log(chalk.yellow(`[${vault.name}] Not running, attempting start...`));
      startVault(vault.path, vault.name, vault.port);
    }
  }
}

// Entry point when run directly
if (process.argv[2] === 'daemon' || process.env.OBSIDIGEN_DAEMON === 'true') {
  startDaemon().catch((error) => {
    console.error('Daemon error:', error);
    process.exit(1);
  });
}

