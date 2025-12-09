// File watcher for live reload

import chokidar from 'chokidar';
import { join } from 'path';
import type { VaultIndex } from './indexer.js';

export interface WatcherCallbacks {
  onFileChange?: (path: string) => void;
  onFileAdd?: (path: string) => void;
  onFileRemove?: (path: string) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export class VaultWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  
  constructor(
    private vaultPath: string,
    private vaultIndex: VaultIndex,
    private callbacks: WatcherCallbacks = {}
  ) {}
  
  /**
   * Start watching the vault for changes
   */
  start(): void {
    if (this.watcher) {
      this.stop();
    }
    
    // Watch markdown files and ignore .obsidigen directory
    this.watcher = chokidar.watch(join(this.vaultPath, '**/*.md'), {
      ignored: [
        /(^|[\/\\])\../, // dotfiles
        '**/node_modules/**',
        '**/.obsidigen/**',
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });
    
    this.watcher
      .on('change', async (path) => {
        try {
          await this.vaultIndex.updateFile(path);
          this.callbacks.onFileChange?.(path);
        } catch (error) {
          console.error(`Error updating index for ${path}:`, error);
        }
      })
      .on('add', async (path) => {
        try {
          await this.vaultIndex.updateFile(path);
          this.callbacks.onFileAdd?.(path);
        } catch (error) {
          console.error(`Error adding ${path} to index:`, error);
        }
      })
      .on('unlink', (path) => {
        try {
          this.vaultIndex.removeFile(path);
          this.callbacks.onFileRemove?.(path);
        } catch (error) {
          console.error(`Error removing ${path} from index:`, error);
        }
      })
      .on('ready', () => {
        this.callbacks.onReady?.();
      })
      .on('error', (error) => {
        this.callbacks.onError?.(error);
      });
  }
  
  /**
   * Stop watching
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
  
  /**
   * Check if watcher is running
   */
  get isWatching(): boolean {
    return this.watcher !== null;
  }
}

