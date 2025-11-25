import { NextRequest, NextResponse } from 'next/server';
import { getTest, deleteTest } from '@/lib/kv';
import { removeTestFromList } from '@/lib/sync';

/**
 * GET /api/tests/[testId]
 * Get a single test configuration
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

    return NextResponse.json({ test });
  } catch (error) {
    console.error('Error fetching test:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tests/[testId]
 * Delete a test
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    await deleteTest(params.testId);
    
    // Remove from sync list
    await removeTestFromList(params.testId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting test:', error);
    return NextResponse.json(
      { error: 'Failed to delete test' },
      { status: 500 }
    );
  }
}
