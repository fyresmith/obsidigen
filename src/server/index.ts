// Hono server for Obsidigen

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { VaultIndex } from '../vault/indexer.js';
import { VaultWatcher } from '../vault/watcher.js';
import { wikiRoutes } from './routes/wiki.js';
import { searchRoutes } from './routes/search.js';
import { graphRoutes } from './routes/graph.js';
import { treeRoutes } from './routes/tree.js';
import { previewRoutes } from './routes/preview.js';
import chalk from 'chalk';

export interface ServerContext {
  vaultIndex: VaultIndex;
  vaultPath: string;
}

let serverInstance: ReturnType<typeof serve> | null = null;
let watcher: VaultWatcher | null = null;

export async function startServer(vaultPath: string, port: number): Promise<void> {
  // Build vault index
  console.log(chalk.gray('  Building vault index...'));
  const vaultIndex = new VaultIndex(vaultPath);
  await vaultIndex.build();
  console.log(chalk.gray(`  Indexed ${vaultIndex.pageCount} pages`));
  
  // Create Hono app
  const app = new Hono<{ Variables: ServerContext }>();
  
  // Inject context into all requests
  app.use('*', async (c, next) => {
    c.set('vaultIndex', vaultIndex);
    c.set('vaultPath', vaultPath);
    await next();
  });
  
  // Static files (CSS, JS)
  app.use('/static/*', serveStatic({ root: './public' }));
  
  // API routes
  app.route('/api/search', searchRoutes);
  app.route('/api/graph', graphRoutes);
  app.route('/api/tree', treeRoutes);
  app.route('/api/preview', previewRoutes);
  
  // Wiki routes (must be last - catches all paths)
  app.route('/', wikiRoutes);
  
  // Start file watcher
  watcher = new VaultWatcher(vaultPath, vaultIndex, {
    onFileChange: (path) => {
      console.log(chalk.gray(`  Updated: ${path}`));
    },
    onFileAdd: (path) => {
      console.log(chalk.green(`  Added: ${path}`));
    },
    onFileRemove: (path) => {
      console.log(chalk.yellow(`  Removed: ${path}`));
    },
    onReady: () => {
      console.log(chalk.gray('  Watching for changes...'));
    },
  });
  watcher.start();
  
  // Start server
  serverInstance = serve({
    fetch: app.fetch,
    port,
  }, (info) => {
    console.log(chalk.green(`\n✓ Server running at http://localhost:${info.port}\n`));
  });
}

export async function stopServer(): Promise<void> {
  if (watcher) {
    watcher.stop();
    watcher = null;
  }
  
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
}

// Support running as daemon
if (process.env.OBSIDIGEN_VAULT_PATH && process.env.OBSIDIGEN_PORT) {
  const vaultPath = process.env.OBSIDIGEN_VAULT_PATH;
  const port = parseInt(process.env.OBSIDIGEN_PORT, 10);
  
  startServer(vaultPath, port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

