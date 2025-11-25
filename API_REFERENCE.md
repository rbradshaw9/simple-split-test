# EdgeSplit API Reference

This document describes all API routes used by the EdgeSplit tool, including request payloads and responses.

Base URL:
https://yourdeployment.com/api

pgsql
Copy code

---

# 📌 `/api/tests/create`

**Method:** `POST`  
**Description:** Creates a new A/B test, stores configuration in KV, and returns Worker code + setup instructions.

### Request Body

```json
{
  "name": "Income Stacking Test",
  "entryPath": "/income-stacking-webclass",
  "controlUrl": "https://go.example.com/pageA",
  "variants": [
    { "url": "https://training.example.com/", "percentage": 50 }
  ],
  "controlPercentage": 50,
  "ga4MeasurementId": "G-123456",
  "ga4PropertyId": "123456789",
  "ga4ApiSecret": "your_api_secret_here",
  "autoOptimize": false
}
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Display name for the test |
| entryPath | string | Yes | URL path that triggers the test (e.g., "/test-page") |
| controlUrl | string | Yes | The control (original) URL to redirect to |
| controlPercentage | number | Yes* | Traffic percentage for control (0-100). *Ignored if autoOptimize=true |
| variants | array | Yes | Array of variant configurations |
| variants[].url | string | Yes | The variant URL to redirect to |
| variants[].percentage | number | Yes* | Traffic percentage for this variant (0-100). *Ignored if autoOptimize=true |
| ga4MeasurementId | string | Yes | GA4 Measurement ID (G-XXXXXXXXXX) |
| ga4PropertyId | string | Yes | GA4 Property ID (numeric) |
| ga4ApiSecret | string | No | GA4 Measurement Protocol API secret (required for Worker event tracking) |
| autoOptimize | boolean | No | Enable Thompson Sampling for adaptive traffic allocation (default: false) |

### Response
```json
{
  "success": true,
  "testId": "income_stacking_test",
  "test": { /* full test configuration */ },
  "workerCode": "<cloudflare worker code>",
  "trackingSnippet": "<script>...</script>",
  "setupInstructions": "Step-by-step setup text...",
  "dashboardUrl": "https://yourdeployment.com/tests/income_stacking_test"
}
📌 /api/tests/list
Method: GET
Description: Returns all tests stored in KV.

Response
json
Copy code
[
  {
    "id": "income_stacking_test",
    "name": "Income Stacking Test",
    "entryPath": "/income-stacking-webclass",
    "createdAt": 1732550000
  }
]
📌 /api/stats/[testId]
Method: GET
Description: Fetches GA4 stats (views and conversions per bucket).

Optional Query Params
Param	Description
refresh=true	Forces a GA4 pull and caches it

Response
json
Copy code
{
  "testId": "income_stacking_test",
  "views": {
    "control": 3248,
    "variant": 3181
  },
  "conversions": {
    "control": 172,
    "variant": 211
  },
  "conversionRates": {
    "control": 0.0529,
    "variant": 0.0663
  },
  "winner": "variant",
  "liftPercent": 25.4,
  "lastUpdated": 1732550910
}
📌 /api/sync/[testId]
Method: POST
Description: Syncs GA4 stats to KV for Thompson Sampling Worker consumption. Should be called by cron every 15 minutes for tests with autoOptimize=true.

Response
json
Copy code
{
  "success": true,
  "testId": "income_stacking_test",
  "syncedAt": 1732550910,
  "stats": {
    "control": {
      "views": 3248,
      "conversions": 172
    },
    "variants": [
      {
        "id": "variant1",
        "views": 3181,
        "conversions": 211
      }
    ]
  }
}
Method: GET
Description: Check current KV sync status for a test.

Response
json
Copy code
{
  "success": true,
  "testId": "income_stacking_test",
  "autoOptimize": true,
  "lastUpdated": 1732550910,
  "kvData": {
    "control": {
      "views": 3248,
      "conversions": 172
    },
    "variants": {
      "variant1": {
        "views": 3181,
        "conversions": 211
      }
    }
  }
}
📌 /api/ga4/proxy (optional)
Method: POST
Description: Server-side proxy for GA4 API calls if you need client-side GA4 analysis.

📌 Error Responses
All endpoints may return:

json
Copy code
{
  "error": "Message"
}
With standard HTTP codes:

400 invalid input

404 test not found

500 server error

