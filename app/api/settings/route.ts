import { NextRequest, NextResponse } from 'next/server';
import { loadConfig, saveConfig, validateConfig, testGA4Connection, testCloudflareConnection } from '@/lib/config';
import { env } from '@/lib/env';
import type { AppConfig } from '@/lib/config';

/**
 * GET /api/settings
 * Returns current configuration (with masked credentials)
 */
export async function GET(request: NextRequest) {
  try {
    // Check password protection
    const authResult = checkAuth(request);
    if (authResult) return authResult;

    const config = await loadConfig();

    // Mask sensitive fields
    const masked = {
      gaMeasurementId: config.gaMeasurementId,
      gaPropertyId: config.gaPropertyId,
      gaApiSecret: maskSecret(config.gaApiSecret),
      googleServiceAccount: {
        email: config.googleServiceAccount.email,
        privateKey: maskSecret(config.googleServiceAccount.privateKey),
      },
      cfAccountId: config.cfAccountId,
      cfNamespaceId: config.cfNamespaceId,
      cfApiToken: maskSecret(config.cfApiToken),
    };

    return NextResponse.json({ config: masked });
  } catch (error) {
    console.error('Error loading settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Updates configuration in KV storage
 */
export async function POST(request: NextRequest) {
  try {
    // Check password protection
    const authResult = checkAuth(request);
    if (authResult) return authResult;

    const body = await request.json();
    const { config, action } = body;

    // Handle test actions
    if (action === 'test-ga4') {
      // Merge with existing config to get unmasked values
      const currentConfig = await loadConfig();
      const testConfig = {
        ...currentConfig,
        ...config,
        googleServiceAccount: {
          email: config.googleServiceAccount?.email || currentConfig.googleServiceAccount.email,
          privateKey: config.googleServiceAccount?.privateKey?.includes('*') 
            ? currentConfig.googleServiceAccount.privateKey 
            : config.googleServiceAccount?.privateKey || currentConfig.googleServiceAccount.privateKey
        }
      };
      const result = await testGA4Connection(testConfig);
      return NextResponse.json(result);
    }

    if (action === 'test-cloudflare') {
      // Merge with existing config to get unmasked values
      const currentConfig = await loadConfig();
      const testConfig = {
        cfAccountId: config.cfAccountId || currentConfig.cfAccountId,
        cfApiToken: config.cfApiToken?.includes('*') ? currentConfig.cfApiToken : config.cfApiToken || currentConfig.cfApiToken,
        cfNamespaceId: config.cfNamespaceId || currentConfig.cfNamespaceId
      };
      const result = await testCloudflareConnection(
        testConfig.cfAccountId,
        testConfig.cfApiToken,
        testConfig.cfNamespaceId
      );
      return NextResponse.json(result);
    }

    // Validate configuration
    const errors = validateConfig(config);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Save to KV
    await saveConfig(config as AppConfig);

    return NextResponse.json({ 
      success: true,
      message: 'Configuration saved successfully' 
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

/**
 * Check password authentication
 */
function checkAuth(request: NextRequest): NextResponse | null {
  const settingsPassword = env.settingsPassword;
  
  // If no password is set, allow access
  if (!settingsPassword) {
    return null;
  }

  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const password = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (password !== settingsPassword) {
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Mask sensitive string for display
 */
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) {
    return '********';
  }
  const visible = 4;
  return secret.substring(0, visible) + '*'.repeat(8) + secret.substring(secret.length - visible);
}
