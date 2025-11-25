import { NextRequest, NextResponse } from 'next/server';
import { getTest } from '@/lib/kv';
import { fetchGA4Stats } from '@/lib/ga4';
import { saveTestStats, getTestStats } from '@/lib/kv';

export async function GET(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const testId = params.testId;
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    // Get test configuration
    const test = await getTest(testId);
    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Check if we should fetch fresh data or use cached
    let stats;
    
    if (refresh) {
      // Fetch fresh data from GA4
      stats = await fetchGA4Stats(test);
      // Cache the results
      await saveTestStats(testId, stats);
    } else {
      // Try to get cached stats first
      stats = await getTestStats(testId);
      
      // If no cache or cache is old (>15 min), fetch fresh
      if (!stats || Date.now() - stats.lastUpdated > 15 * 60 * 1000) {
        stats = await fetchGA4Stats(test);
        await saveTestStats(testId, stats);
      }
    }

    return NextResponse.json({
      success: true,
      test,
      stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
