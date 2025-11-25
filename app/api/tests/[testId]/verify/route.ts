import { NextRequest, NextResponse } from 'next/server';
import { getTest } from '@/lib/kv';

/**
 * GET /api/tests/[testId]/verify
 * Verify if the worker code and tracking snippet are properly installed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const test = await getTest(params.testId);
    
    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    const checks = {
      workerInstalled: false,
      workerMessage: '',
      trackingInstalled: false,
      trackingMessage: '',
      recentActivity: false,
      activityMessage: '',
    };

    // Check 1: Try to fetch the entry URL and see if we get a bucket cookie
    try {
      const entryUrl = test.entryUrl || `https://${test.entryDomain}${test.entryPath}`;
      const response = await fetch(entryUrl, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'EdgeSplit-Verification/1.0',
        },
      });

      const cookies = response.headers.get('set-cookie') || '';
      
      if (cookies.includes('bucket=')) {
        checks.workerInstalled = true;
        checks.workerMessage = 'Worker is setting the bucket cookie correctly';
      } else {
        checks.workerInstalled = false;
        checks.workerMessage = 'No bucket cookie detected. Make sure the Worker is deployed and the route is configured correctly.';
      }
    } catch (error) {
      checks.workerInstalled = false;
      checks.workerMessage = `Could not reach entry URL: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Check 2: Look for recent GA4 events (if we have stats)
    try {
      const statsResponse = await fetch(
        new URL(`/api/stats/${params.testId}`, request.url).toString()
      );
      
      if (statsResponse.ok) {
        const { stats } = await statsResponse.json();
        const totalViews = stats.controlViews + Object.values(stats.variantStats).reduce(
          (sum: number, v: any) => sum + v.views,
          0
        );
        
        if (totalViews > 0) {
          checks.recentActivity = true;
          checks.activityMessage = `Detected ${totalViews} total views across all variants`;
          
          // If we have views, tracking is likely installed
          checks.trackingInstalled = true;
          checks.trackingMessage = 'GA4 events are being received';
        } else {
          checks.recentActivity = false;
          checks.activityMessage = 'No views recorded yet';
          checks.trackingInstalled = false;
          checks.trackingMessage = 'No GA4 events detected. Make sure the tracking snippet is installed on your conversion page.';
        }
      }
    } catch (error) {
      checks.trackingMessage = 'Could not check GA4 data';
      checks.activityMessage = 'Could not verify activity';
    }

    return NextResponse.json({
      testId: params.testId,
      checks,
      overall: checks.workerInstalled && checks.trackingInstalled,
    });
  } catch (error) {
    console.error('Error verifying installation:', error);
    return NextResponse.json(
      { error: 'Failed to verify installation' },
      { status: 500 }
    );
  }
}
