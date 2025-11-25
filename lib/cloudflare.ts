import type { Test } from '@/types/Test';
import { env } from './env';

/**
 * Generate Cloudflare Worker code for A/B test routing
 */

export function generateWorkerCode(test: Test): string {
  const optimizationMode = test.autoOptimize ? 'Thompson Sampling (Adaptive)' : 'Static Percentages';

  return `/**
 * EdgeSplit A/B Test Worker
 * Test: ${test.name}
 * Optimization: ${optimizationMode}
 * Generated: ${new Date().toISOString()}
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Load test config from KV
    const testConfigJson = await env.AB_TESTS.get('test:${test.id}');
    if (!testConfigJson) {
      return new Response('Test configuration not found', { status: 404 });
    }
    
    const testConfig = JSON.parse(testConfigJson);
    
    // Check for existing bucket assignment
    const cookie = request.headers.get('Cookie') || '';
    const existingBucket = getBucket(cookie, '${test.id}');
    
    if (existingBucket) {
      // User already assigned - redirect to their bucket
      const targetUrl = getTargetUrl(existingBucket, testConfig);
      await sendGA4Event(testConfig, existingBucket, 'view', request);
      return Response.redirect(targetUrl, 302);
    }
    
    // New user - assign bucket
    let bucket;
    
    if (testConfig.autoOptimize === true) {
      // Thompson Sampling: adaptive allocation based on performance
      const stats = await loadStats(env, testConfig.id, testConfig.variants);
      
      // Check if we have enough data for Thompson Sampling (min 100 views per variant)
      const variantKeys = ['control', ...testConfig.variants.map(v => v.id)];
      const totalViews = variantKeys.reduce((sum, key) => sum + (stats.views[key] || 0), 0);
      const minViewsRequired = variantKeys.length * 100;
      
      if (totalViews >= minViewsRequired) {
        // Enough data - use Thompson Sampling
        bucket = chooseBucketTS(stats, variantKeys);
      } else {
        // Not enough data yet - use static allocation to gather data
        bucket = assignBucket(testConfig);
      }
    } else {
      // Static allocation: use configured percentages
      bucket = assignBucket(testConfig);
    }
    
    const targetUrl = getTargetUrl(bucket, testConfig);
    
    // Set cookie and redirect
    const response = Response.redirect(targetUrl, 302);
    const cookieValue = \`\${testConfig.id}=\${bucket}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax\`;
    response.headers.set('Set-Cookie', cookieValue);
    
    // Send view event to GA4
    await sendGA4Event(testConfig, bucket, 'view', request);
    
    return response;
  }
};

function assignBucket(testConfig) {
  const roll = Math.random() * 100;
  
  // Use cumulative percentages to handle multiple variants correctly
  let cumulative = testConfig.controlPercentage;
  
  if (roll < cumulative) {
    return 'control';
  }
  
  // Iterate through variants and check cumulative percentages
  for (const variant of testConfig.variants) {
    cumulative += variant.percentage;
    if (roll < cumulative) {
      return variant.id;
    }
  }
  
  return 'control'; // Fallback (should never reach if percentages sum to 100)
}

// Thompson Sampling Functions

function gammaSample(shape, scale) {
  if (shape < 1) {
    return gammaSample(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
  }
  
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x, v;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v * scale;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}

function normalSample() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function betaSample(alpha, beta) {
  const x = gammaSample(alpha, 1);
  const y = gammaSample(beta, 1);
  return x / (x + y);
}

async function loadStats(env, testId, variants) {
  const stats = {
    views: { control: 0 },
    conversions: { control: 0 }
  };

  const controlViews = await env.AB_TESTS.get(\`test:\${testId}:views_control\`);
  const controlConversions = await env.AB_TESTS.get(\`test:\${testId}:conversions_control\`);
  
  stats.views.control = controlViews ? parseInt(controlViews, 10) : 0;
  stats.conversions.control = controlConversions ? parseInt(controlConversions, 10) : 0;

  for (const variant of variants) {
    const variantViews = await env.AB_TESTS.get(\`test:\${testId}:views_\${variant.id}\`);
    const variantConversions = await env.AB_TESTS.get(\`test:\${testId}:conversions_\${variant.id}\`);
    
    stats.views[variant.id] = variantViews ? parseInt(variantViews, 10) : 0;
    stats.conversions[variant.id] = variantConversions ? parseInt(variantConversions, 10) : 0;
  }

  return stats;
}

function chooseBucketTS(stats, variantKeys) {
  let best = 'control';
  let bestScore = -1;

  for (const variantId of variantKeys) {
    const views = stats.views[variantId] || 0;
    const conversions = stats.conversions[variantId] || 0;

    const alpha = conversions + 1;
    const beta = (views - conversions) + 1;

    const sample = betaSample(alpha, beta);

    if (sample > bestScore) {
      bestScore = sample;
      best = variantId;
    }
  }

  return best;
}

function getTargetUrl(bucket, testConfig) {
  if (bucket === 'control') {
    return testConfig.controlUrl;
  }
  
  const variant = testConfig.variants.find(v => v.id === bucket);
  return variant ? variant.url : testConfig.controlUrl;
}

function getBucket(cookie, testId) {
  const pattern = new RegExp(\`\${testId}=([^;]+)\`);
  const match = cookie.match(pattern);
  return match ? match[1] : null;
}

async function sendGA4Event(testConfig, bucket, eventType, request) {
  const eventName = eventType === 'view' 
    ? testConfig.eventNames.view 
    : testConfig.eventNames.conversion;
  
  const measurementId = testConfig.ga4.measurementId;
  const apiSecret = testConfig.ga4.apiSecret;
  
  if (!apiSecret) {
    console.log('GA4 API secret not configured, skipping event');
    return;
  }
  
  try {
    // Use stable client ID based on cf-ray or bucket/test combo
    const cfRay = request?.headers.get('cf-ray') || Date.now();
    const clientId = \`\${bucket}_\${testConfig.id}_\${cfRay}\`.substring(0, 36);
    
    const payload = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: {
          bucket: bucket,
          test_id: testConfig.id,
          session_id: \`\${Date.now()}\`,
        }
      }]
    };
    
    await fetch(
      \`https://www.google-analytics.com/mp/collect?measurement_id=\${measurementId}&api_secret=\${apiSecret}\`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  } catch (error) {
    console.error('Failed to send GA4 event:', error);
  }
}`;
}

