import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { REFERRALS_ENABLED, REF_REQUIRED_COUNT } from '../../../../lib/referrals';

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

    const currentUserEmail = user.email.toLowerCase();
    console.log('[REF] Qualifying referral for user:', currentUserEmail);

    // Get current user profile
    const kv = await import('@vercel/kv');
    const profileKey = `userprofile:${currentUserEmail}`;
    const currentProfile = await kv.kv.get(profileKey) || {};

    // Increment playlist count
    const hasCreatedPlaylist = (currentProfile.hasCreatedPlaylist || 0) + 1;
    
    const updatedProfile = {
      ...currentProfile,
      email: currentUserEmail,
      hasCreatedPlaylist,
      updatedAt: new Date().toISOString()
    };

    await kv.kv.set(profileKey, updatedProfile);
    console.log('[REF] User playlist count updated:', { currentUserEmail, hasCreatedPlaylist });

    // Check if this is the first playlist and user has a referrer
    if (hasCreatedPlaylist === 1 && currentProfile.referredBy) {
      const referrerEmail = currentProfile.referredBy.toLowerCase();
      console.log('[REF] First playlist created, qualifying referrer:', referrerEmail);

      // Get referrer profile
      const referrerProfileKey = `userprofile:${referrerEmail}`;
      const referrerProfile = await kv.kv.get(referrerProfileKey) || {};

      // Update referrer stats
      const referredQualifiedCount = (referrerProfile.referredQualifiedCount || 0) + 1;
      const referrals = referrerProfile.referrals || [];
      
      // Add current user to referrals list if not already there
      if (!referrals.includes(currentUserEmail)) {
        referrals.push(currentUserEmail);
      }

      const updatedReferrerProfile = {
        ...referrerProfile,
        email: referrerEmail,
        referrals,
        referredQualifiedCount,
        updatedAt: new Date().toISOString()
      };

      // Check if referrer should be upgraded to founder
      let upgradedToFounder = false;
      if (referredQualifiedCount >= REF_REQUIRED_COUNT && referrerProfile.plan !== 'founder') {
        updatedReferrerProfile.plan = 'founder';
        updatedReferrerProfile.founderSince = new Date().toISOString();
        upgradedToFounder = true;
        console.log('[REF] Referrer upgraded to founder:', referrerEmail);
      }

      await kv.kv.set(referrerProfileKey, updatedReferrerProfile);
      console.log('[REF] Referrer stats updated:', { 
        referrerEmail, 
        referredQualifiedCount, 
        upgradedToFounder 
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Referral qualified successfully',
        qualified: true,
        referrerUpgraded: upgradedToFounder,
        referrerEmail,
        qualifiedCount: referredQualifiedCount
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Playlist count updated',
      qualified: false,
      hasCreatedPlaylist
    });

  } catch (error) {
    console.error('[REF] Error qualifying referral:', error);
    return NextResponse.json({ error: 'Failed to qualify referral' }, { status: 500 });
  }
}
