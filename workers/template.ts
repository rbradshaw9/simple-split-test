/**
 * Generic Cloudflare Worker Template for EdgeSplit A/B Testing
 * This template can be customized per test
 */

// Cloudflare Worker types (this file is not actually deployed, it's a template)
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface WorkerEnv {
  AB_TESTS: KVNamespace;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Load tests index from KV
      const testsIndexJson = await env.AB_TESTS.get('tests_index');
      
      if (!testsIndexJson) {
        return new Response('No tests configured', { status: 404 });
      }

      const testsIndex = JSON.parse(testsIndexJson);
      
      // Find matching test by path
      const testEntry = testsIndex[path] || 
        Object.values(testsIndex).find((entry: any) => 
          path.startsWith(entry.entryPath)
        );

      if (!testEntry) {
        return new Response('No test found for this path', { status: 404 });
      }

      // Load full test configuration
      const testConfigJson = await env.AB_TESTS.get(`test:${testEntry.id}`);
      
      if (!testConfigJson) {
        return new Response('Test configuration not found', { status: 404 });
      }

      const testConfig = JSON.parse(testConfigJson);

      // Check for existing bucket in cookie
      const cookie = request.headers.get('Cookie') || '';
      const existingBucket = getBucket(cookie, testConfig.id);

      if (existingBucket) {
        // User already bucketed
        const targetUrl = getTargetUrl(existingBucket, testConfig);
        await sendGA4Event(testConfig, existingBucket, 'view');
        return Response.redirect(targetUrl, 302);
      }

      // New user - assign bucket
      let bucket: string;
      
      if (testConfig.autoOptimize === true) {
        // Thompson Sampling: adaptive allocation based on performance
        const stats = await loadStats(env, testConfig.id, testConfig.variants);
        const variantKeys = ['control', ...testConfig.variants.map((v: any) => v.id)];
        bucket = chooseBucketTS(stats, variantKeys);
      } else {
        // Static allocation: use configured percentages
        bucket = assignBucket(testConfig);
      }
      
      const targetUrl = getTargetUrl(bucket, testConfig);

      // Create response with cookie
      const response = Response.redirect(targetUrl, 302);
      const cookieValue = `${testConfig.id}=${bucket}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`;
      response.headers.set('Set-Cookie', cookieValue);

      // Track view event
      await sendGA4Event(testConfig, bucket, 'view');

      return response;
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
};

/**
 * Assign a bucket based on test configuration percentages (static allocation)
 */
function assignBucket(testConfig: any): string {
  const roll = Math.random() * 100;
  
  if (roll < testConfig.controlPercentage) {
    return 'control';
  }

  let cumulativePercentage = testConfig.controlPercentage;
  
  for (const variant of testConfig.variants) {
    cumulativePercentage += variant.percentage;
    if (roll < cumulativePercentage) {
      return variant.id;
    }
  }

  return 'control'; // Fallback
}

/**
 * Gamma distribution sampling using Marsaglia & Tsang method
 */
function gammaSample(shape: number, scale: number): number {
  if (shape < 1) {
    // Use shape > 1 algorithm and adjust
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

/**
 * Normal distribution sampling using Box-Muller transform
 */
function normalSample(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Beta distribution sampling
 */
function betaSample(alpha: number, beta: number): number {
  const x = gammaSample(alpha, 1);
  const y = gammaSample(beta, 1);
  return x / (x + y);
}

/**
 * Load performance stats from KV for Thompson Sampling
 */
async function loadStats(env: WorkerEnv, testId: string, variants: any[]): Promise<any> {
  const stats: any = {
    views: { control: 0 },
    conversions: { control: 0 }
  };

  // Load control stats
  const controlViews = await env.AB_TESTS.get(`test:${testId}:views_control`);
  const controlConversions = await env.AB_TESTS.get(`test:${testId}:conversions_control`);
  
  stats.views.control = controlViews ? parseInt(controlViews, 10) : 0;
  stats.conversions.control = controlConversions ? parseInt(controlConversions, 10) : 0;

  // Load variant stats
  for (const variant of variants) {
    const variantViews = await env.AB_TESTS.get(`test:${testId}:views_${variant.id}`);
    const variantConversions = await env.AB_TESTS.get(`test:${testId}:conversions_${variant.id}`);
    
    stats.views[variant.id] = variantViews ? parseInt(variantViews, 10) : 0;
    stats.conversions[variant.id] = variantConversions ? parseInt(variantConversions, 10) : 0;
  }

  return stats;
}

/**
 * Thompson Sampling bucket selection
 */
function chooseBucketTS(stats: any, variantKeys: string[]): string {
  let best = 'control';
  let bestScore = -1;

  for (const variantId of variantKeys) {
    const views = stats.views[variantId] || 0;
    const conversions = stats.conversions[variantId] || 0;

    // Beta distribution parameters
    const alpha = conversions + 1;
    const beta = (views - conversions) + 1;

    // Sample from Beta distribution
    const sample = betaSample(alpha, beta);

    if (sample > bestScore) {
      bestScore = sample;
      best = variantId;
    }
  }

  return best;
}

/**
 * Get the target URL for a bucket
 */
function getTargetUrl(bucket: string, testConfig: any): string {
  if (bucket === 'control') {
    return testConfig.controlUrl;
  }

  const variant = testConfig.variants.find((v: any) => v.id === bucket);
  return variant ? variant.url : testConfig.controlUrl;
}

/**
 * Extract bucket from cookie
 */
function getBucket(cookie: string, testId: string): string | null {
  const pattern = new RegExp(`${testId}=([^;]+)`);
  const match = cookie.match(pattern);
  return match ? match[1] : null;
}

/**
 * Send event to GA4 Measurement Protocol
 */
async function sendGA4Event(
  testConfig: any,
  bucket: string,
  eventType: 'view' | 'conversion'
): Promise<void> {
  const eventName = eventType === 'view' 
    ? testConfig.eventNames.view 
    : testConfig.eventNames.conversion;

  const measurementId = testConfig.ga4.measurementId;
  const apiSecret = testConfig.ga4.apiSecret;

  if (!apiSecret) {
    console.log('GA4 API secret not configured');
    return;
  }

  try {
    const payload = {
      client_id: `worker_${bucket}_${Date.now()}`,
      events: [{
        name: eventName,
        params: {
          bucket: bucket,
          test_id: testConfig.id,
          session_id: `${Date.now()}`,
        }
      }]
    };

    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  } catch (error) {
    console.error('Failed to send GA4 event:', error);
  }
}