export function generateKVSetupInstructions(test: Test): string {
  return `# Cloudflare KV Setup

## 1. Store Test Configuration

Use the Cloudflare dashboard or wrangler CLI to add this to your KV namespace:

**Key:** \`test:${test.id}\`

**Value:**
\`\`\`json
${JSON.stringify(test, null, 2)}
\`\`\`

## 2. Update Tests Index

**Key:** \`tests_index\`

Add this entry to the existing index (or create it if it doesn't exist):
\`\`\`json
{
  "${test.entryPath}": {
    "id": "${test.id}",
    "entryPath": "${test.entryPath}"
  }
}
\`\`\`

## 3. Worker Bindings

In your Worker settings, ensure you have:
- Variable name: \`AB_TESTS\`
- KV namespace: Your KV namespace ID

## 4. Using wrangler CLI (Alternative)

\`\`\`bash
# Store test config
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID \\
  "test:${test.id}" \\
  '${JSON.stringify(test).replace(/'/g, "'\\''")}'

# Update tests index (requires fetching current value first)
wrangler kv:key get --namespace-id=YOUR_NAMESPACE_ID "tests_index"
# Edit the JSON and put it back
\`\`\`
`;
}

export function generateWorkerRoutesConfig(test: Test, domain: string): string {
  return `# Cloudflare Worker Routes Configuration

Add this route in your Cloudflare Dashboard:

**Route Pattern:** \`${domain}${test.entryPath}*\`
**Worker:** Select your deployed worker

Or using wrangler.toml:

\`\`\`toml
routes = [
  { pattern = "${domain}${test.entryPath}*", zone_name = "${domain.replace(/^https?:\/\//, '')}" }
]
\`\`\`

This will intercept all traffic to:
- ${domain}${test.entryPath}
- ${domain}${test.entryPath}/anything
- ${domain}${test.entryPath}?query=params
`;
}
