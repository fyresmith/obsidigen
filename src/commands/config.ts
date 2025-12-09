// obsidigen config command

import chalk from 'chalk';
import { resolve } from 'path';
import { spawn } from 'child_process';
import { isInitialized, getVaultConfig, updateVaultConfig, getObsidigenDir } from '../config/vault.js';
import { join } from 'path';

interface ConfigOptions {
  edit?: boolean;
  set?: string;
  get?: string;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
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
  
  if (options.edit) {
    // Open config in default editor
    const configPath = join(getObsidigenDir(vaultPath), 'config.json');
    const editor = process.env.EDITOR || 'nano';
    
    console.log(chalk.gray(`Opening ${configPath} in ${editor}...`));
    
    const child = spawn(editor, [configPath], {
      stdio: 'inherit',
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log(chalk.green('✓ Configuration saved'));
      }
    });
    
    return;
  }
  
  if (options.get) {
    const key = options.get;
    const value = getNestedValue(config, key);
    
    if (value !== undefined) {
      if (typeof value === 'object') {
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(value);
      }
    } else {
      console.log(chalk.red(`Key '${key}' not found`));
      process.exit(1);
    }
    
    return;
  }
  
  if (options.set) {
    const [key, value] = options.set.split('=');
    
    if (!key || value === undefined) {
      console.log(chalk.red('Invalid format. Use --set key=value'));
      process.exit(1);
    }
    
    // Parse value (try JSON, otherwise string)
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }
    
    const updated = setNestedValue(config, key, parsedValue);
    updateVaultConfig(vaultPath, updated);
    
    console.log(chalk.green(`✓ Set ${key} = ${JSON.stringify(parsedValue)}`));
    return;
  }
  
  // Default: show all config
  console.log('');
  console.log(chalk.bold('Vault Configuration'));
  console.log(chalk.gray(`  Path: ${getObsidigenDir(vaultPath)}/config.json`));
  console.log('');
  console.log(JSON.stringify(config, null, 2));
  console.log('');
  console.log(chalk.gray('Use --edit to open in editor, --get <key> to get value, --set <key>=<value> to set'));
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const result = { ...obj };
  let current = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = current[key] ? { ...current[key] } : {};
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
}

