import { NextResponse } from 'next/server';
import { getAllTests } from '@/lib/kv';

// Force dynamic rendering - do not cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const tests = await getAllTests();

    return NextResponse.json(
      {
        success: true,
        tests,
        count: tests.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tests' },
      { status: 500 }
    );
  }
}
