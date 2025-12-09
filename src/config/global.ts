// Global configuration management (~/.obsidigen/)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { GlobalConfig, VaultRegistry } from './types.js';

const GLOBAL_DIR = '.obsidigen';
const CONFIG_FILE = 'config.json';
const CLOUDFLARED_DIR = 'cloudflared';

export function getGlobalDir(): string {
  return join(homedir(), GLOBAL_DIR);
}

export function getCloudflaredDir(): string {
  return join(getGlobalDir(), CLOUDFLARED_DIR);
}

export function ensureGlobalDir(): void {
  const globalDir = getGlobalDir();
  if (!existsSync(globalDir)) {
    mkdirSync(globalDir, { recursive: true });
  }
  
  const cloudflaredDir = getCloudflaredDir();
  if (!existsSync(cloudflaredDir)) {
    mkdirSync(cloudflaredDir, { recursive: true });
  }
}

export function getGlobalConfig(): GlobalConfig {
  ensureGlobalDir();
  const configPath = join(getGlobalDir(), CONFIG_FILE);
  
  if (!existsSync(configPath)) {
    const defaultConfig: GlobalConfig = {
      vaults: [],
      defaultPort: 4000,
    };
    saveGlobalConfig(defaultConfig);
    return defaultConfig;
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as GlobalConfig;
  } catch {
    const defaultConfig: GlobalConfig = {
      vaults: [],
      defaultPort: 4000,
    };
    return defaultConfig;
  }
}

export function saveGlobalConfig(config: GlobalConfig): void {
  ensureGlobalDir();
  const configPath = join(getGlobalDir(), CONFIG_FILE);
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function registerVault(vault: VaultRegistry): void {
  const config = getGlobalConfig();
  
  // Check if already registered
  const existingIndex = config.vaults.findIndex(v => v.path === vault.path);
  if (existingIndex >= 0) {
    config.vaults[existingIndex] = vault;
  } else {
    config.vaults.push(vault);
  }
  
  saveGlobalConfig(config);
}

export function unregisterVault(vaultPath: string): boolean {
  const config = getGlobalConfig();
  const initialLength = config.vaults.length;
  
  config.vaults = config.vaults.filter(v => v.path !== vaultPath);
  
  if (config.vaults.length < initialLength) {
    saveGlobalConfig(config);
    return true;
  }
  
  return false;
}

export function getRegisteredVaults(): VaultRegistry[] {
  return getGlobalConfig().vaults;
}

export function getNextAvailablePort(): number {
  const config = getGlobalConfig();
  const usedPorts = config.vaults.map(v => v.port);
  
  let port = config.defaultPort;
  while (usedPorts.includes(port)) {
    port++;
  }
  
  return port;
}

export function setCloudflareCredentials(accountId: string, apiToken: string): void {
  const config = getGlobalConfig();
  config.cloudflare = {
    ...config.cloudflare,
    accountId,
    apiToken,
  };
  saveGlobalConfig(config);
}

export function getCloudflareCredentials(): { accountId?: string; apiToken?: string } {
  const config = getGlobalConfig();
  return {
    accountId: config.cloudflare?.accountId,
    apiToken: config.cloudflare?.apiToken,
  };
}

