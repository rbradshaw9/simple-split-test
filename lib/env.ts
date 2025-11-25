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
 * - `GA_SERVICE_ACCOUNT_EMAIL`: Service account email address
 *   - Format: your-service-account@your-project.iam.gserviceaccount.com
 * - `GA_SERVICE_ACCOUNT_PRIVATE_KEY`: Service account private key
 *   - Format: -----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----
 *   - Newlines should be literal \n (will be converted automatically)
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
  email: string;
  privateKey: string;
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
 * Processes the private key by converting escaped newlines to actual newlines
 */
function processPrivateKey(privateKey: string): string {
  // Convert \n to actual newlines (handles both Vercel and local .env formats)
  return privateKey.replace(/\\n/g, '\n');
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
  const serviceAccountEmail = requireEnv('GA_SERVICE_ACCOUNT_EMAIL');
  const serviceAccountPrivateKey = requireEnv('GA_SERVICE_ACCOUNT_PRIVATE_KEY');
  
  // Process private key to handle escaped newlines
  const privateKey = processPrivateKey(serviceAccountPrivateKey);
  
  // Validate private key format
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error(
      'Invalid GA_SERVICE_ACCOUNT_PRIVATE_KEY format.\n' +
      'The private key must contain "-----BEGIN PRIVATE KEY-----"'
    );
  }
  
  const googleServiceAccount: GoogleServiceAccount = {
    email: serviceAccountEmail,
    privateKey: privateKey,
  };

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
  console.log(`   Service Account: ${env.googleServiceAccount.email}`);
  console.log(`   Cloudflare Config: ${env.cfAccountId ? '✓' : '✗'}`);
} catch (error) {
  console.error('❌ Failed to load environment variables:');
  console.error((error as Error).message);
  throw error;
}

export { env };
export type { GoogleServiceAccount, Env };
