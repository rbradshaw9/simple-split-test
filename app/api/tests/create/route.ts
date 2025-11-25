import { NextRequest, NextResponse } from 'next/server';
import { validateTestConfig, createTestConfig, generateTrackingSnippet, generateSetupInstructions } from '@/lib/tests';
import { generateWorkerCode } from '@/lib/cloudflare';
import { saveTest, getTest } from '@/lib/kv';
import { addTestToList } from '@/lib/sync';
import { slugify } from '@/lib/utils';
import type { CreateTestRequest, CreateTestResponse } from '@/types/Test';

export async function POST(request: NextRequest) {
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

    // Check if test with this name already exists (before expensive config creation)
    const potentialTestId = slugify(data.name);
    const existingTest = await getTest(potentialTestId);
    if (existingTest) {
      return NextResponse.json(
        { error: `A test with this name already exists. Please choose a different name.` },
        { status: 409 }
      );
    }

    // Create test configuration
    const test = await createTestConfig(data);

    // Generate Worker code
    const workerCode = generateWorkerCode(test);

    // Generate tracking snippet
    const trackingSnippet = generateTrackingSnippet(test);

    // Generate setup instructions
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const setupInstructions = generateSetupInstructions(test, appUrl);

    // Save to KV store
    await saveTest(test);
    
    // Add to sync list
    await addTestToList(test.id);

    const response: CreateTestResponse = {
      success: true,
      testId: test.id,
      test,
      workerCode,
      trackingSnippet,
      setupInstructions,
      dashboardUrl: `${appUrl}/tests/${test.id}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json(
      { error: 'Failed to create test' },
      { status: 500 }
    );
  }
}
