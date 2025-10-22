import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';
import { resetUsage } from '../../../../lib/usage';

// Generate anonymous user ID from IP + cookie
function getAnonymousUserId(request) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const anonId = request.cookies.get('pleia_anon')?.value || 'default';
  return `anon:${ip}:${anonId}`;
}

export async function POST(request) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Reset not allowed in production' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    
    // Get user ID from session, query param, or anonymous
    const session = await getServerSession(authOptions);
    const userId = targetUserId || session?.user?.email || getAnonymousUserId(request);
    
    await resetUsage(userId);
    
    return NextResponse.json({
      success: true,
      userId,
    });
    
  } catch (error) {
    console.error('[USAGE] Error in reset endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to reset usage' },
      { status: 500 }
    );
  }
}
