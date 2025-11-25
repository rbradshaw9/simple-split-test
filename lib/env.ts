/**
 * Environment Variable Configuration
 * 
 * This module loads and validates all required environment variables for EdgeSplit.
 * Configuration can be loaded from:
 * 1. Cloudflare KV (editable via Settings page) - PRIORITY
 * 2. Environment Variables (fallback)
 * 
 * ## Required Environment Variables:
 * 
 * ### GA4 Configuration
 * - `GA4_MEASUREMENT_ID`: Your GA4 Measurement ID (format: G-XXXXXXXXXX)
 * - `GA4_PROPERTY_ID`: Your GA4 Property ID (numeric)
 * - `GA4_API_SECRET`: GA4 Measurement Protocol API Secret
 * 
 * ### Google Service Account
 * - `GOOGLE_SERVICE_ACCOUNT_KEY`: Complete service account JSON key as a ONE-LINE string
 *   - Must be the entire JSON from Google Cloud Console
 *   - Newlines in the private_key must be escaped as \n (literal backslash-n)
 *   - Format: '{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}'
 *   - The service account must have "Viewer" role on your GA4 property
 * 
 * ### Cloudflare (Optional for API routes, required for Worker deployment)
 * - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID
 * - `CLOUDFLARE_API_TOKEN`: API token with Workers KV edit permissions
 * - `CLOUDFLARE_KV_NAMESPACE_ID`: KV namespace ID for AB_TESTS
 * 
 * ### Application
 * - `APP_URL`: Your application's base URL
 * - `NEXT_PUBLIC_APP_URL`: Public-facing app URL (client-side accessible)
 * - `JWT_SECRET`: Secret key for JWT token generation (optional)
 * - `SETTINGS_PASSWORD`: Password to protect settings page (optional but recommended)
 * 
 * @see .env.example for complete configuration template
 */

interface GoogleServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

interface Env {
  // GA4 Configuration
  gaMeasurementId: string;
  gaPropertyId: string;
  gaApiSecret: string;

  // Google Service Account
  googleServiceAccount: GoogleServiceAccount;

  // Cloudflare Configuration (optional)
  cfAccountId?: string;
  cfApiToken?: string;
  cfNamespaceId?: string;

  // Application Configuration
  appUrl: string;
  publicAppUrl: string;
  jwtSecret?: string;
  settingsPassword?: string;
}

/**
 * Validates that a required environment variable is present
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env.local file and ensure all required variables are set.\n` +
      `See .env.example for the complete list of required variables.`
    );
  }
  return value;
}

/**
 * Gets an optional environment variable
 */
function getEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Parses and validates the Google Service Account JSON
 */
function parseServiceAccount(jsonString: string): GoogleServiceAccount {
  try {
    const parsed = JSON.parse(jsonString) as GoogleServiceAccount;

    // Validate required fields
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
    ];

    for (const field of requiredFields) {
      if (!(field in parsed) || !parsed[field as keyof GoogleServiceAccount]) {
        throw new Error(`Missing required field in service account JSON: ${field}`);
      }
    }

    // Validate private key format
    if (!parsed.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error(
        'Invalid private_key format in service account JSON.\n' +
        'The private_key must contain "-----BEGIN PRIVATE KEY-----" and newlines should be escaped as \\n'
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: Invalid JSON format.\n` +
        `Make sure the entire service account JSON is on ONE LINE with escaped newlines (\\n).\n` +
        `Original error: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Validates and loads all environment variables
 */
function loadEnv(): Env {
  // GA4 Configuration
  const gaMeasurementId = requireEnv('GA4_MEASUREMENT_ID');
  const gaPropertyId = requireEnv('GA4_PROPERTY_ID');
  const gaApiSecret = requireEnv('GA4_API_SECRET');

  // Validate GA4 Measurement ID format
  if (!gaMeasurementId.startsWith('G-')) {
    console.warn(
      `Warning: GA4_MEASUREMENT_ID should start with 'G-' (got: ${gaMeasurementId})`
    );
  }

  // Validate GA4 Property ID is numeric
  if (!/^\d+$/.test(gaPropertyId)) {
    console.warn(
      `Warning: GA4_PROPERTY_ID should be numeric (got: ${gaPropertyId})`
    );
  }

  // Google Service Account
  const serviceAccountJson = requireEnv('GOOGLE_SERVICE_ACCOUNT_KEY');
  const googleServiceAccount = parseServiceAccount(serviceAccountJson);

  // Cloudflare Configuration (optional)
  const cfAccountId = getEnv('CLOUDFLARE_ACCOUNT_ID');
  const cfApiToken = getEnv('CLOUDFLARE_API_TOKEN');
  const cfNamespaceId = getEnv('CLOUDFLARE_KV_NAMESPACE_ID');

  // Warn if Cloudflare config is incomplete
  const cfVars = [cfAccountId, cfApiToken, cfNamespaceId];
  const cfConfigured = cfVars.filter(Boolean).length;
  if (cfConfigured > 0 && cfConfigured < 3) {
    console.warn(
      'Warning: Cloudflare configuration is incomplete.\n' +
      'All three variables are required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_KV_NAMESPACE_ID'
    );
  }

  // Application Configuration
  const appUrl = requireEnv('APP_URL');
  const publicAppUrl = requireEnv('NEXT_PUBLIC_APP_URL');
  const jwtSecret = getEnv('JWT_SECRET');
  const settingsPassword = getEnv('SETTINGS_PASSWORD');

  return {
    gaMeasurementId,
    gaPropertyId,
    gaApiSecret,
    googleServiceAccount,
    cfAccountId,
    cfApiToken,
    cfNamespaceId,
    appUrl,
    publicAppUrl,
    jwtSecret,
    settingsPassword,
  };
}

// Load and validate environment variables at module initialization
// This will throw an error immediately if any required variables are missing
let env: Env;

try {
  env = loadEnv();
  
  // Log successful configuration (without sensitive data)
  console.log('✅ Environment variables loaded successfully');
  console.log(`   GA4 Measurement ID: ${env.gaMeasurementId}`);
  console.log(`   GA4 Property ID: ${env.gaPropertyId}`);
  console.log(`   Service Account: ${env.googleServiceAccount.client_email}`);
  console.log(`   Cloudflare Config: ${env.cfAccountId ? '✓' : '✗'}`);
} catch (error) {
  console.error('❌ Failed to load environment variables:');
  console.error((error as Error).message);
  throw error;
}

export { env };
export type { GoogleServiceAccount, Env };
