import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

// Helper function to check if KV is available
function hasKV() {
  return !!(process.env.UPSTASH_REDIS_KV_REST_API_URL && process.env.UPSTASH_REDIS_KV_REST_API_TOKEN);
}

// Get user profile from KV
async function getProfileFromKV(email) {
  try {
    const kv = await import('@vercel/kv');
    const profileKey = `jey_user_profile:${email}`;
    const profile = await kv.kv.get(profileKey);
    return profile;
  } catch (error) {
    console.warn('KV GET profile error:', error);
    return null;
  }
}

// GET: Retrieve usage status
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    let profile = null;

    // Try Vercel KV first
    if (hasKV()) {
      profile = await getProfileFromKV(email);
    }

    // If no profile found, create a default one
    if (!profile) {
      profile = {
        email,
        plan: 'free',
        usage: {
          count: 0,
          windowStart: new Date().toISOString(),
          windowEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        updatedAt: new Date().toISOString()
      };
    }

    // Calculate usage status
    const now = new Date();
    const windowStart = new Date(profile.usage?.windowStart || now);
    const windowEnd = new Date(profile.usage?.windowEnd || new Date(now.getTime() + 24 * 60 * 60 * 1000));
    
    const isInWindow = now >= windowStart && now <= windowEnd;
    const currentCount = isInWindow ? (profile.usage?.count || 0) : 0;
    
    const freeUses = parseInt(process.env.FREE_USES) || 3;
    const isFounder = profile.plan === 'founder';
    const isMonthly = profile.plan === 'monthly';
    
    const remainingUses = Math.max(0, freeUses - currentCount);
    const hasUnlimitedUses = isFounder || isMonthly;
    
    return NextResponse.json({
      success: true,
      usage: {
        current: currentCount,
        limit: freeUses,
        remaining: hasUnlimitedUses ? 'unlimited' : remainingUses,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        isInWindow,
        hasUnlimitedUses,
        plan: profile.plan || 'free'
      },
      profile: {
        email: profile.email,
        plan: profile.plan || 'free',
        founderSince: profile.founderSince || null,
        updatedAt: profile.updatedAt || new Date().toISOString()
      },
      source: hasKV() ? 'kv' : 'default'
    });

  } catch (error) {
    console.error('Error retrieving usage status:', error);
    return NextResponse.json({ error: 'Failed to retrieve usage status' }, { status: 500 });
  }
}