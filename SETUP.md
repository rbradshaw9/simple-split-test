# EdgeSplit - Server-Side A/B Testing Generator

A powerful web-based tool for creating server-side split tests using **Cloudflare Workers** and **Google Analytics 4**. Built with Next.js 14, TypeScript, and TailwindCSS.

## ✨ Features

- **🚀 Zero-Flicker Testing**: Server-side routing at the edge with Cloudflare Workers
- **📊 GA4 Integration**: Real-time analytics powered by Google Analytics 4 Data API
- **🎯 Multi-Variant Support**: Run tests with multiple variants simultaneously
- **📈 Live Dashboard**: View conversions, conversion rates, and lift calculations
- **🔄 Auto-Refresh**: Automated stats updates every 15 minutes
- **⚡ Quick Setup**: Generate Worker code, tracking snippets, and KV configuration automatically

## 🏗️ Architecture

```
Next.js 14 (Frontend + API)
    ↓
Cloudflare KV (Test Storage)
    ↓
Cloudflare Workers (A/B Routing)
    ↓
GA4 Measurement Protocol (Event Tracking)
    ↓
GA4 Data API (Stats Retrieval)
```

## 📋 Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works)
- Google Cloud Project with GA4 configured
- GA4 Property with Measurement Protocol API enabled

## 🚀 Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <your-repo-url>
cd simple-split-test
npm install
\`\`\`

### 2. Configure Environment Variables

Copy the example environment file:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` with your credentials:

\`\`\`env
# Your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# GA4 Configuration
GA4_PROPERTY_ID=123456789
GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Service Account (JSON string or file path)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
# OR
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# GA4 Measurement Protocol API Secret
GA4_API_SECRET=your_api_secret_here

# Cloudflare (Optional - for future automation)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_NAMESPACE_ID=your_kv_namespace_id
\`\`\`

### 3. Set Up Google Cloud & GA4

#### A. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Create a service account with **Viewer** role
5. Create and download JSON key
6. Add the service account email to your GA4 property:
   - GA4 Admin → Property Access Management
   - Add the service account email with **Viewer** permissions

#### B. Get GA4 Credentials

1. **Property ID**: GA4 Admin → Property Settings → Property ID
2. **Measurement ID**: GA4 Admin → Data Streams → Select your stream → Measurement ID (G-XXXXXXXXXX)
3. **API Secret**: GA4 Admin → Data Streams → Select stream → Measurement Protocol → Create

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## 🔧 Setting Up Cloudflare

### 1. Create KV Namespace

\`\`\`bash
# Using Wrangler CLI
wrangler kv:namespace create "AB_TESTS"

# Or via Cloudflare Dashboard:
# Workers & Pages → KV → Create Namespace → Name it "AB_TESTS"
\`\`\`

### 2. Create Worker

1. Go to **Workers & Pages** → **Create application** → **Create Worker**
2. Name it (e.g., `ab-test-router`)
3. Click **Quick Edit** (you'll paste code here after creating a test)

### 3. Bind KV Namespace

In Worker Settings:
1. **Variables** → **Add binding**
2. Variable name: `AB_TESTS`
3. KV namespace: Select your namespace

## 📝 Creating Your First Test

### 1. Use the Web Interface

1. Navigate to http://localhost:3000
2. Fill out the test form:
   - **Test Name**: "Homepage Variant Test"
   - **Entry Path**: `/test-page`
   - **Control URL**: `https://example.com/page-a`
   - **Variant URL**: `https://example.com/page-b`
   - **Traffic Split**: 50/50
   - **GA4 Credentials**: Your measurement ID, property ID, and API secret

3. Click **Generate Test**

### 2. Deploy Generated Code

The app will generate three things:

#### A. Worker Code
Copy the Worker code and paste it into your Cloudflare Worker editor.

#### B. KV Configuration
Store the test configuration in your KV namespace:

