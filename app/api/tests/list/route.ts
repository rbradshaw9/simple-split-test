import { NextResponse } from 'next/server';
import { getAllTests } from '@/lib/kv';

export async function GET() {
  try {
    const tests = await getAllTests();

    return NextResponse.json({
      success: true,
      tests,
      count: tests.length,
    });
  } catch (error) {
    console.error('Error fetching tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tests' },
      { status: 500 }
    );
  }
}
