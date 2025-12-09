// Configuration types for Obsidigen

export interface VaultConfig {
  name: string;
  title?: string;  // Custom display title (defaults to name)
  port: number;
  vaultPath: string;
  createdAt: string;
  tunnel?: TunnelConfig;
  access?: AccessConfig;
}

export interface TunnelConfig {
  name: string;
  hostname?: string;
  tunnelId?: string;
  credentialsPath?: string;
}

export interface AccessConfig {
  enabled: boolean;
  allowedEmails?: string[];
  allowedDomains?: string[];
  sessionDuration?: string;
  applicationId?: string;
}

export interface GlobalConfig {
  vaults: VaultRegistry[];
  cloudflare?: CloudflareGlobalConfig;
  defaultPort: number;
}

export interface VaultRegistry {
  path: string;
  name: string;
  port: number;
  autostart: boolean;
}

export interface CloudflareGlobalConfig {
  accountId?: string;
  apiToken?: string;
  certPath?: string;
}

export interface ProcessInfo {
  pid: number;
  port: number;
  startedAt: string;
  tunnelPid?: number;
}

