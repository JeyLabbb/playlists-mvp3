import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getUsage, incrUsage, resetUsage } from '@/lib/usage';

// Generate anonymous user ID from IP + cookie
function getAnonymousUserId(request) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const anonId = request.cookies.get('pleia_anon')?.value || 'default';
  return `anon:${ip}:${anonId}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const simulateNext = searchParams.get('simulateNext') === 'true';
    
    // Get user ID from session or anonymous
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || getAnonymousUserId(request);
    
    const usage = await getUsage(userId);
    
    const wouldExceed = simulateNext ? (usage.count + 1) > usage.limit : false;
    
    // Check if user has Founder plan (for now, we'll assume they don't)
    // TODO: Implement proper plan checking when Stripe webhooks are set up
    const hasFounderPlan = false;
    const hasUnlimitedAccess = hasFounderPlan;
    
    return NextResponse.json({
      count: usage.count,
      limit: usage.limit,
      remaining: usage.remaining,
      wouldExceed,
      windowKey: usage.windowKey,
      hasFounderPlan,
      hasUnlimitedAccess,
      plan: hasFounderPlan ? 'founder' : 'free',
    });
    
  } catch (error) {
    console.error('[USAGE] Error in check endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to check usage' },
      { status: 500 }
    );
  }
}
