// Cloudflare Tunnel management

import { spawn, execSync, ChildProcess } from 'child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { getCloudflaredDir, getGlobalConfig, saveGlobalConfig } from '../config/global.js';
import { getObsidigenDir, getVaultConfig, updateVaultConfig, getProcessInfo, saveProcessInfo } from '../config/vault.js';

const TUNNEL_CONFIG_FILE = 'tunnel.yml';
const TUNNEL_CREDENTIALS_FILE = 'tunnel.json';

let tunnelProcess: ChildProcess | null = null;

/**
 * Check if cloudflared is installed
 */
export function isCloudflaredInstalled(): boolean {
  try {
    execSync('which cloudflared', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get cloudflared installation instructions
 */
export function getInstallInstructions(): string {
  return `
cloudflared is not installed. Install it with:

  macOS:    brew install cloudflare/cloudflare/cloudflared
  Linux:    See https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

After installing, run: obsidigen tunnel login
`;
}

/**
 * Login to Cloudflare (opens browser)
 */
export async function login(): Promise<boolean> {
  if (!isCloudflaredInstalled()) {
    console.log(getInstallInstructions());
    return false;
  }
  
  const cloudflaredDir = getCloudflaredDir();
  
  return new Promise((resolve) => {
    const proc = spawn('cloudflared', ['tunnel', 'login'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        TUNNEL_ORIGIN_CERT: join(cloudflaredDir, 'cert.pem'),
      },
    });
    
    proc.on('exit', (code) => {
      if (code === 0) {
        // Save cert location in global config
        const config = getGlobalConfig();
        config.cloudflare = {
          ...config.cloudflare,
          certPath: join(cloudflaredDir, 'cert.pem'),
        };
        saveGlobalConfig(config);
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Check if logged in to Cloudflare
 */
export function isLoggedIn(): boolean {
  const cloudflaredDir = getCloudflaredDir();
  const certPath = join(cloudflaredDir, 'cert.pem');
  
  // Also check default location
  const defaultCertPath = join(process.env.HOME || '', '.cloudflared', 'cert.pem');
  
  return existsSync(certPath) || existsSync(defaultCertPath);
}

/**
 * Find tunnel credentials file for a given tunnel ID
 */
function findTunnelCredentials(tunnelId: string): string | null {
  const cloudflaredDir = join(homedir(), '.cloudflared');
  
  if (!existsSync(cloudflaredDir)) {
    return null;
  }
  
  // Look for credentials file with tunnel ID
  const credentialsFile = join(cloudflaredDir, `${tunnelId}.json`);
  
  if (existsSync(credentialsFile)) {
    return credentialsFile;
  }
  
  // Also check in subdirectories
  try {
    const files = readdirSync(cloudflaredDir);
    for (const file of files) {
      if (file.includes(tunnelId) && file.endsWith('.json')) {
        return join(cloudflaredDir, file);
      }
    }
  } catch {
    // Ignore errors
  }
  
  return null;
}

/**
 * Get list of existing tunnels with details
 */
async function getTunnelList(): Promise<Array<{ id: string; name: string; createdAt: string }>> {
  if (!isCloudflaredInstalled() || !isLoggedIn()) {
    return [];
  }
  
  return new Promise((resolve) => {
    const proc = spawn('cloudflared', ['tunnel', 'list', '--output', 'json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    let output = '';
    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    proc.on('exit', (code) => {
      if (code !== 0) {
        resolve([]);
        return;
      }
      
      try {
        const tunnels = JSON.parse(output);
        resolve(tunnels.map((t: any) => ({
          id: t.id,
          name: t.name,
          createdAt: t.created_at,
        })));
      } catch {
        resolve([]);
      }
    });
  });
}

/**
 * Check if a tunnel with the given name exists
 */
export async function tunnelExists(tunnelName: string): Promise<string | null> {
  const tunnels = await getTunnelList();
  const existing = tunnels.find(t => t.name === tunnelName);
  return existing ? existing.id : null;
}

/**
 * Create a new tunnel for a vault
 */
export async function createTunnel(
  vaultPath: string,
  tunnelName: string,
  hostname?: string
): Promise<{ tunnelId: string; credentialsPath: string } | null> {
  if (!isCloudflaredInstalled()) {
    console.log(getInstallInstructions());
    return null;
  }
  
  if (!isLoggedIn()) {
    console.log('Not logged in. Run: obsidigen tunnel login');
    return null;
  }
  
  // Check if tunnel already exists
  const existingId = await tunnelExists(tunnelName);
  if (existingId) {
    // Tunnel exists, try to use it
    const credentialsPath = findTunnelCredentials(existingId);
    if (credentialsPath) {
      // Found existing tunnel with credentials, save config
      const vaultConfig = getVaultConfig(vaultPath);
      const port = vaultConfig?.port || 4000;
      
      // Generate hostname
      const autoHostname = `${tunnelName}.cfargotunnel.com`;
      const finalHostname = hostname || autoHostname;
      
      // Copy credentials to vault directory
      const obsidigenDir = getObsidigenDir(vaultPath);
      const vaultCredentialsPath = join(obsidigenDir, TUNNEL_CREDENTIALS_FILE);
      try {
        const credentials = readFileSync(credentialsPath, 'utf-8');
        writeFileSync(vaultCredentialsPath, credentials);
      } catch (error) {
        console.error(chalk.yellow('Warning: Could not copy credentials file'));
      }
      
      // Create tunnel config YAML
      const tunnelConfig = {
        tunnel: existingId,
        'credentials-file': vaultCredentialsPath,
        ingress: [
          {
            hostname: finalHostname,
            service: `http://localhost:${port}`,
          },
          {
            service: 'http_status:404',
          },
        ],
      };
      
      const configPath = join(obsidigenDir, TUNNEL_CONFIG_FILE);
      writeFileSync(configPath, formatYaml(tunnelConfig));
      
      // Save to vault config
      updateVaultConfig(vaultPath, {
        tunnel: {
          name: tunnelName,
          tunnelId: existingId,
          hostname: finalHostname,
          credentialsPath: vaultCredentialsPath,
        },
      });
      
      return { tunnelId: existingId, credentialsPath: vaultCredentialsPath };
    }
    // If credentials not found, we need to delete and recreate
    console.log(chalk.yellow(`\n⚠ Tunnel "${tunnelName}" exists but credentials not found`));
    console.log(chalk.gray('  Deleting and recreating tunnel...\n'));
    
    const deleted = await deleteTunnel(tunnelName);
    if (!deleted) {
      console.log(chalk.red('✗ Failed to delete existing tunnel'));
      console.log(chalk.gray(`  Run: cloudflared tunnel delete ${tunnelName}`));
      return null;
    }
  }
  
  const obsidigenDir = getObsidigenDir(vaultPath);
  
  return new Promise((resolve) => {
    // Create the tunnel
    const proc = spawn('cloudflared', ['tunnel', 'create', tunnelName], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    
    let output = '';
    proc.stdout?.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    proc.stderr?.on('data', (data) => {
      output += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('exit', async (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      
      // Extract tunnel ID from output
      // Format: "Created tunnel <name> with id <uuid>"
      const tunnelIdMatch = output.match(/Created tunnel .+ with id ([a-f0-9-]+)/i) || 
                           output.match(/tunnel ([a-f0-9-]+)/i);
      if (!tunnelIdMatch) {
        console.error('Could not find tunnel ID in output');
        console.error('Output was:', output);
        resolve(null);
        return;
      }
      
      const tunnelId = tunnelIdMatch[1];
      
      // Copy credentials file to vault's .obsidigen directory
      const defaultCredentialsPath = join(
        process.env.HOME || '',
        '.cloudflared',
        `${tunnelId}.json`
      );
      
      const vaultCredentialsPath = join(obsidigenDir, TUNNEL_CREDENTIALS_FILE);
      
      try {
        if (existsSync(defaultCredentialsPath)) {
          const credentials = readFileSync(defaultCredentialsPath, 'utf-8');
          writeFileSync(vaultCredentialsPath, credentials);
        }
      } catch (error) {
        console.error('Warning: Could not copy credentials file');
      }
      
      // Create tunnel config
      const vaultConfig = getVaultConfig(vaultPath);
      const port = vaultConfig?.port || 4000;
      
      const tunnelConfig = {
        tunnel: tunnelId,
        'credentials-file': vaultCredentialsPath,
        ingress: [
          {
            hostname: hostname || `${tunnelName}.cfargotunnel.com`,
            service: `http://localhost:${port}`,
          },
          {
            service: 'http_status:404',
          },
        ],
      };
      
      const configPath = join(obsidigenDir, TUNNEL_CONFIG_FILE);
      writeFileSync(configPath, formatYaml(tunnelConfig));
      
      // Update vault config
      updateVaultConfig(vaultPath, {
        tunnel: {
          name: tunnelName,
          tunnelId,
          hostname: hostname || `${tunnelName}.cfargotunnel.com`,
          credentialsPath: vaultCredentialsPath,
        },
      });
      
      // If hostname provided, create DNS route
      if (hostname) {
        console.log(`\nCreating DNS route for ${hostname}...`);
        try {
          execSync(`cloudflared tunnel route dns ${tunnelName} ${hostname}`, {
            stdio: 'inherit',
          });
        } catch {
          console.log('Note: You may need to manually configure DNS for your custom domain');
        }
      }
      
      resolve({
        tunnelId,
        credentialsPath: vaultCredentialsPath,
      });
    });
  });
}

/**
 * Start the tunnel (and server)
 */
export async function startTunnel(vaultPath: string): Promise<boolean> {
  if (!isCloudflaredInstalled()) {
    console.log(getInstallInstructions());
    return false;
  }
  
  const vaultConfig = getVaultConfig(vaultPath);
  if (!vaultConfig?.tunnel) {
    console.log('No tunnel configured. Run: obsidigen tunnel create');
    return false;
  }
  
  const obsidigenDir = getObsidigenDir(vaultPath);
  const configPath = join(obsidigenDir, TUNNEL_CONFIG_FILE);
  
  if (!existsSync(configPath)) {
    console.log('Tunnel config not found. Run: obsidigen tunnel create');
    return false;
  }
  
  return new Promise((resolve) => {
    tunnelProcess = spawn('cloudflared', ['tunnel', '--config', configPath, 'run'], {
      stdio: 'inherit',
      detached: false,
    });
    
    tunnelProcess.on('error', (error) => {
      console.error('Tunnel error:', error);
      resolve(false);
    });
    
    // Save tunnel PID
    if (tunnelProcess.pid) {
      const processInfo = getProcessInfo(vaultPath);
      if (processInfo) {
        saveProcessInfo(vaultPath, {
          ...processInfo,
          tunnelPid: tunnelProcess.pid,
        });
      }
    }
    
    // Give it a moment to start
    setTimeout(() => {
      if (tunnelProcess && !tunnelProcess.killed) {
        console.log(`\nTunnel running at: https://${vaultConfig.tunnel?.hostname}`);
        resolve(true);
      } else {
        resolve(false);
      }
    }, 2000);
  });
}

/**
 * Stop the tunnel
 */
export function stopTunnel(vaultPath: string): boolean {
  const processInfo = getProcessInfo(vaultPath);
  
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
  }
  
  if (processInfo?.tunnelPid) {
    try {
      process.kill(processInfo.tunnelPid, 'SIGTERM');
      saveProcessInfo(vaultPath, {
        ...processInfo,
        tunnelPid: undefined,
      });
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Get tunnel status
 */
export function getTunnelStatus(vaultPath: string): {
  configured: boolean;
  running: boolean;
  tunnelName?: string;
  hostname?: string;
} {
  const vaultConfig = getVaultConfig(vaultPath);
  const processInfo = getProcessInfo(vaultPath);
  
  let running = false;
  if (processInfo?.tunnelPid) {
    try {
      process.kill(processInfo.tunnelPid, 0);
      running = true;
    } catch {
      running = false;
    }
  }
  
  return {
    configured: !!vaultConfig?.tunnel,
    running,
    tunnelName: vaultConfig?.tunnel?.name,
    hostname: vaultConfig?.tunnel?.hostname,
  };
}

/**
 * List all tunnels (display to user)
 */
export async function listTunnels(): Promise<void> {
  if (!isCloudflaredInstalled()) {
    console.log(getInstallInstructions());
    return;
  }
  
  const tunnels = await getTunnelList();
  
  if (tunnels.length === 0) {
    console.log(chalk.gray('No tunnels found'));
    return;
  }
  
  console.log(chalk.bold('\nCloudflare Tunnels:\n'));
  for (const tunnel of tunnels) {
    console.log(`  ${chalk.cyan(tunnel.name)}`);
    console.log(`    ID: ${tunnel.id}`);
    console.log(`    Created: ${new Date(tunnel.createdAt).toLocaleString()}`);
    console.log('');
  }
}

/**
 * Delete a tunnel
 */
export async function deleteTunnel(tunnelName: string): Promise<boolean> {
  if (!isCloudflaredInstalled()) {
    console.log(getInstallInstructions());
    return false;
  }
  
  return new Promise((resolve) => {
    const proc = spawn('cloudflared', ['tunnel', 'delete', '-f', tunnelName], {
      stdio: 'inherit',
    });
    
    proc.on('exit', (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Simple YAML formatter for tunnel config
 */
function formatYaml(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          result += `${spaces}- `;
          const lines = formatYaml(item, 0).split('\n').filter(Boolean);
          result += lines[0] + '\n';
          for (let i = 1; i < lines.length; i++) {
            result += `${spaces}  ${lines[i]}\n`;
          }
        } else {
          result += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      result += `${spaces}${key}:\n`;
      result += formatYaml(value, indent + 1);
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }
  
  return result;
}

