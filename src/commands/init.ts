// obsidigen init command

import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { isInitialized, initVault } from '../config/vault.js';
import { getNextAvailablePort, registerVault } from '../config/global.js';

interface InitOptions {
  port?: string;
  name?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const vaultPath = resolve(process.cwd());
  
  // Check if already initialized
  if (isInitialized(vaultPath)) {
    console.log(chalk.yellow('⚠ This directory is already initialized as an Obsidigen wiki.'));
    console.log(chalk.gray(`  Config: ${vaultPath}/.obsidigen/config.json`));
    return;
  }
  
  // Verify this looks like an Obsidian vault (has .md files)
  const files = readdirSync(vaultPath);
  const hasMarkdown = files.some(f => f.endsWith('.md')) || 
    files.some(f => {
      const subPath = resolve(vaultPath, f);
      try {
        const stats = require('fs').statSync(subPath);
        if (stats.isDirectory()) {
          return readdirSync(subPath).some(sf => sf.endsWith('.md'));
        }
      } catch {
        return false;
      }
      return false;
    });
  
  if (!hasMarkdown) {
    console.log(chalk.yellow('⚠ No markdown files found. Are you sure this is an Obsidian vault?'));
  }
  
  const spinner = ora('Initializing Obsidigen...').start();
  
  try {
    // Determine port
    const port = options.port ? parseInt(options.port, 10) : getNextAvailablePort();
    const name = options.name || vaultPath.split('/').pop() || 'wiki';
    
    // Initialize the vault
    const config = initVault(vaultPath, {
      name,
      port,
      vaultPath,
    });
    
    // Register in global config
    registerVault({
      path: vaultPath,
      name: config.name,
      port: config.port,
      autostart: false,
    });
    
    spinner.succeed('Obsidigen initialized!');
    
    console.log('');
    console.log(chalk.green('✓ Created .obsidigen/ directory'));
    console.log('');
    console.log(chalk.bold('Configuration:'));
    console.log(`  Name: ${chalk.cyan(config.name)}`);
    console.log(`  Port: ${chalk.cyan(config.port.toString())}`);
    console.log(`  Path: ${chalk.gray(vaultPath)}`);
    console.log('');
    console.log(chalk.bold('Next steps:'));
    console.log(`  ${chalk.cyan('obsidigen start')}         Start the local server`);
    console.log(`  ${chalk.cyan('obsidigen tunnel login')}  Authenticate with Cloudflare`);
    console.log(`  ${chalk.cyan('obsidigen tunnel create')} Create a tunnel for public access`);
    console.log('');
    
  } catch (error) {
    spinner.fail('Failed to initialize');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

