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

// Save user profile to KV
async function saveProfileToKV(email, profile) {
  try {
    const kv = await import('@vercel/kv');
    const profileKey = `jey_user_profile:${email}`;
    await kv.kv.set(profileKey, profile);
    return true;
  } catch (error) {
    console.warn('KV SET profile error:', error);
    return false;
  }
}

// POST: Consume usage
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const { amount = 1 } = await request.json();
    
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

    // Check if user has unlimited uses
    const isFounder = profile.plan === 'founder';
    const isMonthly = profile.plan === 'monthly';
    const hasUnlimitedUses = isFounder || isMonthly;

    if (hasUnlimitedUses) {
      return NextResponse.json({
        success: true,
        consumed: amount,
        remaining: 'unlimited',
        plan: profile.plan,
        unlimited: true
      });
    }

    // Check usage window
    const now = new Date();
    const windowStart = new Date(profile.usage?.windowStart || now);
    const windowEnd = new Date(profile.usage?.windowEnd || new Date(now.getTime() + 24 * 60 * 60 * 1000));
    
    const isInWindow = now >= windowStart && now <= windowEnd;
    const currentCount = isInWindow ? (profile.usage?.count || 0) : 0;
    
    const freeUses = parseInt(process.env.FREE_USES) || 3;
    const remainingUses = Math.max(0, freeUses - currentCount);
    
    if (remainingUses < amount) {
      return NextResponse.json({
        success: false,
        error: 'Usage limit exceeded',
        current: currentCount,
        limit: freeUses,
        remaining: remainingUses,
        requested: amount
      }, { status: 429 });
    }

    // Update usage count
    const newCount = currentCount + amount;
    const updatedProfile = {
      ...profile,
      usage: {
        count: newCount,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    // Save updated profile
    if (hasKV()) {
      const saved = await saveProfileToKV(email, updatedProfile);
      if (!saved) {
        return NextResponse.json({ error: 'Failed to save usage' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      consumed: amount,
      remaining: Math.max(0, freeUses - newCount),
      current: newCount,
      limit: freeUses,
      plan: profile.plan || 'free'
    });

  } catch (error) {
    console.error('Error consuming usage:', error);
    return NextResponse.json({ error: 'Failed to consume usage' }, { status: 500 });
  }
}