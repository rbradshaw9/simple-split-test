import type { Test, CreateTestRequest } from '@/types/Test';
import { slugify } from './utils';
import { loadConfig } from './config';

export function validateTestConfig(data: CreateTestRequest): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Test name is required');
  }

  if (!data.entryPath || !isValidUrl(data.entryPath)) {
    errors.push('Entry URL must be a valid URL');
  }

  if (!data.controlUrl || !isValidUrl(data.controlUrl)) {
    errors.push('Control URL must be a valid URL');
  }

  if (!data.variants || data.variants.length === 0) {
    errors.push('At least one variant is required');
  }

  data.variants.forEach((variant, index) => {
    if (!variant.url || !isValidUrl(variant.url)) {
      errors.push(`Variant ${index + 1} URL is invalid`);
    }
    if (variant.percentage <= 0 || variant.percentage > 100) {
      errors.push(`Variant ${index + 1} percentage must be between 0 and 100`);
    }
  });

  if (data.controlPercentage <= 0 || data.controlPercentage > 100) {
    errors.push('Control percentage must be between 0 and 100');
  }

  const totalPercentage = data.controlPercentage + 
    data.variants.reduce((sum, v) => sum + v.percentage, 0);
  
  if (Math.abs(totalPercentage - 100) > 0.01) {
    errors.push(`Total percentages must equal 100 (currently ${totalPercentage})`);
  }

  return errors;
}

export async function createTestConfig(data: CreateTestRequest): Promise<Test> {
  const testId = slugify(data.name);
  const timestamp = Date.now();
  
  // Extract domain and path from entry URL
  const entryUrl = new URL(data.entryPath);
  const entryDomain = entryUrl.hostname;
  const entryPathOnly = entryUrl.pathname;

  // Load config to get GA4 settings
  const config = await loadConfig();

  return {
    id: testId,
    name: data.name,
    entryPath: entryPathOnly,
    entryUrl: data.entryPath,
    entryDomain: entryDomain,
    controlUrl: data.controlUrl,
    variants: data.variants.map((v, i) => ({
      id: `variant${i + 1}`,
      url: v.url,
      percentage: v.percentage,
    })),
    controlPercentage: data.controlPercentage,
    ga4: {
      measurementId: config.gaMeasurementId,
      propertyId: config.gaPropertyId,
      apiSecret: config.gaApiSecret,
    },
    eventNames: {
      view: `${testId}_view`,
      conversion: `${testId}_conversion`,
    },
    autoOptimize: data.autoOptimize || false,
    createdAt: timestamp,
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function generateTrackingSnippet(test: Test): string {
  return `<!-- EdgeSplit Conversion Tracking for ${test.name} -->
<script>
  function getCookie(name) {
    const value = \`; \${document.cookie}\`;
    const parts = value.split(\`; \${name}=\`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  function fireConversion() {
    const bucket = getCookie('${test.id}');
    if (!bucket) {
      console.warn('EdgeSplit: No bucket cookie found');
      return;
    }
    
    if (typeof gtag !== 'undefined') {
      gtag('event', '${test.eventNames.conversion}', {
        bucket: bucket
      });
      console.log('EdgeSplit: Conversion tracked for bucket:', bucket);
    } else {
      console.warn('EdgeSplit: gtag not available yet');
    }
  }

  // Wait for GA4 to be ready before firing
  if (typeof gtag !== 'undefined') {
    fireConversion();
  } else {
    // GA4 loads async - wait for it
    window.addEventListener('load', function() {
      setTimeout(fireConversion, 100);
    });
  }
</script>`;
}

export function generateSetupInstructions(test: Test, workerUrl?: string): string {
  const optimizationNote = test.autoOptimize ? `

## Thompson Sampling Enabled

This test uses **Thompson Sampling** for adaptive traffic allocation.

**How It Works:**

- All tests sync automatically every 15 minutes via a single cron job
- The system automatically allocates more traffic to better-performing variants
- Configured percentages are ignored - allocation is dynamic
- Requires at least 100 views per variant before optimization begins
- No manual setup required - syncing happens automatically
` : '';

  return `# Setup Instructions for "${test.name}"
${test.autoOptimize ? '\n**Optimization Mode:** Thompson Sampling (Adaptive)\n' : ''}
## Step 1: Deploy the Cloudflare Worker

1. Go to Cloudflare Dashboard > Workers & Pages
2. Create a new Worker named: \`${test.id}-router\`
3. Paste the generated Worker code
4. Deploy the Worker

## Step 2: Configure KV Namespace

1. Create a KV namespace called: \`AB_TESTS\`
2. In your Worker settings, add KV binding:
   - Variable name: \`AB_TESTS\`
   - KV namespace: Select \`AB_TESTS\`

## Step 3: Add Worker Route

Add a route in Cloudflare:
- Route: \`${(test as any).entryDomain || 'yourdomain.com'}${test.entryPath}*\`
- Worker: \`${test.id}-router\`

## Step 4: Add Conversion Tracking

On your thank-you/confirmation page, add the tracking snippet in the <head> or before </body>

## Step 5: View Dashboard

Your test dashboard is available at:
${workerUrl || 'http://localhost:3000'}/tests/${test.id}
${optimizationNote}
## Important Notes

- Make sure GA4 is installed on all pages (control, variants, and confirmation)
- Test the redirect by visiting: \`${(test as any).entryUrl || 'yourdomain.com' + test.entryPath}\`
- Check that the cookie \`${test.id}\` is set after redirect
- Verify events appear in GA4 DebugView within a few minutes
- Variant IDs: ${test.variants.map(v => v.id).join(', ')} (must match KV keys)
${test.autoOptimize ? '- All tests sync automatically every 15 minutes via single cron job\n- View sync status in your test dashboard\n' : ''}

**⚠️ Critical:** KV keys must use format:
- \`test:${test.id}:views_control\`
- \`test:${test.id}:conversions_control\`
${test.variants.map(v => `- \`test:${test.id}:views_${v.id}\`\n- \`test:${test.id}:conversions_${v.id}\``).join('\n')}`;
}
