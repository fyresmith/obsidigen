// Daemon mode - runs all registered vaults

import chalk from 'chalk';
import { fork, ChildProcess } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getRegisteredVaults } from '../config/global.js';
import { getVaultConfig, isInitialized } from '../config/vault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RunningVault {
  path: string;
  name: string;
  port: number;
  process: ChildProcess;
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
  
  const serverPath = resolve(__dirname, '../server/index.js');
  
  try {
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
      console.log(chalk.yellow(`[${name}] Process exited with code ${code}`));
      runningVaults.delete(vaultPath);
      
      // Attempt restart after delay
      setTimeout(() => {
        if (!runningVaults.has(vaultPath)) {
          console.log(chalk.gray(`[${name}] Attempting restart...`));
          startVault(vaultPath, name, port);
        }
      }, 5000);
    });
    
    runningVaults.set(vaultPath, {
      path: vaultPath,
      name,
      port,
      process: child,
    });
    
    console.log(chalk.green(`✓ Started ${name} on port ${port}`));
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

