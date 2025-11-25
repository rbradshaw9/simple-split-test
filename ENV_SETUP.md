# Environment Configuration Guide

This guide explains how to configure all required environment variables for EdgeSplit.

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your actual values (see sections below)

3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables Reference

### GA4 Analytics

#### GA4_MEASUREMENT_ID
- **Format**: `G-XXXXXXXXXX`
- **Where to find**: Google Analytics 4 → Admin → Data Streams → Select your stream → Measurement ID
- **Example**: `G-JB0RD87K5S`
- **Required**: Yes

#### GA4_PROPERTY_ID
- **Format**: Numeric string
- **Where to find**: Google Analytics 4 → Admin → Property Settings → Property details (top of page)
- **Example**: `488866743`
- **Required**: Yes

#### GA4_API_SECRET
- **Format**: Random string
- **Where to find**: 
  1. Google Analytics 4 → Admin → Data Streams
  2. Click your stream
  3. Click "Measurement Protocol API secrets"
  4. Click "Create" to generate a new secret
- **Example**: `F9Rksj-uRe-hizG788Pwtg`
- **Required**: Yes

### Google Service Account

#### GOOGLE_SERVICE_ACCOUNT_KEY
- **Format**: Complete JSON key file as a **single-line string** with escaped newlines
- **Where to get**:
  1. Go to [Google Cloud Console](https://console.cloud.google.com)
  2. Select your project (or create one)
  3. Navigate to: **IAM & Admin → Service Accounts**
  4. Click "Create Service Account" (or use existing)
  5. Click **Keys → Add Key → Create new key → JSON**
  6. Download the JSON file

- **How to format**:
  ```bash
  # Convert JSON file to single line with escaped newlines
  cat your-service-account-key.json | jq -c
  
  # Or manually: wrap in single quotes and escape newlines in private_key
  ```

- **Example**:
  ```bash
  GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"metal-vehicle-343615","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBg...\n-----END PRIVATE KEY-----\n","client_email":"your-sa@your-project.iam.gserviceaccount.com",...}'
  ```

- **IMPORTANT**: The service account must have **Viewer** role on your GA4 property:
  1. Go to Google Analytics 4 → Admin → Property Access Management
  2. Click "Add users"
  3. Enter the service account email (e.g., `edgesplit-data-reader@metal-vehicle-343615.iam.gserviceaccount.com`)
  4. Select role: **Viewer**
  5. Click "Add"

- **Required**: Yes

### Cloudflare Configuration

#### CLOUDFLARE_ACCOUNT_ID
- **Format**: Alphanumeric string
- **Where to find**: Cloudflare Dashboard → Overview → Right sidebar under "Account ID"
- **Example**: `a1b2c3d4e5f6g7h8i9j0`
- **Required**: No (but needed for Worker deployment via API)

#### CLOUDFLARE_API_TOKEN
- **Format**: Long alphanumeric string
- **Where to get**:
  1. Cloudflare Dashboard → My Profile → API Tokens
  2. Click "Create Token"
  3. Use template: **"Edit Cloudflare Workers"** or create custom token with:
     - **Permissions**: `Workers KV Storage:Edit` + `Workers Scripts:Edit`
     - **Account Resources**: Include your account
  4. Copy the token (you can only see it once!)
- **Example**: `abcd1234efgh5678ijkl9012mnop3456`
- **Required**: No (but needed for Worker deployment via API)

#### CLOUDFLARE_KV_NAMESPACE_ID
- **Format**: Alphanumeric string
- **Where to get**:
  1. Install wrangler: `npm install -g wrangler`
  2. Login: `wrangler login`
  3. Create namespace: `wrangler kv:namespace create "AB_TESTS"`
  4. Copy the namespace ID from output
  
  **OR** via Dashboard:
  1. Cloudflare Dashboard → Workers & Pages → KV
  2. Click "Create namespace"
  3. Name it `AB_TESTS`
  4. Copy the namespace ID
- **Example**: `abc123def456ghi789jkl012`
- **Required**: No (but needed to store test configs and stats in production)

**Note**: All three Cloudflare variables must be set together. If any are missing, EdgeSplit will use a local mock KV store for development.

### Application Settings

#### APP_URL
- **Format**: Full URL with protocol
- **Purpose**: Used for generating setup instructions and cron job URLs
- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`
- **Required**: Yes

#### NEXT_PUBLIC_APP_URL
- **Format**: Full URL with protocol
- **Purpose**: Public-facing URL accessible from client-side code
- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`
- **Required**: Yes

#### JWT_SECRET
- **Format**: Random string (32+ characters recommended)
- **Purpose**: Secret key for JWT token generation (future feature)
- **Generate**: `openssl rand -base64 32`
- **Example**: `your_random_secret_key_here_make_it_long`
- **Required**: No (not currently used, reserved for future API authentication)

## Complete .env.local Example

```bash
# GA4 Configuration
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GA4_API_SECRET=your_ga4_api_secret

# Google Service Account (one-line JSON - use your actual service account credentials)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"your-sa@your-project.iam.gserviceaccount.com",...}'

# Cloudflare (optional for local development)
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_KV_NAMESPACE_ID=your_kv_namespace_id

# Application
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_random_secret_key_here
```

## Validation

EdgeSplit validates all environment variables at startup. If any required variables are missing or invalid, you'll see a clear error message:

```
❌ Failed to load environment variables:
Missing required environment variable: GA4_MEASUREMENT_ID
Please check your .env.local file and ensure all required variables are set.
See .env.example for the complete list of required variables.
```

When properly configured, you'll see:

```
✅ Environment variables loaded successfully
   GA4 Measurement ID: G-JB0RD87K5S
   GA4 Property ID: 488866743
   Service Account: edgesplit-data-reader@metal-vehicle-343615.iam.gserviceaccount.com
   Cloudflare Config: ✓
```

## Troubleshooting

### "Cannot parse GOOGLE_SERVICE_ACCOUNT_KEY"
- Make sure the JSON is on **one line**
- Use single quotes to wrap the value: `GOOGLE_SERVICE_ACCOUNT_KEY='...'`
- Ensure newlines in `private_key` are escaped as `\n` (backslash-n)
- Don't add extra spaces or line breaks

### "Failed to get access token"
- Check that service account email has Viewer access in GA4
- Verify the private key is not corrupted
- Make sure you copied the entire JSON without modification

### "Using mock KV store"
- This warning appears when Cloudflare credentials are not set
- It's normal for local development
- Tests will work but won't sync to production Cloudflare KV

### "GA4 API error: 403"
- Service account doesn't have access to GA4 property
- Add the service account email in GA4 Property Access Management with Viewer role

### "GA4 API error: 404"
- GA4_PROPERTY_ID is incorrect
- Double-check the property ID in GA4 Admin → Property Settings

## Security Best Practices

1. **Never commit `.env.local`** to version control (already in .gitignore)
2. **Use different service accounts** for dev/staging/production
3. **Rotate API secrets** periodically
4. **Limit service account permissions** to only what's needed (Viewer role)
5. **Use Cloudflare API tokens** with minimal required permissions
6. **Generate strong JWT_SECRET**: `openssl rand -base64 32`

## Production Deployment

For production deployment (Vercel, Netlify, etc.):

1. Add all environment variables in your hosting platform's dashboard
2. Use production URLs for `APP_URL` and `NEXT_PUBLIC_APP_URL`
3. Configure Cloudflare credentials for KV storage
4. Set up cron jobs for Thompson Sampling sync (see SETUP.md)

### Vercel Example

```bash
vercel env add GA4_MEASUREMENT_ID
# Paste your value when prompted

vercel env add GA4_PROPERTY_ID
vercel env add GA4_API_SECRET
vercel env add GOOGLE_SERVICE_ACCOUNT_KEY
# ... repeat for all variables
```

Or use Vercel dashboard: Settings → Environment Variables

## Getting Help

If you encounter issues:
1. Check the console output for specific error messages
2. Verify all required variables are set in `.env.local`
3. Test GA4 access: Visit `/api/stats/test_id` to see if data loads
4. Check Cloudflare KV: Use `wrangler kv:key list` to verify connectivity
5. Review [SETUP.md](./SETUP.md) for complete setup instructions
