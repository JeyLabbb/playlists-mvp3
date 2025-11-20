import { NextResponse } from 'next/server';
import { REFERRALS_ENABLED } from '@/lib/referrals';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

export async function POST(request) {
  try {
    if (!REFERRALS_ENABLED) {
      return NextResponse.json({ error: 'Referrals not enabled' }, { status: 403 });
    }

    const pleiaUser = await getPleiaServerUser();
    
    if (!pleiaUser?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const currentUserEmail = pleiaUser.email.toLowerCase();
    console.log('[REF] Updating playlist count for user:', currentUserEmail);

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

    // 🚨 CRITICAL: Ya no contamos al crear la primera playlist
    // Ahora contamos cuando se crea la cuenta (en /api/referrals/track)
    // Este endpoint solo actualiza el contador de playlists del usuario
    // El contador del referrer y el upgrade a founder se manejan en /api/referrals/track

    return NextResponse.json({ 
      success: true, 
      message: 'Playlist count updated',
      hasCreatedPlaylist
    });

  } catch (error) {
    console.error('[REF] Error updating playlist count:', error);
    return NextResponse.json({ error: 'Failed to update playlist count' }, { status: 500 });
  }
}
