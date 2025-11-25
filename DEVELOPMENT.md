# Development Setup Guide

This guide will help you set up EdgeSplit for local development.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- Cloudflare account (free tier works)
- Google Cloud account with GA4 configured

## Step-by-Step Setup

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

This will install:
- Next.js 14
- React 18
- TypeScript
- TailwindCSS
- shadcn/ui components
- Radix UI primitives
- Lucide icons

### 2. Configure Environment

Create `.env` file:

\`\`\`bash
cp .env.example .env
\`\`\`

Fill in your credentials:

\`\`\`env
NEXT_PUBLIC_APP_URL=http://localhost:3000
GA4_PROPERTY_ID=your_property_id
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GA4_API_SECRET=your_api_secret
\`\`\`

### 3. Google Cloud Setup

#### Create Service Account

1. Go to https://console.cloud.google.com
2. Select or create a project
3. Enable Google Analytics Data API
4. Create service account:
   - IAM & Admin → Service Accounts → Create Service Account
   - Name: "EdgeSplit GA4 Reader"
   - Role: Viewer
   - Create key → JSON format
5. Download JSON key file

#### Configure GA4 Access

1. Copy service account email (from JSON: `client_email`)
2. In GA4: Admin → Property Access Management
3. Add service account email with Viewer role

#### Get GA4 Credentials

- **Property ID**: GA4 Admin → Property Settings → Copy Property ID
- **Measurement ID**: GA4 Admin → Data Streams → Select stream → Copy Measurement ID
- **API Secret**: GA4 Admin → Data Streams → Select stream → Measurement Protocol → Create

### 4. Cloudflare Setup

#### Create KV Namespace

Using Wrangler:
\`\`\`bash
npm install -g wrangler
wrangler login
wrangler kv:namespace create "AB_TESTS"
\`\`\`

Or via Dashboard:
1. Workers & Pages → KV → Create Namespace
2. Name: `AB_TESTS`
3. Note the Namespace ID

#### Create Worker

1. Workers & Pages → Create Worker
2. Name: `edgesplit-router`
3. Don't deploy yet (you'll paste generated code later)

### 5. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:3000

### 6. Test the Setup

1. Create a test via the UI
2. Copy the generated Worker code
3. Paste into Cloudflare Worker editor
4. Deploy Worker
5. Add KV configuration
6. Configure Worker route
7. Test redirect
8. Check GA4 DebugView for events

## Common Issues

### TypeScript Errors

If you see module import errors, run:
\`\`\`bash
npm install
npm run type-check
\`\`\`

### GA4 Authentication

If GA4 API calls fail:
1. Verify service account JSON is valid
2. Check service account has GA4 property access
3. Ensure Analytics Data API is enabled in Google Cloud

### Worker KV Issues

If Worker can't read KV:
1. Check binding name is exactly `AB_TESTS`
2. Verify namespace ID is correct
3. Ensure test config is stored with key: `test:your-test-id`

## Next Steps

- Read [SETUP.md](./SETUP.md) for complete deployment guide
- Review [workers/template.ts](./workers/template.ts) to understand routing logic
- Check [lib/ga4.ts](./lib/ga4.ts) for GA4 integration details

## Development Tips

### Hot Reload

Next.js supports hot module replacement. Changes to files will automatically refresh the browser.

### Type Safety

Run type checking:
\`\`\`bash
npm run type-check
\`\`\`

### Linting

\`\`\`bash
npm run lint
\`\`\`

### Building

\`\`\`bash
npm run build
\`\`\`

## Architecture Overview

\`\`\`
┌─────────────────────────────────────────┐
│          Next.js Frontend               │
│  (Create tests, view dashboards)        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Next.js API Routes              │
│  (/api/tests/create, /api/stats)        │
└────────┬──────────────────────┬─────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌────────────────┐
│  Cloudflare KV   │   │   GA4 Data API │
│  (Test configs)  │   │  (Statistics)  │
└──────────────────┘   └────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│       Cloudflare Worker                 │
│  (A/B routing at edge)                  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   GA4 Measurement Protocol              │
│  (Event tracking)                       │
└─────────────────────────────────────────┘
\`\`\`

## Questions?

Open an issue on GitHub or check the main README.md for more information.
