import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { REFERRALS_ENABLED, canInvite } from '../../../../lib/referrals';

export async function GET(request) {
  try {
    if (!REFERRALS_ENABLED) {
      return NextResponse.json({ error: 'Referrals not enabled' }, { status: 403 });
    }

    // Get current user session
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const userEmail = user.email.toLowerCase();

    if (!canInvite(userEmail)) {
      return NextResponse.json({ error: 'User not authorized to invite' }, { status: 403 });
    }

    // Get user profile
    const kv = await import('@vercel/kv');
    const profileKey = `userprofile:${userEmail}`;
    const profile = await kv.kv.get(profileKey) || {};

    const stats = {
      totalReferrals: profile.referrals?.length || 0,
      qualifiedReferrals: profile.referredQualifiedCount || 0,
      remainingToUnlock: Math.max(0, 3 - (profile.referredQualifiedCount || 0)),
      progressPercentage: Math.min(((profile.referredQualifiedCount || 0) / 3) * 100, 100),
      canInvite: true
    };

    console.log('[REF] Stats for user:', userEmail, stats);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('[REF] Error getting stats:', error);
    return NextResponse.json({ error: 'Failed to get referral stats' }, { status: 500 });
  }
}
