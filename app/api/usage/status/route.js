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

      // Try to save to KV if available
      if (hasKV()) {
        await saveProfileToKV(email, profile);
      }
    }

    // Ensure usage object exists
    if (!profile.usage) {
      profile.usage = {
        used: 0,
        lastUsed: null
      };
    }

    const used = profile.usage.used || 0;
    const remaining = Math.max(0, 5 - used);
    const limit = used >= 5;

    return NextResponse.json({
      used,
      remaining,
      limit
    });

  } catch (error) {
    console.error('Error retrieving usage status:', error);
    return NextResponse.json({ error: 'Failed to retrieve usage status' }, { status: 500 });
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