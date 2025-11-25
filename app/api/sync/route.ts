import { NextRequest, NextResponse } from 'next/server';
import { syncAllTests } from '@/lib/sync';

/**
 * GET/POST /api/sync
 * Sync all tests from GA4 to KV
 * 
 * This endpoint is called by Vercel Cron every 15 minutes
 * It automatically syncs all tests registered in KV
 */
export async function GET(request: NextRequest) {
  return handleSync();
}

export async function POST(request: NextRequest) {
  return handleSync();
}

async function handleSync() {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Starting sync for all tests...');
    
    const summary = await syncAllTests();
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Sync complete: ${summary.successful}/${summary.total} successful in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        total: summary.total,
        successful: summary.successful,
        failed: summary.failed,
      },
      results: summary.results,
    });
  } catch (error) {
    console.error('❌ Sync failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Support runtime configuration for Vercel Cron
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max
