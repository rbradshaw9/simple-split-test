/**
 * Application Configuration Management
 * 
 * This module handles loading and saving application configuration.
 * Configuration is stored in Cloudflare KV and falls back to environment variables.
 * 
 * Priority:
 * 1. KV Storage (editable via Settings page)
 * 2. Environment Variables (fallback)
 */

import { getKVStore } from './kv';
import type { GoogleServiceAccount } from './env';

const CONFIG_KEY = '__app_config__';

export interface AppConfig {
  // GA4 Configuration
  gaMeasurementId: string;
  gaPropertyId: string;
  gaApiSecret: string;

  // Google Service Account
  googleServiceAccount: GoogleServiceAccount;

  // Cloudflare Configuration
  cfAccountId: string;
  cfApiToken: string;
  cfNamespaceId: string;
}

/**
 * Load configuration from KV, falling back to environment variables
 */
export async function loadConfig(): Promise<AppConfig> {
  try {
    const kv = getKVStore();
    const stored = await kv.get(CONFIG_KEY);
    
    if (stored) {
      const config = JSON.parse(stored) as AppConfig;
      console.log('✅ Loaded configuration from KV storage');
      return config;
    }
  } catch (error) {
    console.warn('⚠️  Failed to load config from KV, using environment variables:', error);
  }

  // Fall back to environment variables
  return loadConfigFromEnv();
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): AppConfig {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}';
  let googleServiceAccount: GoogleServiceAccount;
  
  try {
    googleServiceAccount = JSON.parse(serviceAccountJson) as GoogleServiceAccount;
  } catch {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY in environment variables');
  }

  return {
    gaMeasurementId: process.env.GA4_MEASUREMENT_ID || '',
    gaPropertyId: process.env.GA4_PROPERTY_ID || '',
    gaApiSecret: process.env.GA4_API_SECRET || '',
    googleServiceAccount,
    cfAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    cfApiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    cfNamespaceId: process.env.CLOUDFLARE_KV_NAMESPACE_ID || '',
  };
}

/**
 * Save configuration to KV storage
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  const kv = getKVStore();
  await kv.put(CONFIG_KEY, JSON.stringify(config));
  console.log('✅ Configuration saved to KV storage');
}

/**
 * Validate configuration
 */
export function validateConfig(config: Partial<AppConfig>): string[] {
  const errors: string[] = [];

  if (!config.gaMeasurementId || !config.gaMeasurementId.startsWith('G-')) {
    errors.push('GA4 Measurement ID must start with G-');
  }

  if (!config.gaPropertyId || !/^\d+$/.test(config.gaPropertyId)) {
    errors.push('GA4 Property ID must be numeric');
  }

  if (!config.gaApiSecret || config.gaApiSecret.length < 10) {
    errors.push('GA4 API Secret is required');
  }

  if (!config.googleServiceAccount?.private_key) {
    errors.push('Google Service Account private key is required');
  } else if (!config.googleServiceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
    errors.push('Invalid private key format in service account');
  }

  if (!config.googleServiceAccount?.client_email) {
    errors.push('Google Service Account client email is required');
  }

  if (!config.cfAccountId || config.cfAccountId.length < 10) {
    errors.push('Cloudflare Account ID is required');
  }

  if (!config.cfApiToken || config.cfApiToken.length < 10) {
    errors.push('Cloudflare API Token is required');
  }

  if (!config.cfNamespaceId || config.cfNamespaceId.length < 10) {
    errors.push('Cloudflare KV Namespace ID is required');
  }

  return errors;
}

/**
 * Test GA4 connection
 */
export async function testGA4Connection(config: AppConfig): Promise<{ success: boolean; error?: string }> {
  try {
    // Test by making a simple GA4 Data API request
    const { getAccessToken } = await import('./ga4');
    const token = await getAccessToken(config.googleServiceAccount);
    
    if (!token) {
      return { success: false, error: 'Failed to get access token' };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Test Cloudflare connection
 */
export async function testCloudflareConnection(
  accountId: string,
  apiToken: string,
  namespaceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
