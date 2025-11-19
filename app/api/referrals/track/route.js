import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { REFERRALS_ENABLED, isFounderWhitelisted } from '../../../../lib/referrals';

export async function POST(request) {
  try {
    if (!REFERRALS_ENABLED) {
      return NextResponse.json({ error: 'Referrals not enabled' }, { status: 403 });
    }

    // Get current user session
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { refEmail } = await request.json();
    
    if (!refEmail) {
      return NextResponse.json({ error: 'Referral email is required' }, { status: 400 });
    }

    const currentUserEmail = user.email.toLowerCase();
    const referralEmail = refEmail.toLowerCase();

    console.log('[REF] Tracking referral:', { currentUserEmail, referralEmail });

    // Security checks
    if (currentUserEmail === referralEmail) {
      console.log('[REF] Self-referral blocked:', currentUserEmail);
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    if (!isFounderWhitelisted(referralEmail)) {
      console.log('[REF] Referrer not in whitelist:', referralEmail);
      return NextResponse.json({ error: 'Referrer not authorized' }, { status: 403 });
    }

    // Only block if user is trying to refer themselves
    if (currentUserEmail === referralEmail) {
      console.log('[REF] Self-referral blocked:', currentUserEmail);
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // Get current user profile
    const kv = await import('@vercel/kv');
    const profileKey = `userprofile:${currentUserEmail}`;
    const currentProfile = await kv.kv.get(profileKey) || {};

    // Check if user already has a referrer
    if (currentProfile.referredBy) {
      console.log('[REF] User already referred by:', currentProfile.referredBy);
      return NextResponse.json({ 
        success: true, 
        message: 'Already referred',
        referredBy: currentProfile.referredBy
      });
    }

    // Update current user profile with referrer
    const updatedProfile = {
      ...currentProfile,
      email: currentUserEmail,
      referredBy: referralEmail,
      updatedAt: new Date().toISOString()
    };

    await kv.kv.set(profileKey, updatedProfile);
    console.log('[REF] User referred successfully:', { currentUserEmail, referredBy: referralEmail });

    return NextResponse.json({ 
      success: true, 
      message: 'Referral tracked successfully',
      referredBy: referralEmail
    });

  } catch (error) {
    console.error('[REF] Error tracking referral:', error);
    return NextResponse.json({ error: 'Failed to track referral' }, { status: 500 });
  }
}
