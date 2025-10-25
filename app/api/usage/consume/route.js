import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

// Helper function to check if KV is available
function hasKV() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Get user profile from KV
async function getProfileFromKV(email) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}/get/userprofile:${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('KV GET profile failed:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.result) {
      return JSON.parse(data.result);
    }

    return null;
  } catch (error) {
    console.warn('KV GET profile error:', error);
    return null;
  }
}

// Save user profile to KV
async function saveProfileToKV(email, profile) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}/set/userprofile:${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: JSON.stringify(profile)
      })
    });

    if (!response.ok) {
      console.warn('KV SET profile failed:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('KV SET profile error:', error);
    return false;
  }
}

// POST: Consume one usage
export async function POST(request) {
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

    // If no profile exists, create one with default usage
    if (!profile) {
      profile = {
        email,
        usage: {
          used: 0,
          lastUsed: null
        },
        updatedAt: new Date().toISOString()
      };
    }

    // Ensure usage object exists
    if (!profile.usage) {
      profile.usage = {
        used: 0,
        lastUsed: null
      };
    }

    const currentUsed = profile.usage.used || 0;

    // Check if user has reached the limit
    if (currentUsed >= 5) {
      return NextResponse.json({
        limit: true,
        used: currentUsed,
        remaining: 0
      });
    }

    // Increment usage
    const newUsed = currentUsed + 1;
    profile.usage.used = newUsed;
    profile.usage.lastUsed = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();

    // Save updated profile
    if (hasKV()) {
      const saved = await saveProfileToKV(email, profile);
      if (!saved) {
        console.error('Failed to save profile after usage increment');
        return NextResponse.json({ error: 'Failed to save usage' }, { status: 500 });
      }
    }

    console.log(`[USAGE] User ${email} consumed usage: ${newUsed}/5`);

    return NextResponse.json({
      limit: false,
      used: newUsed,
      remaining: 5 - newUsed
    });

  } catch (error) {
    console.error('Error consuming usage:', error);
    return NextResponse.json({ error: 'Failed to consume usage' }, { status: 500 });
  }
}