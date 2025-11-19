import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

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
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email;
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
    
    // Use 'used' field (new format) or 'count' field (old format)
    const currentCount = profile.usage?.used || profile.usage?.count || 0;
    
    const freeUses = parseInt(process.env.FREE_USES) || 5;
    const isFounder = profile.plan === 'founder';
    const isMonthly = profile.plan === 'monthly';
    const hasUnlimitedUses = isFounder || isMonthly;
    
    // Check if user has reached limit
    const hasReachedLimit = !isFounder && !isMonthly && currentCount >= freeUses;
    const remainingUses = hasUnlimitedUses ? 'unlimited' : Math.max(0, freeUses - currentCount);
    
    return NextResponse.json({
      success: true,
      usage: {
        current: currentCount,
        limit: freeUses,
        remaining: hasUnlimitedUses ? 'unlimited' : remainingUses,
        hasUnlimitedUses,
        plan: profile.plan || 'free'
      },
      // Legacy fields for backwards compatibility
      limit: hasReachedLimit, // true if reached limit
      remaining: remainingUses,
      used: currentCount,
      isFounder,
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