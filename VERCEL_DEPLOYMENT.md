# Vercel Deployment Guide

## Prerequisites

- Vercel account (free tier is sufficient)
- Code pushed to GitHub
- All environment variables ready (see below)

---

## Deployment Steps

### 1. Push to GitHub

First, commit and push your code:

```bash
cd "/Users/ryanbradshaw/Git Projects/simple-split-test"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: EdgeSplit A/B Testing Tool with Thompson Sampling"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/rbradshaw9/simple-split-test.git

# Push to main branch
git push -u origin main
```

### 2. Connect to Vercel

#### Option A: Vercel Dashboard (Recommended)

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository: `rbradshaw9/simple-split-test`
4. Vercel will auto-detect Next.js configuration
5. **Do NOT deploy yet** - we need to add environment variables first

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project (but don't deploy yet)
vercel link
```

### 3. Configure Environment Variables in Vercel

**Critical**: Add these environment variables in Vercel Dashboard before deploying:

Go to: **Project Settings → Environment Variables**

Add each of these:

#### GA4 Configuration
```bash
GA4_MEASUREMENT_ID=G-JB0RD87K5S
GA4_PROPERTY_ID=488866743
GA4_API_SECRET=F9Rksj-uRe-hizG788Pwtg
```

#### Google Service Account
```bash
GOOGLE_SERVICE_ACCOUNT_KEY='YOUR_COMPLETE_SERVICE_ACCOUNT_JSON_HERE'
```

**Note**: Use your actual service account JSON from `.env.local`. Must be one line with escaped newlines.

**Important**: When pasting the service account key in Vercel:
- Keep the single quotes around the entire JSON
- Paste as one continuous line (no line breaks)
- Make sure all `\n` characters are preserved in the private_key

#### Cloudflare Configuration
```bash
CLOUDFLARE_ACCOUNT_ID=37e96d2d3c24114d04db9f9198fe986a
CLOUDFLARE_API_TOKEN=hdPudMa5yTsb3vLd0PmCMoh06xuuYKD5ca10KLpG
CLOUDFLARE_KV_NAMESPACE_ID=71e55b66510e4219b071951aaabd9919
```

#### Application URLs (Update after deployment)
```bash
APP_URL=https://your-project.vercel.app
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
JWT_SECRET=your_random_secret_key_here
```

**Note**: You can generate a JWT secret with:
```bash
openssl rand -base64 32
```

### 4. Deploy

#### Option A: Dashboard
Click **"Deploy"** in the Vercel dashboard

#### Option B: CLI
```bash
vercel --prod
```

### 5. Update Production URLs

After deployment, you'll get a URL like: `https://edgesplit-abc123.vercel.app`

Go back to **Environment Variables** and update:
```bash
APP_URL=https://edgesplit-abc123.vercel.app
NEXT_PUBLIC_APP_URL=https://edgesplit-abc123.vercel.app
```

Then redeploy for changes to take effect.

### 6. Verify Deployment

Visit your deployment URL and check:
- ✅ Homepage loads
- ✅ Can create a test
- ✅ Test appears in list
- ✅ Dashboard loads for a test
- ✅ No console errors

### 7. Set Up Cron Jobs (For Thompson Sampling)

If you're using Thompson Sampling, add cron configuration:

Create `vercel.json` in your project root (already created):

```json
{
  "crons": [{
    "path": "/api/sync/:testId",
    "schedule": "*/15 * * * *"
  }]
}
```

**Note**: Vercel Cron requires Pro plan. Alternatives:
- Use [cron-job.org](https://cron-job.org) (free)
- Use Cloudflare Workers Cron Triggers
- Use GitHub Actions with scheduled workflows

---

## Post-Deployment Tasks

### 1. Test GA4 Integration
Create a test and verify GA4 events are being sent:
- Check GA4 Realtime reports
- Verify custom events appear

### 2. Test Cloudflare KV
Verify tests are stored in Cloudflare KV:
```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/37e96d2d3c24114d04db9f9198fe986a/storage/kv/namespaces/71e55b66510e4219b071951aaabd9919/keys" \
  -H "Authorization: Bearer hdPudMa5yTsb3vLd0PmCMoh06xuuYKD5ca10KLpG"
```

### 3. Deploy Your First Worker
1. Create a test in EdgeSplit
2. Copy the generated Worker code
3. Deploy to Cloudflare Workers
4. Configure Worker routes in Cloudflare

### 4. Set Up Custom Domain (Optional)
In Vercel:
- Go to **Settings → Domains**
- Add your custom domain
- Update DNS records as instructed
- Update `APP_URL` environment variables

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Check that Node.js version is >= 18.0.0

### Environment Variables Not Working
- Make sure variables are added to **Production** environment
- Redeploy after adding/changing variables
- Check for typos in variable names

### GA4 Not Receiving Data
- Verify service account has Viewer role in GA4
- Check GA4_PROPERTY_ID is correct
- Look for errors in Vercel function logs

### Cloudflare KV Errors
- Verify API token has KV permissions
- Check account ID and namespace ID are correct
- Test token with curl command above

---

## Security Recommendations

1. ✅ **Already done**: `.env.local` is gitignored
2. ⚠️ **Use Vercel's environment variable encryption** (automatic)
3. ⚠️ **Rotate secrets periodically** (API tokens, service account keys)
4. ⚠️ **Use different service accounts** for dev/staging/prod
5. ⚠️ **Enable Vercel's security features** (CORS, rate limiting)
6. ⚠️ **Set up monitoring** (Vercel Analytics, Sentry)

---

## Environment Variables Summary

For quick reference, here are all the variables you need in Vercel:

| Variable | Value | Required |
|----------|-------|----------|
| `GA4_MEASUREMENT_ID` | `G-JB0RD87K5S` | ✅ Yes |
| `GA4_PROPERTY_ID` | `488866743` | ✅ Yes |
| `GA4_API_SECRET` | `F9Rksj-uRe-hizG788Pwtg` | ✅ Yes |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `{...}` (full JSON) | ✅ Yes |
| `CLOUDFLARE_ACCOUNT_ID` | `37e96d2d3c24114d04db9f9198fe986a` | ✅ Yes |
| `CLOUDFLARE_API_TOKEN` | `hdPudMa5yTsb3vLd0PmCMoh06xuuYKD5ca10KLpG` | ✅ Yes |
| `CLOUDFLARE_KV_NAMESPACE_ID` | `71e55b66510e4219b071951aaabd9919` | ✅ Yes |
| `APP_URL` | `https://your-project.vercel.app` | ✅ Yes |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | ✅ Yes |
| `JWT_SECRET` | Generate with `openssl rand -base64 32` | ⚠️ Recommended |

---

## Managing Configuration

### Via Settings Page (Recommended) 🎯

After deployment, you can manage all credentials through the web UI:

1. Visit `https://your-project.vercel.app/settings`
2. Enter your `SETTINGS_PASSWORD`
3. Update any credentials (GA4, Cloudflare, etc.)
4. Click "Test Connection" to verify
5. Click "Save Settings"

**Benefits:**
- ✅ Changes take effect immediately (no redeployment)
- ✅ Test connections before saving
- ✅ Stored in Cloudflare KV (fast, global)
- ✅ Environment variables serve as fallback

### Via Vercel Dashboard

Alternatively, update environment variables in Vercel:
1. Go to Project Settings → Environment Variables
2. Edit the variable
3. **Must redeploy** for changes to take effect

---

## Quick Deploy Checklist

- [ ] Push code to GitHub
- [ ] Connect repository to Vercel
- [ ] Add all environment variables in Vercel dashboard (including SETTINGS_PASSWORD!)
- [ ] Deploy
- [ ] Update APP_URL and NEXT_PUBLIC_APP_URL with production URL
- [ ] Redeploy
- [ ] Visit `/settings` and set a secure password
- [ ] Test: Create a test
- [ ] Test: View dashboard
- [ ] Test: Verify KV storage
- [ ] Set up cron jobs (if using Thompson Sampling)
- [ ] Deploy first Cloudflare Worker
- [ ] Configure Worker routes
- [ ] Monitor for errors

---

## Security Notes

1. **Always set SETTINGS_PASSWORD** - Without it, anyone can edit your config
2. Use a strong, unique password (not your Vercel password)
3. Never commit credentials to Git
4. Regularly rotate API tokens
5. Monitor access logs

---

## Support

If you encounter issues:
1. Check Vercel function logs
2. Review browser console for errors
3. Verify environment variables are set correctly
4. Test API endpoints manually with curl
5. Check documentation: `ENV_SETUP.md`, `API_REFERENCE.md`

**You're ready to deploy!** 🚀
