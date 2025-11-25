# EdgeSplit Troubleshooting Guide

## GA4 Integration Issues

### 403 Forbidden Error

**Error Message:**
```
GA4 API error: 403 Forbidden
```

**Cause:** Your service account doesn't have access to the GA4 property.

**Solution:**

1. **Go to GA4 Admin Panel**
   - Navigate to [Google Analytics](https://analytics.google.com/)
   - Select your property
   - Click "Admin" (⚙️ icon in bottom left)

2. **Add Service Account**
   - Under "Property", click "Property Access Management"
   - Click "+" button to add users
   - Enter your service account email: `edgesplit-data-reader@metal-vehicle-343615.iam.gserviceaccount.com`
   - Select role: **Viewer** (read-only access)
   - Click "Add"

3. **Wait 1-2 minutes** for permissions to propagate

4. **Test the connection** in Settings page → "Test GA4 Connection"

### Invalid JWT Signature

**Error Message:**
```
400 {"error":"invalid_grant","error_description":"Invalid JWT Signature."}
```

**Cause:** Private key formatting issues.

**Solution:**

1. **Check your `.env.local` private key format:**
   ```bash
   GA_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----
   ```

2. **Ensure:**
   - Has `\n` (backslash-n) for newlines, NOT actual newlines
   - Starts with `-----BEGIN PRIVATE KEY-----`
   - Ends with `-----END PRIVATE KEY-----`
   - No extra spaces or quotes

3. **If using KV storage** (via Settings page):
   - The system automatically handles newline conversion
   - Just paste the key with actual newlines (from JSON file)

## Testing Your A/B Test

### Force a Specific Variant

To test that variants work correctly, use the debug parameter:

**Force Control:**
```
https://yourdomain.com/entry-path?__edgesplit_force=control
```

**Force Variant A:**
```
https://yourdomain.com/entry-path?__edgesplit_force=variant_a
```

**Force Variant B:**
```
https://yourdomain.com/entry-path?__edgesplit_force=variant_b
```

This will:
- Override the normal bucket assignment
- Set the cookie to the forced variant
- Fire the GA4 view event
- Redirect to the variant URL

### Clear Your Test Cookie

If you're stuck in a variant:

**Chrome DevTools:**
1. F12 → Application tab → Cookies
2. Find cookie named `<test-id>` (e.g., `income-stacking-test`)
3. Delete it
4. Refresh the page

**Or use Incognito mode** for a fresh test.

### Verify GA4 Events

1. **Open GA4 DebugView:**
   - GA4 Admin → DebugView
   - Or: https://analytics.google.com/analytics/web/#/a{account_id}/p{property_id}/reports/realtime-overview

2. **Visit your entry URL** with `?__edgesplit_force=control`

3. **Check for events:**
   - Event name: `ab_test_view` (or your custom event name)
   - Parameter: `bucket: control`

4. **Test conversion:**
   - Visit your thank-you page
   - Check for conversion event: `ab_test_convert`

### Worker Not Redirecting

**Symptoms:** Visiting entry path doesn't redirect

**Checklist:**

1. **Worker is deployed**
   - Cloudflare Dashboard → Workers & Pages
   - Verify worker exists and is published

2. **Route is configured**
   - Cloudflare Dashboard → Websites → Your Domain → Workers Routes
   - Should have: `yourdomain.com/entry-path*` → `your-worker-name`

3. **KV binding is set**
   - Worker Settings → Variables → KV Namespace Bindings
   - Variable name: `AB_TESTS`
   - KV Namespace: Your namespace

4. **Test config exists in KV**
   - KV Dashboard → View Keys
   - Look for: `test:<test-id>`

5. **Test the worker directly:**
   ```bash
   curl -L https://yourdomain.com/entry-path
   ```
   Should return a 302 redirect

## Common Issues

### "Test not found" in Dashboard

**Cause:** Test config not saved to KV properly.

**Solution:**
1. Check KV keys in Cloudflare Dashboard
2. Verify key format: `test:<test-id>`
3. Recreate the test if needed

### Stats Not Updating

**Cause:** GA4 events not being received, or insufficient permissions.

**Solution:**
1. Check GA4 DebugView for incoming events
2. Verify service account has "Viewer" role on property
3. Click "Refresh" button in dashboard (can take 24-48 hours for data to appear)
4. Check browser console for API errors

### Cron Job Not Running

**Vercel Cron:**

1. **Check vercel.json:**
   ```json
   {
     "crons": [{
       "path": "/api/sync",
       "schedule": "*/15 * * * *"
     }]
   }
   ```

2. **Verify deployment:**
   - Cron only works in production
   - Check Vercel Dashboard → Settings → Cron Jobs

3. **Test endpoint manually:**
   ```bash
   curl https://yourapp.vercel.app/api/sync
   ```

### Settings Page Access Denied

**Cause:** Missing or incorrect settings password.

**Solution:**
1. Check `.env.local` for `SETTINGS_PASSWORD`
2. If not set, settings page is open to all (development only!)
3. For production, always set `SETTINGS_PASSWORD` environment variable

## Performance Tips

### Reduce GA4 API Calls

The sync endpoint fetches from GA4 every 15 minutes. To reduce calls:

1. Increase cron interval in `vercel.json`:
   ```json
   "schedule": "0 * * * *"  // Every hour instead
   ```

2. Use KV-cached stats in dashboard (set `refresh=false` in URL)

### Speed Up Dashboard

Stats are cached in KV after each sync. For instant loading:

1. Let cron handle syncing (don't click "Refresh" manually often)
2. The dashboard loads cached data by default
3. Only use "Refresh" button when you need latest data immediately

## Getting Help

If you're still stuck:

1. **Check browser console** for errors (F12)
2. **Check Vercel/Cloudflare logs** for server errors
3. **Enable debug mode:**
   ```bash
   # In .env.local
   DEBUG=true
   ```
4. **Open an issue** on GitHub with:
   - Error message
   - Steps to reproduce
   - Browser console logs
   - Server logs (remove sensitive data!)

## Verification Checklist

Before going live, verify:

- [ ] Service account has "Viewer" access to GA4 property
- [ ] Worker is deployed and route is configured
- [ ] KV binding name is `AB_TESTS` (exact match)
- [ ] Test config exists in KV (`test:<test-id>`)
- [ ] Can force variants using `?__edgesplit_force=control`
- [ ] GA4 events appear in DebugView
- [ ] Conversion tracking works on thank-you page
- [ ] Dashboard shows test stats
- [ ] Cron job is configured (production only)
- [ ] Settings password is set (production only)
