import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { HUB_MODE } from '@/lib/features';
import { hubAddTracks, hubCreatePlaylist } from '@/lib/spotify/hubClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  if (!HUB_MODE) {
    return NextResponse.json({ ok: false, error: 'Hub mode disabled' }, { status: 400 });
  }

  try {
    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, tracks } = await request.json();
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ ok: false, error: 'No tracks provided' }, { status: 400 });
    }

    const safeName = (name || `PLEIA Playlist ${new Date().toISOString().slice(0, 10)}`).slice(0, 90);
    const playlist = await hubCreatePlaylist({
      name: safeName,
      description,
      public: true,
    });

    const playlistId = playlist?.id;
    const playlistUrl = playlist?.external_urls?.spotify || (playlistId ? `https://open.spotify.com/playlist/${playlistId}` : null);
    const uris = tracks
      .map((track: any) => track.uri || track.trackUri || track.id)
      .filter(Boolean)
      .map((id: string) => (id.startsWith('spotify:track:') ? id : `spotify:track:${id}`));

    if (playlistId && uris.length) {
      await hubAddTracks(playlistId, uris);
    } else {
      return NextResponse.json({ ok: false, error: 'No tracks to add' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      playlist: {
        id: playlistId,
        url: playlistUrl,
        name: playlist?.name || safeName,
        pending: false,
      },
    });
  } catch (error) {
    console.error('[HUB] Publish error:', error);
    const message =
      error instanceof Error && error.message?.includes('PLEIA_HUB_USER_ID')
        ? 'PLEIA_HUB_USER_ID no está configurado en el servidor'
        : 'Failed to publish playlist';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

