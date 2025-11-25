# EdgeSplit Settings Configuration - What You Need to Do

## ✅ What's Been Implemented

I've created a **full settings management system** that allows you to update all credentials through a web interface without redeployment. Here's what's new:

### New Files Created:
1. **`lib/config.ts`** - Handles loading/saving config from Cloudflare KV
2. **`app/api/settings/route.ts`** - API endpoints for getting/updating settings
3. **`app/settings/page.tsx`** - Password-protected UI to edit all credentials

### How It Works:
1. **Configuration Priority:**
   - First: Cloudflare KV storage (editable via Settings page)
   - Fallback: Environment variables (from Vercel/`.env.local`)

2. **Settings Page Features:**
   - Password protection
   - Edit GA4 credentials (Measurement ID, Property ID, API Secret, Service Account)
   - Edit Cloudflare credentials (Account ID, API Token, Namespace ID)
   - Test connections before saving
   - Changes take effect immediately (no redeployment)

---

## 🔧 What You Need to Do

### 1. Add SETTINGS_PASSWORD to Vercel

Go to your Vercel project → **Settings** → **Environment Variables** and add:

```
SETTINGS_PASSWORD=YourSecurePasswordHere
```

**Important:** Choose a strong, unique password. This protects your settings page.

### 2. Redeploy on Vercel

After adding the password:
1. Go to **Deployments** tab
2. Click the **three dots (...)** on the latest deployment
3. Click **Redeploy**

### 3. Access Settings Page

Once redeployed, visit:
```
https://your-project.vercel.app/settings
```

You'll see a password prompt. Enter the password you set in step 1.

### 4. Verify Current Config

After logging in, you'll see your current configuration with masked credentials:
- GA4 Measurement ID: `G-JB0•••••••87K5S`
- GA4 Property ID: `488866743`
- Service Account Email: `edgesplit-data-reader@...`
- Cloudflare Account ID: `37e9•••••••e986a`

### 5. Update Credentials (When Needed)

When you need to change accounts or tokens:
1. Edit the fields in the Settings page
2. Click **"Test GA4 Connection"** or **"Test Cloudflare Connection"**
3. Verify you see green checkmarks ✓
4. Click **"Save Settings"**
5. Changes are live immediately!

---

## 📋 Complete Vercel Environment Variables

Make sure you have ALL these variables set in Vercel:

```bash
# App Configuration
APP_URL=https://your-project.vercel.app
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app

# GA4 Configuration
GA4_MEASUREMENT_ID=G-JB0RD87K5S
GA4_PROPERTY_ID=488866743
GA4_API_SECRET=F9Rksj-uRe-hizG788Pwtg

# Google Service Account (NO OUTER QUOTES!)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"metal-vehicle-343615"...}

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=37e96d2d3c24114d04db9f9198fe986a
CLOUDFLARE_API_TOKEN=hdPudMa5yTsb3vLd0PmCMoh06xuuYKD5ca10KLpG
CLOUDFLARE_KV_NAMESPACE_ID=71e55b66510e4219b071951aaabd9919

# Settings Password (NEW!)
SETTINGS_PASSWORD=YourSecurePasswordHere

# JWT Secret
JWT_SECRET=gH8kL2mN9pQ3rS5tU7vW0xY4zA6bC1dE
```

---

## 🚀 How to Use Going Forward

### Scenario 1: Change GA4 Property
1. Visit `/settings`
2. Update GA4 Measurement ID, Property ID, and/or Service Account
3. Test connection
4. Save
5. All new tests will use the new GA4 property immediately

### Scenario 2: Rotate Cloudflare API Token
1. Generate new token in Cloudflare Dashboard
2. Visit `/settings`
3. Paste new API Token
4. Test connection
5. Save
6. Old token can be deleted from Cloudflare

### Scenario 3: Switch to Different Cloudflare Account
1. Create KV namespace in new account
2. Visit `/settings`
3. Update Account ID, API Token, and Namespace ID
4. Test connection
5. Save
6. All data will now be stored in new account's KV

---

## 🔒 Security Best Practices

1. **Never share your SETTINGS_PASSWORD** - This gives full access to your credentials
2. **Use a password manager** - Generate and store a strong unique password
3. **Rotate tokens regularly** - Change API tokens every 90 days
4. **Monitor access** - Check Cloudflare and Google Cloud audit logs
5. **Test before saving** - Always use "Test Connection" buttons

---

## 🐛 Troubleshooting

### "Invalid password" error
- Verify `SETTINGS_PASSWORD` is set in Vercel environment variables
- Password is case-sensitive
- Redeploy after adding the variable

### Changes not taking effect
- Make sure you clicked "Save Settings"
- Check browser console for errors
- Verify Cloudflare KV is accessible
- Environment variables serve as fallback if KV fails

### Test connection fails
- Double-check credentials are correct
- For GA4: Verify service account has "Viewer" role
- For Cloudflare: Verify API token has "Workers KV:Edit" permission
- Check the error message for specific issues

---

## 📝 Summary

**You now have:**
✅ Editable settings page at `/settings`
✅ Password protection
✅ Test connection buttons
✅ Immediate updates (no redeployment)
✅ Fallback to environment variables

**Next steps:**
1. Add `SETTINGS_PASSWORD` to Vercel
2. Redeploy
3. Visit `/settings` and log in
4. Verify your current config looks correct
5. You're done!

The system is designed to be flexible - you can change accounts/tokens anytime through the Settings page without touching Vercel or redeploying.
