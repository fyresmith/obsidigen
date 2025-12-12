// obsidigen access commands

import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { createInterface } from 'readline';
import { isInitialized, getVaultConfig } from '../config/vault.js';
import {
  hasApiCredentials,
  setApiCredentials,
  verifyCredentials,
  setupAccessApplication,
  getAccessStatus,
  deleteAccessApplication,
} from '../cloudflare/access.js';
import type { AccessConfig } from '../config/types.js';

export async function accessCommand(action: 'setup' | 'status'): Promise<void> {
  const vaultPath = resolve(process.cwd());
  
  switch (action) {
    case 'setup':
      await handleSetup(vaultPath);
      break;
    case 'status':
      await handleStatus(vaultPath);
      break;
  }
}

async function handleSetup(vaultPath: string): Promise<void> {
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized'));
    console.log(chalk.gray('  Run `obsidigen init` first'));
    process.exit(1);
  }
  
  const vaultConfig = getVaultConfig(vaultPath);
  
  if (!vaultConfig?.tunnel?.hostname) {
    console.log(chalk.red('✗ No tunnel configured'));
    console.log(chalk.gray('  Run `obsidigen tunnel create` first'));
    process.exit(1);
  }
  
  console.log(chalk.bold('\nCloudflare Access Setup\n'));
  console.log('This will protect your wiki with Cloudflare Access.');
  console.log('Only users you specify will be able to access it.\n');
  
  // Check/setup API credentials
  if (!hasApiCredentials()) {
    console.log(chalk.yellow('API credentials not configured.\n'));
    console.log('To set up Cloudflare Access, you need an API token with Access permissions.');
    console.log(chalk.gray('Create one at: https://dash.cloudflare.com/profile/api-tokens\n'));
    console.log('Required permissions:');
    console.log('  - Account > Access: Apps and Policies > Edit');
    console.log('');
    
    const accountId = await prompt('Enter your Cloudflare Account ID: ');
    const apiToken = await prompt('Enter your API Token: ');
    
    if (!accountId || !apiToken) {
      console.log(chalk.red('\n✗ Account ID and API Token are required'));
      process.exit(1);
    }
    
    setApiCredentials(accountId.trim(), apiToken.trim());
    
    const spinner = ora('Verifying credentials...').start();
    const valid = await verifyCredentials();
    
    if (!valid) {
      spinner.fail('Invalid credentials');
      console.log(chalk.gray('\nMake sure your API token has the correct permissions.'));
      process.exit(1);
    }
    
    spinner.succeed('Credentials verified');
    console.log('');
  }
  
  // Get access configuration
  console.log(chalk.bold('Who should have access to this wiki?\n'));
  
  const emailsInput = await prompt('Allowed email addresses (comma-separated): ');
  const domainsInput = await prompt('Allowed email domains (e.g., @company.com, comma-separated): ');
  const sessionDuration = await prompt('Session duration (default: 24h): ') || '24h';
  
  const allowedEmails = emailsInput
    ? emailsInput.split(',').map(e => e.trim()).filter(Boolean)
    : [];
  
  const allowedDomains = domainsInput
    ? domainsInput.split(',').map(d => d.trim().replace(/^@/, '')).filter(Boolean)
    : [];
  
  if (allowedEmails.length === 0 && allowedDomains.length === 0) {
    console.log(chalk.red('\n✗ At least one email or domain must be specified'));
    process.exit(1);
  }
  
  const accessConfig: AccessConfig = {
    enabled: true,
    allowedEmails: allowedEmails.length > 0 ? allowedEmails : undefined,
    allowedDomains: allowedDomains.length > 0 ? allowedDomains : undefined,
    sessionDuration,
  };
  
  console.log('');
  console.log(chalk.bold('Access Configuration:'));
  if (allowedEmails.length > 0) {
    console.log(`  Allowed emails: ${allowedEmails.join(', ')}`);
  }
  if (allowedDomains.length > 0) {
    console.log(`  Allowed domains: ${allowedDomains.map(d => `@${d}`).join(', ')}`);
  }
  console.log(`  Session duration: ${sessionDuration}`);
  console.log('');
  
  const confirm = await prompt('Create Access application? (y/N): ');
  
  if (confirm.toLowerCase() !== 'y') {
    console.log(chalk.yellow('Cancelled'));
    process.exit(0);
  }
  
  const spinner = ora('Creating Access application...').start();
  
  try {
    const appId = await setupAccessApplication(vaultPath, accessConfig);
    
    if (appId) {
      spinner.succeed('Access application created');
      console.log('');
      console.log(chalk.green('✓ Your wiki is now protected with Cloudflare Access'));
      console.log(`  URL: ${chalk.cyan(`https://${vaultConfig.tunnel.hostname}`)}`);
      console.log('');
      console.log(chalk.gray('Users will need to authenticate via email OTP before accessing.'));
    } else {
      spinner.fail('Failed to create Access application');
    }
  } catch (error) {
    spinner.fail('Failed to create Access application');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function handleStatus(vaultPath: string): Promise<void> {
  if (!isInitialized(vaultPath)) {
    console.log(chalk.red('✗ This directory is not initialized'));
    process.exit(1);
  }
  
  const vaultConfig = getVaultConfig(vaultPath);
  const status = await getAccessStatus(vaultPath);
  
  console.log('');
  console.log(chalk.bold('Cloudflare Access Status'));
  console.log('');
  
  if (!status?.configured) {
    console.log(`  Status:    ${chalk.gray('○ Not configured')}`);
    console.log('');
    console.log(chalk.gray('  Run `obsidigen access setup` to protect your wiki'));
  } else {
    console.log(`  Status:    ${chalk.green('● Enabled')}`);
    console.log(`  App ID:    ${status.applicationId}`);
    
    if (status.allowedEmails && status.allowedEmails.length > 0) {
      console.log(`  Emails:    ${status.allowedEmails.join(', ')}`);
    }
    if (status.allowedDomains && status.allowedDomains.length > 0) {
      console.log(`  Domains:   ${status.allowedDomains.map(d => `@${d}`).join(', ')}`);
    }
    
    if (vaultConfig?.tunnel?.hostname) {
      console.log('');
      console.log(`  Protected URL: ${chalk.cyan(`https://${vaultConfig.tunnel.hostname}`)}`);
    }
  }
  
  console.log('');
}

/**
 * Simple readline prompt
 */
function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}


