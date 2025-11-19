import { NextResponse } from "next/server";
import { getHubAccessToken } from '@/lib/spotify/hubAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SpotifyTrack = {
  track: {
    id: string;
    name: string;
    artists?: Array<{ name: string }>;
    album?: { name?: string };
    external_ids?: { isrc?: string };
    external_urls?: { spotify?: string };
  } | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playlistId = searchParams.get('playlistId');

  if (!playlistId) {
    return NextResponse.json({ ok: false, error: 'playlistId is required' }, { status: 400 });
  }

  try {
    const accessToken = await getHubAccessToken();
    const items: SpotifyTrack[] = [];
    let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[CSV EXPORT] Spotify API error:', res.status, errorText);
        return NextResponse.json(
          { ok: false, error: 'Failed to fetch playlist tracks' },
          { status: res.status }
        );
      }

      const data = await res.json();
      items.push(...(data.items || []));
      nextUrl = data.next;
    }

    const header = ['track_name', 'artist_name', 'album', 'isrc', 'spotify_track_url'];
    const rows = [header.join(',')];

    for (const item of items) {
      const track = item.track;
      if (!track) continue;

      const name = (track.name || '').replace(/"/g, '""');
      const artists = (track.artists || []).map((artist) => artist.name).join('; ').replace(/"/g, '""');
      const album = (track.album?.name || '').replace(/"/g, '""');
      const isrc = track.external_ids?.isrc || '';
      const url = track.external_urls?.spotify || (track.id ? `https://open.spotify.com/track/${track.id}` : '');

      rows.push(
        [`"${name}"`, `"${artists}"`, `"${album}"`, `"${isrc}"`, `"${url}"`].join(',')
      );
    }

    const csvContent = rows.join('\n');
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="playlist_${playlistId}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[CSV EXPORT] Unexpected error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

