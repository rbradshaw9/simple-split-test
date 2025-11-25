import { NextRequest, NextResponse } from 'next/server';
import { getTest, saveTest } from '@/lib/kv';
import { validateTestConfig } from '@/lib/tests';
import type { CreateTestRequest, Test } from '@/types/Test';
import { loadConfig } from '@/lib/config';

/**
 * PUT /api/tests/[testId]/update
 * Update an existing test configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const data: CreateTestRequest = await request.json();

    // Validate input
    const errors = validateTestConfig(data);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Get existing test
    const existingTest = await getTest(params.testId);
    if (!existingTest) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Load config to get GA4 settings
    const config = await loadConfig();

    // Extract domain and path from entry URL
    const entryUrl = new URL(data.entryPath);
    const entryDomain = entryUrl.hostname;
    const entryPathOnly = entryUrl.pathname;

    // Update test configuration (keep original ID and createdAt)
    const updatedTest: Test = {
      ...existingTest,
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
      autoOptimize: data.autoOptimize || false,
    };

    // Save updated test
    await saveTest(updatedTest);

    return NextResponse.json({ 
      success: true, 
      test: updatedTest 
    });
  } catch (error) {
    console.error('Error updating test:', error);
    return NextResponse.json(
      { error: 'Failed to update test' },
      { status: 500 }
    );
  }
}
