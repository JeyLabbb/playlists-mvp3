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
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');
    
    let session = null;
    let email = null;
    
    if (emailParam) {
      // Direct email query (for internal API calls)
      email = emailParam;
    } else {
      // Session-based query
      session = await getServerSession(simpleAuthOptions);
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
    const session = await getServerSession(simpleAuthOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, bio, image, username } = body;
    const email = session.user.email;

    // Get existing profile using DIRECT KV SDK (same as other endpoints)
    let existingProfile = null;
    if (hasKV()) {
      const kv = await import('@vercel/kv');
      const profileKey = `userprofile:${email}`;
      existingProfile = await kv.kv.get(profileKey) || {};
    }

    // Prepare updated profile - PRESERVE CRITICAL FIELDS
    const updatedProfile = {
      ...existingProfile,
      email,
      displayName: displayName || existingProfile?.displayName || session.user.name || email.split('@')[0],
      image: image !== undefined ? image : existingProfile?.image || session.user.image || null,
      bio: bio !== undefined ? bio : existingProfile?.bio || null,
      // PRESERVE CRITICAL FIELDS - DO NOT OVERWRITE
      plan: existingProfile?.plan || null,
      founderSince: existingProfile?.founderSince || null,
      usage: existingProfile?.usage || { used: 0, lastUsed: null },
      // PRESERVE REFERRAL FIELDS
      referrals: existingProfile?.referrals || [],
      referredQualifiedCount: existingProfile?.referredQualifiedCount || 0,
      referredBy: existingProfile?.referredBy || null,
      hasCreatedPlaylist: existingProfile?.hasCreatedPlaylist || 0,
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

    // Save to KV using DIRECT SDK (same as other endpoints)
    if (hasKV()) {
      const kv = await import('@vercel/kv');
      const profileKey = `userprofile:${email}`;
      await kv.kv.set(profileKey, updatedProfile);
      
      console.log('[PROFILE] Updated profile via POST:', email, { 
        plan: updatedProfile.plan, 
        founderSince: updatedProfile.founderSince, 
        usage: updatedProfile.usage 
      });
      
      return NextResponse.json({
        success: true,
        profile: updatedProfile,
        saved: true,
        source: 'kv'
      });
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

// PUT: Update user profile (used by webhook to mark Founder status and usage)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { email, plan, founderSince, usage } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (hasKV()) {
      // Use Vercel KV
      const kv = await import('@vercel/kv');
      const profileKey = `userprofile:${email}`;
      
      // Get existing profile
      const existingProfile = await kv.kv.get(profileKey) || {};
      
      // Update with Founder status and/or usage - PRESERVE REFERRAL FIELDS
      const updatedProfile = {
        ...existingProfile,
        plan: plan !== undefined ? plan : existingProfile.plan,
        founderSince: founderSince !== undefined ? founderSince : existingProfile.founderSince,
        usage: usage !== undefined ? usage : existingProfile.usage,
        // PRESERVE REFERRAL FIELDS
        referrals: existingProfile.referrals || [],
        referredQualifiedCount: existingProfile.referredQualifiedCount || 0,
        referredBy: existingProfile.referredBy || null,
        hasCreatedPlaylist: existingProfile.hasCreatedPlaylist || 0,
        updatedAt: new Date().toISOString()
      };
      
      await kv.kv.set(profileKey, updatedProfile);
      console.log('[PROFILE] Updated profile for:', email, { plan, founderSince, usage });
      
      return NextResponse.json({ success: true, profile: updatedProfile });
    } else {
      // Fallback to localStorage simulation (not applicable for server-side)
      console.log('[PROFILE] KV not available, cannot update profile');
      return NextResponse.json({ error: 'Profile storage not available' }, { status: 503 });
    }
  } catch (error) {
    console.error('[PROFILE] Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// DELETE: Delete user account and all associated data
export async function DELETE(request) {
  try {
    const session = await getServerSession(simpleAuthOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    console.log('[PROFILE] Deleting account for:', email);

    if (hasKV()) {
      const kv = await import('@vercel/kv');
      
      // Delete user profile
      const profileKey = `userprofile:${email}`;
      await kv.kv.del(profileKey);
      console.log('[PROFILE] Deleted profile for:', email);

      // Delete user playlists from trending/userplaylists
      try {
        // Get all playlists to find user's playlists
        const allPlaylistsKey = 'all_playlists';
        const allPlaylists = await kv.kv.get(allPlaylistsKey) || [];
        
        // Filter out user's playlists
        const remainingPlaylists = allPlaylists.filter(playlist => 
          playlist.userEmail !== email
        );
        
        // Update the all_playlists with remaining playlists
        await kv.kv.set(allPlaylistsKey, remainingPlaylists);
        
        const deletedCount = allPlaylists.length - remainingPlaylists.length;
        console.log(`[PROFILE] Deleted ${deletedCount} playlists for user:`, email);
        
        // Also delete from userplaylists if it exists
        const userPlaylistsKey = `userplaylists:${email}`;
        await kv.kv.del(userPlaylistsKey);
        console.log('[PROFILE] Deleted user playlists collection for:', email);
        
      } catch (playlistError) {
        console.warn('[PROFILE] Error deleting playlists:', playlistError);
        // Continue with account deletion even if playlist deletion fails
      }

      // Delete any other user-specific data
      try {
        // Delete usage data (if stored separately)
        const usageKey = `usage:${email}`;
        await kv.kv.del(usageKey);
        
        // Delete any session data
        const sessionKey = `session:${email}`;
        await kv.kv.del(sessionKey);
        
        console.log('[PROFILE] Deleted additional user data for:', email);
      } catch (dataError) {
        console.warn('[PROFILE] Error deleting additional data:', dataError);
        // Continue even if some data deletion fails
      }

      console.log('[PROFILE] Account deletion completed for:', email);
      return NextResponse.json({ 
        success: true, 
        message: 'Account and all associated data deleted successfully' 
      });
      
    } else {
      console.log('[PROFILE] KV not available, cannot delete account');
      return NextResponse.json({ error: 'Account deletion not available' }, { status: 503 });
    }
    
  } catch (error) {
    console.error('[PROFILE] Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
