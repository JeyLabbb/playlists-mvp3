import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { normalizeUsername } from '@/lib/social/usernameCache';

const memoryStoreKey = Symbol.for('pleia.profile.store');
const globalScope = globalThis;
if (!globalScope[memoryStoreKey]) {
  globalScope[memoryStoreKey] = new Map();
}
const memoryStore = globalScope[memoryStoreKey];

// Check if KV is available
function hasKV() {
  const url = process.env.UPSTASH_REDIS_KV_REST_API_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!process.env.UPSTASH_REDIS_KV_REST_API_URL && process.env.KV_REST_API_URL) {
    process.env.UPSTASH_REDIS_KV_REST_API_URL = process.env.KV_REST_API_URL;
  }
  if (!process.env.UPSTASH_REDIS_KV_REST_API_TOKEN && process.env.KV_REST_API_TOKEN) {
    process.env.UPSTASH_REDIS_KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
  }

  return !!(url && token);
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

function sanitizeUsername(username) {
  return (username || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .substring(0, 30);
}

async function getUsernameOwner(username) {
  if (!username) return null;

  if (hasKV()) {
    try {
      const kv = await import('@vercel/kv');
      return await kv.kv.get(`username_index:${username}`);
    } catch (error) {
      console.warn('[PROFILE] KV username lookup failed:', error);
      return null;
    }
  }

  for (const [email, profile] of memoryStore.entries()) {
    if (profile?.username === username) {
      return email;
    }
  }

  return null;
}

async function updateUsernameIndex(email, newUsername, previousUsername) {
  if (!newUsername) return;

  if (hasKV()) {
    try {
      const kv = await import('@vercel/kv');
      const pipeline = kv.kv.pipeline();

      if (previousUsername && previousUsername !== newUsername) {
        pipeline.del(`username_index:${previousUsername}`);
      }

      pipeline.set(`username_index:${newUsername}`, email);
      await pipeline.exec();
    } catch (error) {
      console.warn('[PROFILE] Failed to update username index:', error);
    }
  }
}

async function generateUniqueUsername(displayName, email) {
  const baseSlug = sanitizeUsername(
    displayName ||
    email.split('@')[0]
  );

  let candidate = baseSlug || `pleia-${Math.random().toString(36).slice(2, 6)}`;

  let attempt = 0;
  while (attempt < 6) {
    const owner = await getUsernameOwner(candidate);
    if (!owner || owner === email) {
      return candidate;
    }
    attempt += 1;
    candidate = `${baseSlug}-${attempt + 1}`;
  }

  return `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
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

function getProfileFromMemory(email) {
  return memoryStore.get(email) || null;
}

function saveProfileToMemory(email, profile) {
  memoryStore.set(email, profile);
  return true;
}

function deleteProfileFromMemory(email) {
  memoryStore.delete(email);
}

// GET: Retrieve user profile
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');
    
    let pleiaUser = null;
    let email = null;
    
    if (emailParam) {
      email = emailParam;
    } else {
      pleiaUser = await getPleiaServerUser();
      if (!pleiaUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      email = pleiaUser.email;
    }

    let profile = null;

    // Try Vercel KV first
    if (hasKV()) {
      profile = await getProfileFromKV(email);
      if (profile?.username) {
        const owner = await getUsernameOwner(profile.username);
        if (!owner) {
          await updateUsernameIndex(email, profile.username, null);
        }
      }
    } else {
      profile = getProfileFromMemory(email);
    }

    // If no profile exists, create one (only for authenticated queries)
    if (!profile && !emailParam) {
      const displayName =
        pleiaUser?.name ||
        email.split('@')[0];

      const username = await generateUniqueUsername(displayName, email);

      profile = {
        email,
        username,
        displayName,
        image: pleiaUser?.image || null,
        bio: null,
        updatedAt: new Date().toISOString(),
        newsletterOptIn: false,
        acceptedTermsAt: null,
      };

      if (hasKV()) {
        const saved = await saveProfileToKV(email, profile);
        if (saved) {
          await updateUsernameIndex(email, username, null);
        }
      } else {
        saveProfileToMemory(email, profile);
      }

      if (pleiaUser?.id) {
        try {
          const supabase = await createSupabaseRouteClient();
          await supabase
            .from('users')
            .update({
              username: normalizeUsername(username) || username,
            })
            .eq('id', pleiaUser.id);
        } catch (syncError) {
          console.warn('[PROFILE] Failed to save initial username to users table:', syncError);
        }
      }
    }

    const normalizedProfile = {
      ...profile,
      newsletterOptIn: !!profile?.newsletterOptIn,
    };

    return NextResponse.json({
      success: true,
      profile: normalizedProfile,
      source: hasKV() ? 'kv' : 'memory'
    });

  } catch (error) {
    console.error('Error retrieving profile:', error);
    return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
  }
}

// POST/PATCH: Update user profile
export async function POST(request) {
  try {
    let userEmail = null;
    let userName = null;

    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userEmail = pleiaUser.email;
    userName = pleiaUser.name || pleiaUser.email;

    const updates = await request.json();
    const mode = updates?.mode;
    const requestedUsername = updates?.username;

    if (mode === 'check-username') {
      const candidate = sanitizeUsername(requestedUsername || '');
      const owner = await getUsernameOwner(candidate);
      const available = !candidate || !owner || owner === userEmail;

      return NextResponse.json({
        success: true,
        available,
        username: candidate,
        owner: owner || null,
        mode: 'check-username',
        source: hasKV() ? 'kv' : 'memory'
      });
    }

    delete updates.mode;
    
    // Get existing profile
    let profile = null;
    if (hasKV()) {
      profile = await getProfileFromKV(userEmail);
    } else {
      profile = getProfileFromMemory(userEmail);
    }
    
    if (!profile) {
      const username = await generateUniqueUsername(userName, userEmail);
      profile = {
        email: userEmail,
        username,
        displayName: userName,
        image: null,
        bio: "",
        plan: "free",
        founderSince: null,
        updatedAt: new Date().toISOString()
      };
    }

    if (requestedUsername && requestedUsername !== profile.username) {
      const candidate = sanitizeUsername(requestedUsername);

      if (!candidate) {
        return NextResponse.json({
          error: 'Nombre de usuario no válido',
          available: false
        }, { status: 400 });
      }

      const owner = await getUsernameOwner(candidate);
      if (owner && owner !== userEmail) {
        return NextResponse.json({
          error: 'Nombre de usuario ya está en uso',
          available: false
        }, { status: 200 });
      }

      updates.username = candidate;
    }

    // Update profile
    const updatedProfile = {
      ...profile,
      ...updates,
      email: userEmail, // Ensure email doesn't change
      displayName: updates.displayName || profile.displayName || userName,
      newsletterOptIn:
        typeof updates.newsletterOptIn === 'boolean'
          ? updates.newsletterOptIn
          : !!profile.newsletterOptIn,
      updatedAt: new Date().toISOString()
    };

    // Save updated profile
    if (hasKV()) {
      const saved = await saveProfileToKV(userEmail, updatedProfile);
      if (!saved) {
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
      }
      await updateUsernameIndex(userEmail, updatedProfile.username, profile?.username || null);
    } else {
      saveProfileToMemory(userEmail, updatedProfile);
    }

    // 🚨 CRITICAL: Sincronizar username a la tabla users de Supabase
    if (pleiaUser?.id && updatedProfile.username) {
      try {
        const supabase = await createSupabaseRouteClient();
        const adminSupabase = getSupabaseAdmin();
        
        // Verificar que la columna username existe antes de actualizar
        if (adminSupabase) {
          const { error: checkError } = await adminSupabase
            .from('users')
            .select('username')
            .limit(1);
          
          if (!checkError || checkError.code !== '42703') {
            // La columna existe, proceder con la actualización
            const normalizedUsername = normalizeUsername(updatedProfile.username) || updatedProfile.username;
            const { data: updateData, error: updateError } = await supabase
              .from('users')
              .update({ username: normalizedUsername })
              .eq('id', pleiaUser.id)
              .select('username')
              .maybeSingle();
            
            if (updateError) {
              console.error('[PROFILE] Failed to sync username to users table:', updateError);
            } else {
              console.log('[PROFILE] ✅ Username synced to users table:', {
                userId: pleiaUser.id,
                username: normalizedUsername,
                updated: !!updateData,
              });
            }
          } else {
            console.warn('[PROFILE] ⚠️ username column does not exist in users table');
          }
        }
      } catch (syncError) {
        console.warn('[PROFILE] Failed to sync username to users table:', syncError);
      }
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      source: hasKV() ? 'kv' : 'memory'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    let userEmail = null;

    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userEmail = pleiaUser.email;

    let existingProfile = null;
    if (hasKV()) {
      existingProfile = await getProfileFromKV(userEmail);
      try {
        const kv = await import('@vercel/kv');
        await kv.kv.del(`jey_user_profile:${userEmail}`);
        if (existingProfile?.username) {
          await kv.kv.del(`username_index:${existingProfile.username}`);
        }
      } catch (err) {
        console.warn('KV DELETE profile error:', err);
      }
    } else {
      deleteProfileFromMemory(userEmail);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}