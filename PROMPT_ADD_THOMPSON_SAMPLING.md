# 🔥 Add Thompson Sampling to EdgeSplit (Server-Side A/B Testing Engine)

This document describes exactly how to add **Thompson Sampling** to the EdgeSplit A/B testing tool.  
The logic must run in the **Cloudflare Worker** so that each incoming request is allocated intelligently based on its conversion probability.

---

# 🎯 Our Goal

Implement **adaptive traffic allocation** using **Thompson Sampling**, replacing fixed percentage splits for tests where "autoOptimize" is enabled.

Thompson Sampling must:

1. Use GA4-reported conversions + view counts stored in Cloudflare KV.
2. Compute Beta distributions on each request.
3. Sample each variant’s Beta distribution.
4. Route the user to the variant with the highest sample.
5. Set/maintain a cookie so each user consistently stays in the same bucket.
6. Allow fallback to fixed %, if the user selects “Static Weights” in the UI.

---

# 📦 Where the Logic Belongs

## Cloudflare Worker  
Location: `/workers/template.ts` (or where the Worker is generated)

### Worker Responsibilities:
- Load test configuration from KV.
- Load test performance stats from KV (views/conversions).
- Apply Thompson Sampling logic to choose a variant *if* `test.autoOptimize === true`.
- Otherwise, use static percentage allocation.
- Redirect the user.
- Fire GA4 "view" events.

---

# 📊 Data Provided to the Worker

From KV (previously updated by stats cron):

test:<id>:views_control
test:<id>:views_variant
test:<id>:conversions_control
test:<id>:conversions_variant

yaml
Copy code

KV values are integers.

---

# 🧠 Thompson Sampling Formula

For each variant:

alpha = conversions + 1
beta = failures + 1
failures = views - conversions

makefile
Copy code

Then:

sample = draw from Beta(alpha, beta)

yaml
Copy code

The variant with the **highest sample** wins the request.

---

# 🧮 Required Implementation Pieces

## 1. betaSample(alpha, beta)
A Javascript implementation of Beta distribution sampling.

Use this NIST-approved implementation based on:

Gamma sampling → Beta = (X / (X+Y))

cpp
Copy code

Add this to Worker:

```js
function gammaSample(shape, scale) {
  // Marsaglia & Tsang method
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x = Math.random();
    let y = Math.pow(x, 1/3);
    let z = Math.random();
    let v = Math.pow(1 + c * y, 3);

    if (v > 0 && Math.log(z) < 0.5 * y * y + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}

function betaSample(alpha, beta) {
  const x = gammaSample(alpha, 1);
  const y = gammaSample(beta, 1);
  return x / (x + y);
}
2. Thompson Sampling Decision Function
Add:

js
Copy code
function chooseBucketTS(stats, variants) {
  // stats = { views: {...}, conversions: {...} }
  // variants = [ "control", "variant1", ... ]

  let best = null;
  let bestScore = -1;

  for (const v of variants) {
    const views = stats.views[v] || 0;
    const conversions = stats.conversions[v] || 0;

    const alpha = conversions + 1;
    const betaVal = (views - conversions) + 1;

    const sample = betaSample(alpha, betaVal);

    if (sample > bestScore) {
      bestScore = sample;
      best = v;
    }
  }

  return best; // returns ID of winning bucket
}
3. Worker Logic Update
Modify bucket assignment logic:

js
Copy code
let bucket = getCookieBucket(...);

if (!bucket) {
  if (test.autoOptimize === true) {
    // Load stats from KV
    const stats = await loadStats(env, test.id);
    
    // Collect variant IDs: ["control", "variant1", "variant2", ...]
    const variantKeys = ["control", ...test.variants.map(v => v.id)];

    // Thompson sampling decision
    bucket = chooseBucketTS(stats, variantKeys);
  } else {
    // Use static weights
    bucket = chooseBucketStatic(test);
  }

  // Set cookie
  setBucketCookie(bucket);
}
4. Loading Stats from KV
Add helper:

js
Copy code
async function loadStats(env, testId) {
  const views_control = parseInt(await env.AB_TESTS.get(`test:${testId}:views_control`) || "0");
  const views_variant = parseInt(await env.AB_TESTS.get(`test:${testId}:views_variant`) || "0");
  const conv_control = parseInt(await env.AB_TESTS.get(`test:${testId}:conversions_control`) || "0");
  const conv_variant = parseInt(await env.AB_TESTS.get(`test:${testId}:conversions_variant`) || "0");

  return {
    views: {
      control: views_control,
      variant: views_variant
    },
    conversions: {
      control: conv_control,
      variant: conv_variant
    }
  };
}
If multiple variants exist, expand this to loop over variant IDs.

🧩 UI Integration (Next.js)
In the Create Test form (TestForm.tsx):

Add:

scss
Copy code
[ ] Enable auto-optimization (Thompson Sampling)
Backend stores:

vbnet
Copy code
autoOptimize: true | false
Dashboard should display:

"Optimization Mode: Thompson Sampling"

Use sampled allocation chart (optional)

Show estimated weights (samples from 1,000 Monte Carlo draws using GA4 stats)

🧪 Testing the Implementation
Create a test with autoOptimize=true

Push Worker code (or use API to deploy in future versions)

As traffic flows:

Stats API updates GA4 stats every 15 min

Worker pulls KV stats

Worker dynamically shifts traffic

Dashboard should display:

Views

Conversions

Conversion rates

Winner

Estimated traffic share

👍 Acceptance Criteria
 Worker selects bucket via Thompson Sampling when autoOptimize=true

 Users remain sticky via cookie

 Static allocation still works when autoOptimize=false

 Supports multiple variants

 Pulls conversion stats from KV

 Beta sampling works correctly

 Dashboard reflects TS mode

📦 DONE
Follow this spec exactly.
Add the Thompson Sampling support and integrate into the Worker and the test-creation flow.