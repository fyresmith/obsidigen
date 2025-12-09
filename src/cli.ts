#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { startCommand, stopCommand, statusCommand } from './commands/start.js';
import { configCommand } from './commands/config.js';
import { tunnelCommand } from './commands/tunnel.js';
import { accessCommand } from './commands/access.js';
import { serviceCommand } from './commands/service.js';
import { startDaemon } from './commands/daemon.js';

const program = new Command();

program
  .name('obsidigen')
  .description('Render Obsidian vaults as web wikis with Cloudflare Tunnel integration')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Initialize current directory as an Obsidigen wiki')
  .option('-p, --port <port>', 'Port to run the server on', '4000')
  .option('-n, --name <name>', 'Name for this wiki')
  .action(initCommand);

// Start command
program
  .command('start')
  .description('Start the wiki server')
  .option('-d, --daemon', 'Run as background daemon')
  .option('-p, --port <port>', 'Override port')
  .action(startCommand);

// Stop command
program
  .command('stop')
  .description('Stop the wiki server')
  .action(stopCommand);

// Status command
program
  .command('status')
  .description('Show server status')
  .action(statusCommand);

// Config command
program
  .command('config')
  .description('View or edit vault configuration')
  .option('-e, --edit', 'Open config in editor')
  .option('--set <key=value>', 'Set a config value')
  .option('--get <key>', 'Get a config value')
  .action(configCommand);

// Tunnel commands
const tunnel = program
  .command('tunnel')
  .description('Manage Cloudflare Tunnel');

tunnel
  .command('login')
  .description('Authenticate with Cloudflare')
  .action((options) => tunnelCommand('login', options));

tunnel
  .command('create')
  .description('Create a tunnel for this vault')
  .option('-n, --name <name>', 'Tunnel name')
  .option('-d, --domain <domain>', 'Custom domain (optional)')
  .option('-f, --force', 'Force reconfigure existing tunnel')
  .action((options) => tunnelCommand('create', options));

tunnel
  .command('start')
  .description('Start server with tunnel')
  .action((options) => tunnelCommand('start', options));

tunnel
  .command('stop')
  .description('Stop the tunnel')
  .action((options) => tunnelCommand('stop', options));

tunnel
  .command('status')
  .description('Show tunnel status')
  .action((options) => tunnelCommand('status', options));

tunnel
  .command('delete')
  .description('Delete the tunnel and remove configuration')
  .action((options) => tunnelCommand('delete', options));

// Access commands
const access = program
  .command('access')
  .description('Manage Cloudflare Access');

access
  .command('setup')
  .description('Configure access policies')
  .action(() => accessCommand('setup'));

access
  .command('status')
  .description('Show access policy status')
  .action(() => accessCommand('status'));

// Service commands
const service = program
  .command('service')
  .description('Manage system service');

service
  .command('install')
  .description('Register vault with boot service')
  .action(() => serviceCommand('install'));

service
  .command('remove')
  .description('Unregister from boot service')
  .action(() => serviceCommand('remove'));

service
  .command('start')
  .description('Start the daemon service')
  .action(() => serviceCommand('start'));

service
  .command('stop')
  .description('Stop the daemon service')
  .action(() => serviceCommand('stop'));

service
  .command('list')
  .description('List all registered vaults')
  .action(() => serviceCommand('list'));

// Daemon command (internal - used by launchd)
program
  .command('daemon')
  .description('Run daemon mode (internal)')
  .action(startDaemon);

program.parse();

