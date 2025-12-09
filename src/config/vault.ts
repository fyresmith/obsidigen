// Per-vault configuration management (.obsidigen/)

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { VaultConfig, ProcessInfo } from './types.js';

const OBSIDIGEN_DIR = '.obsidigen';
const CONFIG_FILE = 'config.json';
const PID_FILE = 'server.pid';
const CACHE_DIR = 'cache';

export function getObsidigenDir(vaultPath: string = process.cwd()): string {
  return join(vaultPath, OBSIDIGEN_DIR);
}

export function isInitialized(vaultPath: string = process.cwd()): boolean {
  return existsSync(getObsidigenDir(vaultPath));
}

export function initVault(vaultPath: string, config: Partial<VaultConfig>): VaultConfig {
  const obsidigenDir = getObsidigenDir(vaultPath);
  
  // Create .obsidigen directory
  if (!existsSync(obsidigenDir)) {
    mkdirSync(obsidigenDir, { recursive: true });
  }
  
  // Create cache directory
  const cacheDir = join(obsidigenDir, CACHE_DIR);
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  
  // Create config
  const fullConfig: VaultConfig = {
    name: config.name || vaultPath.split('/').pop() || 'wiki',
    port: config.port || 4000,
    vaultPath: vaultPath,
    createdAt: new Date().toISOString(),
    ...config,
  };
  
  saveVaultConfig(vaultPath, fullConfig);
  
  return fullConfig;
}

export function getVaultConfig(vaultPath: string = process.cwd()): VaultConfig | null {
  const configPath = join(getObsidigenDir(vaultPath), CONFIG_FILE);
  
  if (!existsSync(configPath)) {
    return null;
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as VaultConfig;
  } catch {
    return null;
  }
}

export function saveVaultConfig(vaultPath: string, config: VaultConfig): void {
  const configPath = join(getObsidigenDir(vaultPath), CONFIG_FILE);
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function updateVaultConfig(vaultPath: string, updates: Partial<VaultConfig>): VaultConfig | null {
  const config = getVaultConfig(vaultPath);
  if (!config) return null;
  
  const updated = { ...config, ...updates };
  saveVaultConfig(vaultPath, updated);
  return updated;
}

export function getProcessInfo(vaultPath: string = process.cwd()): ProcessInfo | null {
  const pidPath = join(getObsidigenDir(vaultPath), PID_FILE);
  
  if (!existsSync(pidPath)) {
    return null;
  }
  
  try {
    const content = readFileSync(pidPath, 'utf-8');
    return JSON.parse(content) as ProcessInfo;
  } catch {
    return null;
  }
}

export function saveProcessInfo(vaultPath: string, info: ProcessInfo): void {
  const pidPath = join(getObsidigenDir(vaultPath), PID_FILE);
  writeFileSync(pidPath, JSON.stringify(info, null, 2));
}

export function clearProcessInfo(vaultPath: string = process.cwd()): void {
  const pidPath = join(getObsidigenDir(vaultPath), PID_FILE);
  if (existsSync(pidPath)) {
    unlinkSync(pidPath);
  }
}

export function getCachePath(vaultPath: string = process.cwd()): string {
  return join(getObsidigenDir(vaultPath), CACHE_DIR);
}

