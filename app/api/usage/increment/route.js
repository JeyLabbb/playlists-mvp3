import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';
import { incrementUsage, getUsage, remaining } from '../../../../lib/usage';

// Generate anonymous user ID from IP + cookie
function getAnonymousUserId(request) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const anonId = request.cookies.get('pleia_anon')?.value || 'default';
  return `anon:${ip}:${anonId}`;
}

export async function POST(request) {
  try {
    console.log('[USAGE] increment endpoint called');
    
    // Get user ID from session or anonymous
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || getAnonymousUserId(request);
    
    console.log('[USAGE] increment - userId:', userId);
    
    const usage = await incrementUsage(userId);
    const remainingUses = remaining(usage);
    
    const response = {
      used: usage.used,
      limit: process.env.FREE_USAGE_LIMIT || 5,
      remaining: remainingUses,
      windowStart: usage.windowStart,
      userId: userId
    };
    
    console.log('[USAGE] increment - response:', response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[USAGE] Error in increment endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to increment usage' },
      { status: 500 }
    );
  }
}

