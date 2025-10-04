import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

// Simplified auth options to avoid import circular dependency
const simpleAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true
};

// Check if Vercel KV is available
function hasKV() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

// Generate unique username slug
function generateUsername(displayName, email, existingUsernames = []) {
  // Try displayName first
  if (displayName) {
    const baseSlug = displayName
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
    const response = await fetch(`${process.env.KV_REST_API_URL}/get/userprofile:${encodeURIComponent(email)}`, {
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
    return data.result ? JSON.parse(data.result) : null;
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

// Get all user profiles to check username uniqueness
async function getAllProfilesForUsernameCheck() {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}/keys/userprofile:*`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const profiles = [];
    
    // Get each profile
    for (const key of data.result || []) {
      const profileResponse = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.result) {
          profiles.push(JSON.parse(profileData.result));
        }
      }
    }
    
    return profiles;
  } catch (error) {
    console.warn('Error getting profiles for username check:', error);
    return [];
  }
}

// GET: Retrieve user profile
export async function GET(request) {
  try {
    const session = await getServerSession(simpleAuthOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    let profile = null;

    // Try Vercel KV first
    if (hasKV()) {
      profile = await getProfileFromKV(email);
    }

    // If no profile exists, create one
    if (!profile) {
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
    const session = await getServerSession(simpleAuthOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, bio, image, username } = body;
    const email = session.user.email;

    // Get existing profile
    let existingProfile = null;
    if (hasKV()) {
      existingProfile = await getProfileFromKV(email);
    }

    // Prepare updated profile
    const updatedProfile = {
      ...existingProfile,
      email,
      displayName: displayName || existingProfile?.displayName || session.user.name || email.split('@')[0],
      image: image !== undefined ? image : existingProfile?.image || session.user.image || null,
      bio: bio !== undefined ? bio : existingProfile?.bio || null,
      updatedAt: new Date().toISOString()
    };

    // Handle username uniqueness check
    if (username && username !== existingProfile?.username) {
      const allProfiles = hasKV() ? await getAllProfilesForUsernameCheck() : [];
      const existingUsernames = allProfiles
        .filter(p => p.email !== email) // Exclude current user
        .map(p => p.username)
        .filter(Boolean);
      
      if (existingUsernames.includes(username)) {
        return NextResponse.json({ 
          error: 'Username already taken',
          available: false 
        }, { status: 400 });
      }
      
      updatedProfile.username = username;
    } else {
      updatedProfile.username = existingProfile?.username || generateUsername(existingProfile?.displayName, email, []);
    }

    // Try to save to KV
    if (hasKV()) {
      const saved = await saveProfileToKV(email, updatedProfile);
      if (saved) {
        return NextResponse.json({
          success: true,
          profile: updatedProfile,
          saved: true,
          source: 'kv'
        });
      }
    }

    // Fallback response for localStorage
    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      saved: false,
      reason: 'fallback-localStorage',
      source: 'localStorage'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// PATCH: Alias for POST
export async function PATCH(request) {
  return POST(request);
}
