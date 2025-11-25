---

# 🛡️ **SECURITY.md**

```markdown
# Security Policy

EdgeSplit is designed for controlled environments where developers generate Cloudflare Worker scripts and GA4 connections manually. Even so, security is a top priority.

---

## 🔐 Supported Versions

We support and release security updates for the latest **major version** of EdgeSplit.

| Version | Supported |
|--------|-----------|
| Latest | ✔️ |
| Older  | ❌ |

---

## 🔒 Reporting a Vulnerability

If you discover a security issue:

### **Email:**  
security@yourdomain.com

### Include the following:

- Description of the vulnerability  
- Steps to reproduce  
- Impact (data exposure, bypass, etc.)  
- Suggested fix (optional)

We will:
1. Acknowledge your email within 24 hours.  
2. Investigate and verify the issue.  
3. Provide an estimated timeline for a fix.  
4. Credit you in release notes (optional).  

---

## 🧩 Common Areas of Risk

### 1. Cloudflare Worker Deployment
Workers must be:
- deployed only from trusted environments  
- bound to the correct KV namespace  
- scoped to valid routes  
- protected by Cloudflare DNS proxying  

### 2. GA4 API Secrets
Ensure:
- service account keys are stored in environment variables  
- never commit keys to Git  
- restrict property permissions to essential scopes  

### 3. Test Configuration KV
Test configurations may contain:
- redirect URLs  
- Google Analytics IDs  
- Worker routing paths  
- Thompson Sampling performance data (views/conversions per variant)

Access should be restricted to:
- authorized team members  
- your Vercel app  
- your Cloudflare Worker / API routes  

### 4. Thompson Sampling KV Data
When autoOptimize is enabled, performance stats are stored in KV:
- `test:{testId}:views_control`
- `test:{testId}:conversions_control`
- `test:{testId}:views_{variantId}`
- `test:{testId}:conversions_{variantId}`

These keys should be:
- updated only by authenticated API routes (`/api/sync/[testId]`)
- read-only for Workers
- not exposed to public endpoints  

---

## 🚨 Responsible Disclosure

We appreciate responsible reporters who:
- do not exploit vulnerabilities  
- report privately  
- allow time for fixes before public disclosure  

---

## 🔐 Hardening Recommendations

- Use Cloudflare Access for the dashboard if it’s internal  
- Restrict API endpoints using API keys  
- Enable GitHub branch protection rules  
- Protect service account routes with server-side sessions  

---

Thank you for helping keep EdgeSplit secure.