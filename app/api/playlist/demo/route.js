import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { prompt, target_tracks } = await request.json();
    
    if (!prompt || !target_tracks) {
      return NextResponse.json({ error: 'Missing prompt or target_tracks' }, { status: 400 });
    }

    // Get intent from LLM
    const intentResponse = await fetch('http://localhost:3001/api/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, target_tracks })
    });

    if (!intentResponse.ok) {
      return NextResponse.json({ error: 'Failed to get intent' }, { status: 500 });
    }

    const intent = await intentResponse.json();
    
    // Generate mock tracks based on intent
    const mockTracks = [];
    const artists = intent.artists_llm || ['Miles Davis', 'John Coltrane', 'Bill Evans', 'Thelonious Monk', 'Duke Ellington'];
    const genres = intent.criterios?.generos || ['jazz'];
    
    // Generate mock tracks
    for (let i = 0; i < Math.min(intent.tracks_llm?.length || 0, target_tracks); i++) {
      const track = intent.tracks_llm[i] || {
        title: `Track ${i + 1}`,
        artist: artists[i % artists.length]
      };
      
      mockTracks.push({
        id: `demo_${i}_${Date.now()}`,
        name: track.title,
        artists: [track.artist],
        popularity: Math.floor(Math.random() * 100),
        album: `${track.artist} Album`,
        external_urls: { spotify: 'https://open.spotify.com/track/demo' },
        preview_url: null,
        uri: `spotify:track:demo_${i}`
      });
    }

    // Fill remaining slots with mock tracks
    while (mockTracks.length < target_tracks) {
      const i = mockTracks.length;
      const artist = artists[i % artists.length];
      mockTracks.push({
        id: `demo_${i}_${Date.now()}`,
        name: `${artist} - Demo Track ${i + 1}`,
        artists: [artist],
        popularity: Math.floor(Math.random() * 100),
        album: `${artist} Demo Album`,
        external_urls: { spotify: 'https://open.spotify.com/track/demo' },
        preview_url: null,
        uri: `spotify:track:demo_${i}`
      });
    }

    // Store run data for debugging
    const runData = {
      runId: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prompt,
      targetTracks: target_tracks,
      modo: intent.modo,
      llmShare: intent.llmShare,
      llmTracksCount: intent.tracks_llm?.length || 0,
      spotifyTracksCount: 0,
      finalTracksCount: mockTracks.length,
      note: "Demo mode - no Spotify authentication required",
      duration: 0,
      success: true,
      timestamp: new Date().toISOString()
    };
    
    // Store in global for debug endpoint
    globalThis.__LAST_RUN_DATA__ = runData;

    return NextResponse.json({
      tracks: mockTracks,
      metadata: {
        run_id: runData.runId,
        intent: intent,
        llm_tracks: intent.tracks_llm?.length || 0,
        spotify_tracks: 0,
        collection_log: {
          collected: mockTracks.length,
          final: mockTracks.length
        },
        relaxation_steps: [],
        artist_distribution: mockTracks.reduce((acc, track) => {
          const artist = track.artists[0];
          acc[artist] = (acc[artist] || 0) + 1;
          return acc;
        }, {}),
        note: "Demo mode - no Spotify authentication required"
      }
    });

  } catch (error) {
    console.error('[DEMO] Error:', error);
    return NextResponse.json({ 
      error: 'Demo generation failed', 
      details: error.message 
    }, { status: 500 });
  }
}
