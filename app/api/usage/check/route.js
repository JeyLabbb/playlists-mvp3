import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';
import { getUsage } from '../../../../lib/usage';

// Generate anonymous user ID from IP + cookie
function getAnonymousUserId(request) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const anonId = request.cookies.get('pleia_anon')?.value || 'default';
  return `anon:${ip}:${anonId}`;
}

export async function GET(request) {
  try {
    console.log('[USAGE] check endpoint called');
    
    // Get user ID from session or anonymous
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || getAnonymousUserId(request);
    
    console.log('[USAGE] check - userId:', userId);
    
    const usage = await getUsage(userId);
    
    const response = {
      used: usage.count,
      limit: usage.limit,
      remaining: usage.remaining,
      windowStart: usage.windowKey,
      userId: userId
    };
    
    console.log('[USAGE] check - response:', response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[USAGE] Error in check endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to check usage' },
      { status: 500 }
    );
  }
}