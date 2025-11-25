import { NextRequest, NextResponse } from 'next/server';
import { getTest, getTestStats } from '@/lib/kv';
import { fetchGA4Stats } from '@/lib/ga4';
import { saveTestStats } from '@/lib/kv';

/**
 * Sync GA4 stats to KV in a format the Worker can consume
 * This endpoint should be called by a cron job every 15 minutes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const testId = params.testId;

    // Get test configuration
    const test = await getTest(testId);
    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Only sync if autoOptimize is enabled
    if (!test.autoOptimize) {
      return NextResponse.json({
        success: false,
        message: 'Test does not have autoOptimize enabled',
      });
    }

    // Fetch fresh stats from GA4
    const stats = await fetchGA4Stats(test);

    // Save full stats for dashboard
    await saveTestStats(testId, stats);

    // Get KV store for Worker-specific keys
    const { getKVStore } = await import('@/lib/kv');
    const kv = getKVStore();

    // Save control stats
    await kv.put(
      `test:${testId}:views_control`,
      stats.controlViews.toString()
    );
    await kv.put(
      `test:${testId}:conversions_control`,
      stats.controlConversions.toString()
    );

    // Save variant stats
    for (const variant of test.variants) {
      const variantStats = stats.variantStats[variant.id];
      if (variantStats) {
        await kv.put(
          `test:${testId}:views_${variant.id}`,
          variantStats.views.toString()
        );
        await kv.put(
          `test:${testId}:conversions_${variant.id}`,
          variantStats.conversions.toString()
        );
      }
    }

    return NextResponse.json({
      success: true,
      testId,
      syncedAt: Date.now(),
      stats: {
        control: {
          views: stats.controlViews,
          conversions: stats.controlConversions,
        },
        variants: Object.keys(stats.variantStats).map(variantId => ({
          id: variantId,
          views: stats.variantStats[variantId].views,
          conversions: stats.variantStats[variantId].conversions,
        })),
      },
    });
  } catch (error) {
    console.error('Error syncing stats to KV:', error);
    return NextResponse.json(
      { error: 'Failed to sync stats' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check sync status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const testId = params.testId;
    const { getKVStore } = await import('@/lib/kv');
    const kv = getKVStore();

    // Get test configuration
    const test = await getTest(testId);
    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Read current KV values
    const controlViews = await kv.get(`test:${testId}:views_control`);
    const controlConversions = await kv.get(`test:${testId}:conversions_control`);

    const variantData: any = {};
    for (const variant of test.variants) {
      const views = await kv.get(`test:${testId}:views_${variant.id}`);
      const conversions = await kv.get(`test:${testId}:conversions_${variant.id}`);
      variantData[variant.id] = {
        views: views ? parseInt(views, 10) : 0,
        conversions: conversions ? parseInt(conversions, 10) : 0,
      };
    }

    // Get last stats update timestamp
    const statsCache = await getTestStats(testId);

    return NextResponse.json({
      success: true,
      testId,
      autoOptimize: test.autoOptimize,
      lastUpdated: statsCache?.lastUpdated || null,
      kvData: {
        control: {
          views: controlViews ? parseInt(controlViews, 10) : 0,
          conversions: controlConversions ? parseInt(controlConversions, 10) : 0,
        },
        variants: variantData,
      },
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