\`\`\`bash
# Using Wrangler
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID \\
  "test:homepage_variant_test" \\
  '<json_config_from_app>'
\`\`\`

Or manually via Cloudflare Dashboard: KV → View → Add entry

#### C. Tracking Snippet
Add this to your thank-you/confirmation page:

\`\`\`html
<!-- Place before closing </body> tag -->
<script>
  function getCookie(name) {
    const value = \`; \${document.cookie}\`;
    const parts = value.split(\`; \${name}=\`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  if (typeof gtag !== 'undefined') {
    const bucket = getCookie('homepage_variant_test');
    if (bucket) {
      gtag('event', 'homepage_variant_test_conversion', {
        bucket: bucket
      });
    }
  }
</script>
\`\`\`

### 3. Configure Worker Route

In Cloudflare:
1. Go to **Workers & Pages** → Your Worker → **Settings** → **Triggers**
2. Add Route: `yourdomain.com/test-page*`
3. Save

## 📊 Viewing Results

Navigate to `/tests/[testId]` to see your dashboard with:

- **Views per bucket** (control vs variants)
- **Conversions per bucket**
- **Conversion rates**
- **Lift percentage**
- **Statistical winner**
- **Last updated timestamp**

Click **Refresh Now** to manually fetch latest GA4 data.

## 🗂️ Project Structure

\`\`\`
├── app/
│   ├── api/
│   │   ├── tests/
│   │   │   ├── create/route.ts      # Create new test
│   │   │   └── list/route.ts        # List all tests
│   │   └── stats/[testId]/route.ts  # Fetch GA4 stats
│   ├── tests/[testId]/page.tsx      # Test dashboard
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page
│   └── globals.css                   # Global styles
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── TestForm.tsx                  # Test creation form
│   ├── TestCard.tsx                  # Test list card
│   ├── StatCard.tsx                  # Stat display card
│   └── LoadingSpinner.tsx            # Loading indicator
├── lib/
│   ├── ga4.ts                        # GA4 API integration
│   ├── cloudflare.ts                 # Worker code generator
│   ├── kv.ts                         # KV storage helpers
│   ├── tests.ts                      # Test config logic
│   └── utils.ts                      # Utility functions
├── types/
│   └── Test.ts                       # TypeScript types
├── workers/
│   └── template.ts                   # Worker template
├── .env.example                      # Environment template
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
\`\`\`

## 🔐 Security Notes

- **Never commit `.env`** files with real credentials
- Service account keys should have **minimal permissions** (Viewer only)
- Use **HttpOnly, Secure, SameSite** cookies in production Workers
- Validate all user inputs on the server side
- Consider rate limiting for API routes

## 🚢 Deployment

### Deploy to Vercel

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel Dashboard
\`\`\`

### Deploy Workers to Cloudflare

\`\`\`bash
# Using Wrangler
wrangler publish
\`\`\`

## 📚 How It Works

### 1. User Visits Entry Path
- User navigates to `yourdomain.com/test-page`
- Cloudflare Worker intercepts the request

### 2. Bucket Assignment
- Worker checks for existing cookie
- If no cookie, assigns bucket based on percentages
- Sets cookie with bucket value

### 3. Redirect & Track
- Worker redirects to appropriate URL (control or variant)
- Sends view event to GA4 Measurement Protocol

### 4. Conversion Tracking
- User completes desired action
- Tracking snippet fires conversion event to GA4
- Includes bucket from cookie

### 5. Dashboard
- Fetches events from GA4 Data API
- Parses bucket parameters
- Calculates stats and displays

## 🛠️ Development

\`\`\`bash
# Start dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build
\`\`\`

## ⚡ Advanced Usage

### Multiple Tests

You can run multiple tests simultaneously. Each test gets its own:
- Test ID (slugified name)
- KV entry
- Worker route
- Dashboard URL

### Custom Variants

To add more than one variant, click "Add Variant" in the form. The system supports unlimited variants as long as percentages total 100%.

### Thompson Sampling (Auto-Optimization)

**What is it?**
Thompson Sampling uses Bayesian optimization to automatically allocate more traffic to better-performing variants. Instead of fixed percentages, the system learns which variants convert better and sends them more traffic.

**How to enable:**
1. Check "Enable Thompson Sampling (Auto-Optimization)" when creating a test
2. The configured traffic percentages will be ignored
3. Traffic allocation becomes dynamic based on conversion performance

**Requirements:**
- GA4 API Secret must be configured
- A cron job must sync stats to KV every 15 minutes (see below)
- Test needs at least 100 views per variant before optimization kicks in

**Setting up the cron:**

\`\`\`bash
# Vercel Cron (add to vercel.json)
{
  "crons": [{
    "path": "/api/sync/YOUR_TEST_ID",
    "schedule": "*/15 * * * *"
  }]
}

# Or external cron (cron-job.org, Cloudflare Workers Cron, etc.)
*/15 * * * * curl -X POST https://yourapp.com/api/sync/YOUR_TEST_ID
\`\`\`

**How it works:**
1. Worker requests are assigned variants using Beta distribution sampling
2. Each variant's Beta(α, β) parameters come from conversions and failures
3. Higher conversion rates = higher probability of selection
4. System naturally explores under-tested variants
5. Converges to optimal allocation over time

**When to use:**
- ✅ You want to maximize conversions during the test
- ✅ You have enough traffic (>1000 visits/day recommended)
- ✅ You're willing to accept dynamic allocation instead of fixed splits
- ❌ You need precise 50/50 splits for statistical rigor
- ❌ Your test has very low traffic (<100 visits/day)

### Cron Jobs

Set up a cron to auto-refresh stats:

\`\`\`bash
# Dashboard stats refresh
*/15 * * * * curl https://yourapp.com/api/stats/test-id?refresh=true

# Thompson Sampling KV sync (required for autoOptimize=true)
*/15 * * * * curl -X POST https://yourapp.com/api/sync/test-id
\`\`\`

## 🐛 Troubleshooting

### Events Not Appearing in GA4

- Check GA4 DebugView (Admin → DebugView)
- Verify Measurement Protocol API secret is correct
- Ensure GA4 is installed on all pages (control, variants, confirmation)
- Check cookie is being set correctly

### Worker Not Redirecting

- Verify Worker route is configured correctly
- Check KV namespace binding name is `AB_TESTS`
- Ensure test config is stored in KV with correct key format: `test:testId`

### Stats Show Zero

- Wait 24-48 hours for GA4 to process data
- Check that events are firing in GA4 DebugView
- Verify service account has access to GA4 property

## 📄 License

MIT License - Free for personal and commercial use

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Support

For issues and questions, please open a GitHub issue.

---

Built with ❤️ using Next.js, Cloudflare Workers, and GA4
