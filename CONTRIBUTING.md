# Contributing to EdgeSplit

Thank you for your interest in contributing!  
EdgeSplit is designed to be simple, extensible, and developer-friendly.  
We welcome contributions of all kinds — features, bug fixes, documentation, and ideas.

---

## 🧭 How to Contribute

### 1. Fork the Repository
Create your own fork of the repo and clone it locally:

```bash
git clone https://github.com/YOUR_USERNAME/edgesplit.git
cd edgesplit
2. Install Dependencies
bash
Copy code
npm install
3. Create a Branch
Use a meaningful branch name:

bash
Copy code
git checkout -b feature/add-ga4-visualizations
4. Make Your Changes
Write clean, readable, well-documented code.
If you add new config fields or API fields, update the relevant types in /types.

5. Run Tests (if applicable)
bash
Copy code
npm run test
6. Lint & Format
bash
Copy code
npm run lint
npm run lint --fix
7. Commit with a Clear Message
bash
Copy code
git commit -m "Add GA4 trend chart to dashboard"
8. Push & Create a Pull Request
bash
Copy code
git push origin feature/add-ga4-visualizations
Open a PR on GitHub and include:

Description of changes

Screenshots (if UI changes)

Any breaking changes

Testing steps

🧱 Architecture Overview
Tech Stack
Next.js 14 (App Router)

TypeScript

TailwindCSS + shadcn/ui

Cloudflare Workers

Cloudflare KV

GA4 Data API

Key Folders
/app → UI pages

/api → API routes

/lib → core logic (GA4 client, Worker generator)

/workers → Worker templates

/types → shared TypeScript interfaces

## 🧪 Adding a New Feature
Add/update test configuration fields in `/types/Test.ts`

Update the KV schema if needed in `/lib/kv.ts`

Update the create-test API in `/app/api/tests/create/route.ts`

Add UI to TestForm in `/components/TestForm.tsx`

Add Worker template dynamic fields in `/lib/cloudflare.ts` and `/workers/template.ts`

Update dashboard to support new metrics or buckets in `/app/tests/[testId]/page.tsx`

Document the change in `API_REFERENCE.md` and `SETUP.md`

### Recent Features

**Thompson Sampling (Auto-Optimization)**
- Added in November 2025
- Uses Bayesian optimization to dynamically allocate traffic
- Enable via `autoOptimize: true` in test config
- Worker pulls stats from KV updated by `/api/sync/[testId]` cron
- See `PROMPT_ADD_THOMPSON_SAMPLING.md` for implementation details

🐞 Reporting Bugs
Open an issue with:

Steps to reproduce

Expected vs actual behavior

Environment (browser, OS)

Screenshots or logs if available

💬 Discussions
Use GitHub Discussions to propose:

Architecture changes

New dashboard widgets

Enhanced Worker routing logic

Multi-arm bandit features

Thanks again for contributing!
Your help makes EdgeSplit a more powerful tool for everyone.

yaml
Copy code
