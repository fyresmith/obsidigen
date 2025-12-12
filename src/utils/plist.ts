// launchd plist generation and management

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

const PLIST_NAME = 'com.obsidigen.daemon.plist';
const LAUNCH_AGENTS_DIR = join(homedir(), 'Library', 'LaunchAgents');

export interface PlistConfig {
  label: string;
  program: string;
  programArguments: string[];
  runAtLoad: boolean;
  keepAlive: boolean;
  standardOutPath?: string;
  standardErrorPath?: string;
  environmentVariables?: Record<string, string>;
  workingDirectory?: string;
}

/**
 * Generate plist XML content
 */
export function generatePlist(config: PlistConfig): string {
  let plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${escapeXml(config.label)}</string>
    <key>ProgramArguments</key>
    <array>
${config.programArguments.map(arg => `        <string>${escapeXml(arg)}</string>`).join('\n')}
    </array>
    <key>RunAtLoad</key>
    <${config.runAtLoad}/>
    <key>KeepAlive</key>
    <${config.keepAlive}/>`;

  if (config.standardOutPath) {
    plist += `
    <key>StandardOutPath</key>
    <string>${escapeXml(config.standardOutPath)}</string>`;
  }

  if (config.standardErrorPath) {
    plist += `
    <key>StandardErrorPath</key>
    <string>${escapeXml(config.standardErrorPath)}</string>`;
  }

  if (config.workingDirectory) {
    plist += `
    <key>WorkingDirectory</key>
    <string>${escapeXml(config.workingDirectory)}</string>`;
  }

  if (config.environmentVariables && Object.keys(config.environmentVariables).length > 0) {
    plist += `
    <key>EnvironmentVariables</key>
    <dict>`;
    for (const [key, value] of Object.entries(config.environmentVariables)) {
      plist += `
        <key>${escapeXml(key)}</key>
        <string>${escapeXml(value)}</string>`;
    }
    plist += `
    </dict>`;
  }

  plist += `
</dict>
</plist>`;

  return plist;
}

/**
 * Get the path to the plist file
 */
export function getPlistPath(): string {
  return join(LAUNCH_AGENTS_DIR, PLIST_NAME);
}

/**
 * Check if plist exists
 */
export function plistExists(): boolean {
  return existsSync(getPlistPath());
}

/**
 * Write plist file
 */
export function writePlist(content: string): void {
  const plistPath = getPlistPath();
  writeFileSync(plistPath, content);
}

/**
 * Remove plist file
 */
export function removePlist(): boolean {
  const plistPath = getPlistPath();
  if (existsSync(plistPath)) {
    unlinkSync(plistPath);
    return true;
  }
  return false;
}

/**
 * Load the launchd service
 */
export function loadService(): boolean {
  const plistPath = getPlistPath();
  if (!existsSync(plistPath)) {
    return false;
  }
  
  try {
    execSync(`launchctl load ${plistPath}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Unload the launchd service
 */
export function unloadService(): boolean {
  const plistPath = getPlistPath();
  
  try {
    execSync(`launchctl unload ${plistPath}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if service is loaded
 */
export function isServiceLoaded(): boolean {
  try {
    const result = execSync('launchctl list', { encoding: 'utf-8' });
    return result.includes('com.obsidigen.daemon');
  } catch {
    return false;
  }
}

/**
 * Start the service
 */
export function startService(): boolean {
  try {
    execSync('launchctl start com.obsidigen.daemon', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop the service
 */
export function stopService(): boolean {
  try {
    execSync('launchctl stop com.obsidigen.daemon', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get service status
 */
export function getServiceStatus(): { loaded: boolean; running: boolean; pid?: number } {
  try {
    const result = execSync('launchctl list | grep com.obsidigen.daemon', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    const parts = result.trim().split(/\s+/);
    const pid = parts[0] !== '-' ? parseInt(parts[0], 10) : undefined;
    
    return {
      loaded: true,
      running: pid !== undefined,
      pid,
    };
  } catch {
    return {
      loaded: false,
      running: false,
    };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}


