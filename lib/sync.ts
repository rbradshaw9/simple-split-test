import type { Test } from '@/types/Test';
import { getKVStore } from './kv';
import { loadConfig } from './config';

interface SyncResult {
  testId: string;
  success: boolean;
  views: Record<string, number>;
  conversions: Record<string, number>;
  error?: string;
}

/**
 * Sync a single test's stats from GA4 to KV
 */
export async function syncTest(testId: string): Promise<SyncResult> {
  const result: SyncResult = {
    testId,
    success: false,
    views: {},
    conversions: {},
  };

  try {
    const kv = getKVStore();
    
    // Load test config
    const testConfigJson = await kv.get(`test:${testId}`);
    if (!testConfigJson) {
      throw new Error(`Test config not found: ${testId}`);
    }
    
    const test: Test = JSON.parse(testConfigJson);
    
    // Load current stats from KV
    const currentStats = await loadStatsFromKV(testId, test);
    
    // Query GA4 for new data
    const ga4Stats = await queryGA4Stats(test);
    
    // Update KV with new stats
    await updateKVStats(testId, test, ga4Stats);
    
    result.success = true;
    result.views = ga4Stats.views;
    result.conversions = ga4Stats.conversions;
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * Sync all tests registered in the tests:list
 */
export async function syncAllTests(): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: SyncResult[];
}> {
  const kv = getKVStore();
  
  // Load list of all test IDs
  const testsListJson = await kv.get('tests:list');
  const testIds: string[] = testsListJson ? JSON.parse(testsListJson) : [];
  
  if (testIds.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
    };
  }
  
  // Sync each test
  const results: SyncResult[] = [];
  for (const testId of testIds) {
    const result = await syncTest(testId);
    results.push(result);
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: testIds.length,
    successful,
    failed,
    results,
  };
}

/**
 * Load current stats from KV
 */
async function loadStatsFromKV(testId: string, test: Test): Promise<{
  views: Record<string, number>;
  conversions: Record<string, number>;
}> {
  const kv = getKVStore();
  const stats = {
    views: { control: 0 } as Record<string, number>,
    conversions: { control: 0 } as Record<string, number>,
  };

  // Load control stats
  const controlViews = await kv.get(`test:${testId}:views_control`);
  const controlConversions = await kv.get(`test:${testId}:conversions_control`);
  
  stats.views.control = controlViews ? parseInt(controlViews, 10) : 0;
  stats.conversions.control = controlConversions ? parseInt(controlConversions, 10) : 0;

  // Load variant stats
  for (const variant of test.variants) {
    const variantViews = await kv.get(`test:${testId}:views_${variant.id}`);
    const variantConversions = await kv.get(`test:${testId}:conversions_${variant.id}`);
    
    stats.views[variant.id] = variantViews ? parseInt(variantViews, 10) : 0;
    stats.conversions[variant.id] = variantConversions ? parseInt(variantConversions, 10) : 0;
  }

  return stats;
}

/**
 * Query GA4 for view and conversion events
 */
async function queryGA4Stats(test: Test): Promise<{
  views: Record<string, number>;
  conversions: Record<string, number>;
}> {
  const config = await loadConfig();
  
  // Import GA4 module
  const { getAccessToken } = await import('./ga4');
  const accessToken = await getAccessToken();
  
  const propertyId = test.ga4.propertyId;
  const viewEvent = test.eventNames.view;
  const conversionEvent = test.eventNames.conversion;
  
  const stats = {
    views: { control: 0 } as Record<string, number>,
    conversions: { control: 0 } as Record<string, number>,
  };

  // Initialize variant counters
  for (const variant of test.variants) {
    stats.views[variant.id] = 0;
    stats.conversions[variant.id] = 0;
  }

  try {
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [
            { name: 'eventName' },
            { name: 'customEvent:bucket' }
          ],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            orGroup: {
              expressions: [
                {
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: { value: viewEvent }
                  }
                },
                {
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: { value: conversionEvent }
                  }
                }
              ]
            }
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GA4 API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse GA4 response
    if (data.rows && data.rows.length > 0) {
      for (const row of data.rows) {
        const eventName = row.dimensionValues[0]?.value;
        const bucket = row.dimensionValues[1]?.value;
        const count = parseInt(row.metricValues[0]?.value || '0', 10);
        
        if (!bucket) continue;
        
        if (eventName === viewEvent) {
          stats.views[bucket] = (stats.views[bucket] || 0) + count;
        } else if (eventName === conversionEvent) {
          stats.conversions[bucket] = (stats.conversions[bucket] || 0) + count;
        }
      }
    }
  } catch (error) {
    console.error('Error querying GA4:', error);
    throw error;
  }

  return stats;
}

/**
 * Update KV with new stats
 */
async function updateKVStats(
  testId: string,
  test: Test,
  stats: { views: Record<string, number>; conversions: Record<string, number> }
): Promise<void> {
  const kv = getKVStore();
  
  // Update control stats
  await kv.put(`test:${testId}:views_control`, stats.views.control.toString());
  await kv.put(`test:${testId}:conversions_control`, stats.conversions.control.toString());
  
  // Update variant stats
  for (const variant of test.variants) {
    const views = stats.views[variant.id] || 0;
    const conversions = stats.conversions[variant.id] || 0;
    
    await kv.put(`test:${testId}:views_${variant.id}`, views.toString());
    await kv.put(`test:${testId}:conversions_${variant.id}`, conversions.toString());
  }
}

/**
 * Add a test ID to the tests:list
 */
export async function addTestToList(testId: string): Promise<void> {
  const kv = getKVStore();
  
  const testsListJson = await kv.get('tests:list');
  const testIds: string[] = testsListJson ? JSON.parse(testsListJson) : [];
  
  // Add if not already in list
  if (!testIds.includes(testId)) {
    testIds.push(testId);
    await kv.put('tests:list', JSON.stringify(testIds));
  }
}

/**
 * Remove a test ID from the tests:list
 */
export async function removeTestFromList(testId: string): Promise<void> {
  const kv = getKVStore();
  
  const testsListJson = await kv.get('tests:list');
  const testIds: string[] = testsListJson ? JSON.parse(testsListJson) : [];
  
  const filtered = testIds.filter(id => id !== testId);
  
  if (filtered.length !== testIds.length) {
    await kv.put('tests:list', JSON.stringify(filtered));
  }
}
