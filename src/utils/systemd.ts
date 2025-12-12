// Systemd service management for Linux

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

const SYSTEMD_USER_DIR = join(homedir(), '.config', 'systemd', 'user');
const SERVICE_NAME = 'obsidigen-daemon.service';

export interface SystemdServiceConfig {
  description: string;
  execStart: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  restart?: 'always' | 'on-failure' | 'no';
  restartSec?: number;
}

/**
 * Generate systemd service file content
 */
export function generateSystemdService(config: SystemdServiceConfig): string {
  const envVars = config.environment
    ? Object.entries(config.environment)
        .map(([key, value]) => `Environment="${key}=${value}"`)
        .join('\n')
    : '';

  return `[Unit]
Description=${config.description}
After=network.target

[Service]
Type=simple
ExecStart=${config.execStart}
${config.workingDirectory ? `WorkingDirectory=${config.workingDirectory}` : ''}
${envVars}
Restart=${config.restart || 'on-failure'}
RestartSec=${config.restartSec || 5}
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
`;
}

/**
 * Get the path to the systemd service file
 */
export function getSystemdServicePath(): string {
  return join(SYSTEMD_USER_DIR, SERVICE_NAME);
}

/**
 * Check if systemd service file exists
 */
export function systemdServiceExists(): boolean {
  return existsSync(getSystemdServicePath());
}

/**
 * Write systemd service file
 */
export function writeSystemdService(content: string): void {
  const servicePath = getSystemdServicePath();
  
  // Ensure directory exists
  try {
    execSync(`mkdir -p "${SYSTEMD_USER_DIR}"`, { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Failed to create systemd directory: ${error}`);
  }
  
  writeFileSync(servicePath, content, 'utf-8');
  
  // Reload systemd daemon
  try {
    execSync('systemctl --user daemon-reload', { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Failed to reload systemd: ${error}`);
  }
}

/**
 * Remove systemd service file
 */
export function removeSystemdService(): void {
  const servicePath = getSystemdServicePath();
  
  if (existsSync(servicePath)) {
    unlinkSync(servicePath);
    
    // Reload systemd daemon
    try {
      execSync('systemctl --user daemon-reload', { encoding: 'utf-8' });
    } catch (error) {
      // Ignore reload errors on removal
    }
  }
}

/**
 * Enable systemd service (start on boot)
 */
export function enableSystemdService(): void {
  try {
    execSync(`systemctl --user enable ${SERVICE_NAME}`, { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Failed to enable service: ${error}`);
  }
}

/**
 * Disable systemd service
 */
export function disableSystemdService(): void {
  try {
    execSync(`systemctl --user disable ${SERVICE_NAME}`, { encoding: 'utf-8' });
  } catch (error) {
    // Ignore errors if service is already disabled
  }
}

/**
 * Start systemd service
 */
export function startSystemdService(): void {
  try {
    execSync(`systemctl --user start ${SERVICE_NAME}`, { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Failed to start service: ${error}`);
  }
}

/**
 * Stop systemd service
 */
export function stopSystemdService(): void {
  try {
    execSync(`systemctl --user stop ${SERVICE_NAME}`, { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Failed to stop service: ${error}`);
  }
}

/**
 * Restart systemd service
 */
export function restartSystemdService(): void {
  try {
    execSync(`systemctl --user restart ${SERVICE_NAME}`, { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Failed to restart service: ${error}`);
  }
}

/**
 * Check if systemd service is active
 */
export function isSystemdServiceActive(): boolean {
  try {
    const output = execSync(`systemctl --user is-active ${SERVICE_NAME}`, { 
      encoding: 'utf-8' 
    });
    return output.trim() === 'active';
  } catch {
    return false;
  }
}

/**
 * Check if systemd service is enabled
 */
export function isSystemdServiceEnabled(): boolean {
  try {
    const output = execSync(`systemctl --user is-enabled ${SERVICE_NAME}`, { 
      encoding: 'utf-8' 
    });
    return output.trim() === 'enabled';
  } catch {
    return false;
  }
}

/**
 * Get systemd service status
 */
export interface SystemdServiceStatus {
  loaded: boolean;
  active: boolean;
  enabled: boolean;
  pid?: number;
}

export function getSystemdServiceStatus(): SystemdServiceStatus {
  const status: SystemdServiceStatus = {
    loaded: systemdServiceExists(),
    active: false,
    enabled: false,
  };
  
  if (!status.loaded) {
    return status;
  }
  
  try {
    const output = execSync(`systemctl --user status ${SERVICE_NAME}`, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    status.active = isSystemdServiceActive();
    status.enabled = isSystemdServiceEnabled();
    
    // Extract PID from status output
    const pidMatch = output.match(/Main PID: (\d+)/);
    if (pidMatch) {
      status.pid = parseInt(pidMatch[1], 10);
    }
  } catch {
    // Service exists but might not be running
    status.enabled = isSystemdServiceEnabled();
  }
  
  return status;
}

/**
 * Get service logs
 */
export function getSystemdServiceLogs(lines: number = 50): string {
  try {
    return execSync(`journalctl --user -u ${SERVICE_NAME} -n ${lines} --no-pager`, {
      encoding: 'utf-8'
    });
  } catch (error) {
    throw new Error(`Failed to get logs: ${error}`);
  }
}

/**
 * Check if systemd is available on this system
 */
export function isSystemdAvailable(): boolean {
  try {
    execSync('systemctl --version', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}


