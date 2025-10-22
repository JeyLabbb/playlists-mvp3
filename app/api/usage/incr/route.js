import { NextResponse } from 'next/server';
import { incrUsage } from '../../../../lib/usage';

// Generate anonymous user ID from IP + cookie
function getAnonymousUserId(request) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const anonId = request.cookies.get('pleia_anon')?.value || 'default';
  return `anon:${ip}:${anonId}`;
}

export async function POST(request) {
  try {
    // Get user ID from anonymous (simplified for now)
    const userId = getAnonymousUserId(request);
    
    const usage = await incrUsage(userId);
    
    return NextResponse.json({
      count: usage.count,
      limit: usage.limit,
      remaining: usage.remaining,
      windowKey: usage.windowKey,
    });
    
  } catch (error) {
    console.error('[USAGE] Error in incr endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to increment usage' },
      { status: 500 }
    );
  }
}
