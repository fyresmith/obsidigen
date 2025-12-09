// Cloudflare Access policy management

import { getGlobalConfig, saveGlobalConfig, getCloudflareCredentials } from '../config/global.js';
import { getVaultConfig, updateVaultConfig } from '../config/vault.js';
import type { AccessConfig } from '../config/types.js';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ message: string }>;
  result: T;
}

interface AccessApplication {
  id: string;
  name: string;
  domain: string;
  session_duration: string;
}

interface AccessPolicy {
  id: string;
  name: string;
  decision: string;
  include: Array<{ email?: { email: string }; email_domain?: { domain: string } }>;
}

/**
 * Check if API credentials are configured
 */
export function hasApiCredentials(): boolean {
  const { accountId, apiToken } = getCloudflareCredentials();
  return !!(accountId && apiToken);
}

/**
 * Configure API credentials
 */
export function setApiCredentials(accountId: string, apiToken: string): void {
  const config = getGlobalConfig();
  config.cloudflare = {
    ...config.cloudflare,
    accountId,
    apiToken,
  };
  saveGlobalConfig(config);
}

/**
 * Make authenticated request to Cloudflare API
 */
async function cfApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T | null> {
  const { accountId, apiToken } = getCloudflareCredentials();
  
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare API credentials not configured');
  }
  
  const url = `${CF_API_BASE}/accounts/${accountId}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json() as CloudflareResponse<T>;
    
    if (!data.success) {
      const errorMessages = data.errors.map(e => e.message).join(', ');
      throw new Error(`Cloudflare API error: ${errorMessages}`);
    }
    
    return data.result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error calling Cloudflare API');
  }
}

/**
 * Create or update Access application for a vault
 */
export async function setupAccessApplication(
  vaultPath: string,
  config: AccessConfig
): Promise<string | null> {
  const vaultConfig = getVaultConfig(vaultPath);
  
  if (!vaultConfig?.tunnel?.hostname) {
    throw new Error('No tunnel hostname configured');
  }
  
  const hostname = vaultConfig.tunnel.hostname;
  const appName = `obsidigen-${vaultConfig.name}`;
  
  // Check if application already exists
  if (vaultConfig.access?.applicationId) {
    // Update existing application
    try {
      await cfApiRequest<AccessApplication>(
        `/access/apps/${vaultConfig.access.applicationId}`,
        'PUT',
        {
          name: appName,
          domain: hostname,
          type: 'self_hosted',
          session_duration: config.sessionDuration || '24h',
        }
      );
      
      // Update policies
      await updateAccessPolicies(vaultConfig.access.applicationId, config);
      
      return vaultConfig.access.applicationId;
    } catch (error) {
      console.error('Failed to update existing application, creating new one');
    }
  }
  
  // Create new application
  const app = await cfApiRequest<AccessApplication>('/access/apps', 'POST', {
    name: appName,
    domain: hostname,
    type: 'self_hosted',
    session_duration: config.sessionDuration || '24h',
  });
  
  if (!app) {
    return null;
  }
  
  // Create access policy
  await createAccessPolicy(app.id, config);
  
  // Save to vault config
  updateVaultConfig(vaultPath, {
    access: {
      ...config,
      applicationId: app.id,
    },
  });
  
  return app.id;
}

/**
 * Create access policy for an application
 */
async function createAccessPolicy(
  applicationId: string,
  config: AccessConfig
): Promise<void> {
  const includes: Array<any> = [];
  
  // Add email allowlist
  if (config.allowedEmails && config.allowedEmails.length > 0) {
    for (const email of config.allowedEmails) {
      includes.push({ email: { email } });
    }
  }
  
  // Add domain allowlist
  if (config.allowedDomains && config.allowedDomains.length > 0) {
    for (const domain of config.allowedDomains) {
      includes.push({ email_domain: { domain } });
    }
  }
  
  if (includes.length === 0) {
    throw new Error('At least one email or domain must be allowed');
  }
  
  await cfApiRequest(`/access/apps/${applicationId}/policies`, 'POST', {
    name: 'Allow configured users',
    decision: 'allow',
    include: includes,
    precedence: 1,
  });
}

/**
 * Update access policies for an application
 */
async function updateAccessPolicies(
  applicationId: string,
  config: AccessConfig
): Promise<void> {
  // Get existing policies
  const policies = await cfApiRequest<AccessPolicy[]>(
    `/access/apps/${applicationId}/policies`
  );
  
  // Delete existing policies
  if (policies) {
    for (const policy of policies) {
      await cfApiRequest(
        `/access/apps/${applicationId}/policies/${policy.id}`,
        'DELETE'
      );
    }
  }
  
  // Create new policy
  await createAccessPolicy(applicationId, config);
}

/**
 * Delete Access application
 */
export async function deleteAccessApplication(vaultPath: string): Promise<boolean> {
  const vaultConfig = getVaultConfig(vaultPath);
  
  if (!vaultConfig?.access?.applicationId) {
    return false;
  }
  
  try {
    await cfApiRequest(
      `/access/apps/${vaultConfig.access.applicationId}`,
      'DELETE'
    );
    
    // Clear from vault config
    updateVaultConfig(vaultPath, {
      access: undefined,
    });
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Access application status
 */
export async function getAccessStatus(vaultPath: string): Promise<{
  configured: boolean;
  applicationId?: string;
  allowedEmails?: string[];
  allowedDomains?: string[];
} | null> {
  const vaultConfig = getVaultConfig(vaultPath);
  
  if (!vaultConfig?.access) {
    return { configured: false };
  }
  
  return {
    configured: true,
    applicationId: vaultConfig.access.applicationId,
    allowedEmails: vaultConfig.access.allowedEmails,
    allowedDomains: vaultConfig.access.allowedDomains,
  };
}

/**
 * Verify API credentials work
 */
export async function verifyCredentials(): Promise<boolean> {
  try {
    await cfApiRequest('/access/apps');
    return true;
  } catch {
    return false;
  }
}

