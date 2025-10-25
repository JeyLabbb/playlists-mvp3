import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/config';

// Check if KV is available
function hasKV() {
  return !!(process.env.UPSTASH_REDIS_KV_REST_API_URL && process.env.UPSTASH_REDIS_KV_REST_API_TOKEN);
}

// Generate unique username
function generateUsername(name, email, existingUsernames) {
  if (name) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    if (baseSlug && !existingUsernames.includes(baseSlug)) {
      return baseSlug;
    }
  }
  
  // Fallback to email local part
  const emailLocal = email.split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  
  let username = emailLocal;
  let counter = 2;
  
  while (existingUsernames.includes(username)) {
    username = `${emailLocal}-${counter}`;
    counter++;
  }
  
  return username;
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

// Get all user profiles to check username uniqueness
async function getAllProfilesForUsernameCheck() {
  try {
    const kv = await import('@vercel/kv');
    const keys = await kv.kv.keys('jey_user_profile:*');
    const profiles = [];
    
    for (const key of keys) {
      try {
        const profile = await kv.kv.get(key);
        if (profile) profiles.push(profile);
      } catch (err) {
        console.warn('Error getting profile for key:', key, err);
      }
    }
    
    return profiles;
  } catch (error) {
    console.warn('KV GET all profiles error:', error);
    return [];
  }
}

// GET: Retrieve user profile
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');
    
    let session = null;
    let email = null;
    
    if (emailParam) {
      // Direct email query (for internal API calls)
      email = emailParam;
    } else {
      // Session-based query
      session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      email = session.user.email;
    }

    let profile = null;

    // Try Vercel KV first
    if (hasKV()) {
      profile = await getProfileFromKV(email);
    }

    // If no profile exists, create one (only for session-based queries)
    if (!profile && !emailParam) {
      const allProfiles = hasKV() ? await getAllProfilesForUsernameCheck() : [];
      const existingUsernames = allProfiles.map(p => p.username).filter(Boolean);
      
      profile = {
        email,
        username: generateUsername(session.user.name, email, existingUsernames),
        displayName: session.user.name || email.split('@')[0],
        image: session.user.image || null,
        bio: null,
        updatedAt: new Date().toISOString()
      };

      // Try to save to KV if available
      if (hasKV()) {
        await saveProfileToKV(email, profile);
      } else {
        // If no KV, indicate fallback to localStorage
        return NextResponse.json({
          success: true,
          profile: profile,
          reason: 'fallback-localStorage',
          source: 'localStorage'
        });
      }
    }

    return NextResponse.json({
      success: true,
      profile: profile,
      source: hasKV() ? 'kv' : 'localStorage'
    });

  } catch (error) {
    console.error('Error retrieving profile:', error);
    return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
  }
}

// POST/PATCH: Update user profile
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const updates = await request.json();
    
    // Get existing profile
    let profile = null;
    if (hasKV()) {
      profile = await getProfileFromKV(email);
    }
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check username uniqueness if username is being updated
    if (updates.username && updates.username !== profile.username) {
      const allProfiles = hasKV() ? await getAllProfilesForUsernameCheck() : [];
      const existingUsernames = allProfiles
        .filter(p => p.email !== email) // Exclude current user
        .map(p => p.username)
        .filter(Boolean);
      
      if (existingUsernames.includes(updates.username)) {
        return NextResponse.json({ 
          error: 'Username already taken',
          available: false 
        }, { status: 400 });
      }
    }

    // Update profile
    const updatedProfile = {
      ...profile,
      ...updates,
      email, // Ensure email doesn't change
      updatedAt: new Date().toISOString()
    };

    // Save updated profile
    if (hasKV()) {
      const saved = await saveProfileToKV(email, updatedProfile);
      if (!saved) {
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      source: hasKV() ? 'kv' : 'localStorage'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}