import { NextRequest, NextResponse } from 'next/server';
import { getTest } from '@/lib/kv';
import { generateWorkerCode } from '@/lib/cloudflare';
import { generateTrackingSnippet, generateSetupInstructions } from '@/lib/tests';

/**
 * GET /api/tests/[testId]/codes
 * Regenerate worker code, tracking snippet, and setup instructions
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

    // Generate all codes
    const workerCode = generateWorkerCode(test);
    const trackingSnippet = generateTrackingSnippet(test);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
    const setupInstructions = generateSetupInstructions(test, appUrl);

    return NextResponse.json({
      testId: params.testId,
      workerCode,
      trackingSnippet,
      setupInstructions,
    });
  } catch (error) {
    console.error('Error generating codes:', error);
    return NextResponse.json(
      { error: 'Failed to generate codes' },
      { status: 500 }
    );
  }
}
