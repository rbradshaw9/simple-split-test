📘 EdgeSplit — Server-Side A/B Testing Generator with GA4 Dashboard

EdgeSplit is a lightweight, developer-friendly tool for creating server-side split tests using Cloudflare Workers, with a clean, modern dashboard powered by Google Analytics 4.

Easily generate:

A/B routing Workers

Tracking snippets

Test configuration

Stats dashboards

Auto-refresh metrics

Multiple variant support

EdgeSplit lets marketers run experiments without touching Cloudflare or Analytics, while giving developers a clean, extensible architecture.

🚀 Features
✓ Create A/B tests instantly

Input:

Test name

Control + Variant URLs

Traffic percentages

GA4 Measurement details

Entry URL path

The system generates:

Cloudflare Worker code

KV key structure

Setup instructions

Tracking snippet for thank-you page

✓ Server-side routing (no flicker, no JS)

All visitors are bucketed at the edge using Cloudflare Workers.
Tests are stable, fast, and SEO-safe.

✓ Clean GA4-backed stats dashboard

Realtime dashboard shows:

Views per bucket

Conversions per bucket

Conversion rates

Lift %

Current winner

Last refresh time

Supports:

Manual refresh

Auto refresh (cron) every 15–30 mins

✓ Unlimited tests

Each test is stored in KV with its own:

Test config

GA4 event names

Dashboard URL

Multiple experiments can run simultaneously.

✓ Extensible architecture

The system is built using:

Next.js (frontend + API)

Cloudflare Workers (edge routing)

Cloudflare KV (test configs + optional caching)

Google Analytics 4 Data API (stats)

TailwindCSS + shadcn/ui (UI)

Perfect for customization and team use.

🏗️ Project Structure
/app
  /page.tsx                → Create Test UI
  /tests
    /[testId]/page.tsx     → Dashboard for a single test
  /api
    /tests
      /create/route.ts     → Create a new test
      /list/route.ts       → List all tests
    /stats
      /[testId]/route.ts   → Pull GA4 stats

/components
  TestForm.tsx
  TestCard.tsx
  StatCard.tsx
  LoadingSpinner.tsx

/lib
  ga4.ts                   → GA4 Data API client
  cloudflare.ts            → Worker template generator
  kv.ts                    → Cloudflare KV helpers
  tests.ts                 → Validation + config helpers

/workers
  template.ts              → Base Worker template

/types
  Test.ts                  → Test interface/schema

.env.example               → Environment vars template
.env.local                 → Your actual credentials (create from .env.example)
ENV_SETUP.md               → Detailed environment configuration guide
README.md                  → You are here

🔧 Installation
1. Clone the repository
git clone https://github.com/yourname/edgesplit.git
cd edgesplit

2. Install dependencies
npm install

3. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Fill in your credentials:
- **GA4_MEASUREMENT_ID** - Your GA4 measurement ID (G-XXXXXXXXXX)
- **GA4_PROPERTY_ID** - Your GA4 property ID (numeric)
- **GA4_API_SECRET** - GA4 Measurement Protocol API secret
- **GOOGLE_SERVICE_ACCOUNT_KEY** - Complete service account JSON (one-line, escaped)
- **CLOUDFLARE_ACCOUNT_ID** - Your Cloudflare account ID (optional for dev)
- **CLOUDFLARE_API_TOKEN** - Cloudflare API token with KV permissions (optional for dev)
- **CLOUDFLARE_KV_NAMESPACE_ID** - KV namespace ID (optional for dev)

**📖 For detailed setup instructions, see [ENV_SETUP.md](./ENV_SETUP.md)**

4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app

⚙️ Cloudflare Setup
1. Create a KV namespace

Inside Cloudflare dashboard → Workers & Pages → KV → “Create Namespace”

Name it:

AB_TESTS

2. Bind the KV to your Worker

In the Worker settings:

Binding Name: AB_TESTS

Namespace: (select the created namespace)

3. Configure Worker routes

Example:

go.example.com/income-stacking-webclass*
go.example.com/ab-convert*
split.example.com/*

4. Deploy Worker

Deploy via Cloudflare UI or wrangler CLI.

✨ Creating a Test

Go to the tool’s homepage:

https://yourdeployment.com/


Fill out:

Test name

Entry path

Control URL

Variants

Percentages

GA4 details

Click Generate Test

You’ll get:

Worker code

Setup instructions

Tracking snippet

Dashboard URL

Paste Worker code into Cloudflare → Done.

📊 Stats Dashboard

For each test:

https://yourdeployment.com/tests/<testId>


Displays:

Control + variant views

Control + variant conversions

Conversion rates

Percentage lift

Winner

Last updated

Manual refresh button

Stats pulled directly from GA4’s Data API.

🔁 Auto-Refresh (Optional)

Add a cron job (Vercel or Cloudflare):

*/15 * * * *


It will:

Call /api/stats/[testId]?refresh=true

Cache results in KV

Dashboard loads instantly

🧪 How A/B Routing Works (Worker)

Worker reads cookie: <testId>=bucket

If missing → assigns bucket using percentages

Stores bucket in cookie for consistency

Redirects to correct URL

Sends GA4 view event on each redirect

Confirmation page triggers conversion event to GA4

No JavaScript needed on landing pages.

🛠️ Development
Start dev server
npm run dev

Lint + fix
npm run lint
npm run lint --fix

Build
npm run build

🤝 Contributing

Pull requests welcome!
For major changes, open an issue to discuss first.

📝 License

MIT License — free for personal and commercial use.