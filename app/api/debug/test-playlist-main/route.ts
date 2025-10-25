import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, email } = await request.json();
    
    if (!prompt || !email) {
      return NextResponse.json({
        ok: false,
        error: 'Prompt and email are required'
      }, { status: 400 });
    }
    
    console.log(`[DEBUG] Testing playlist generation with mock auth for: ${email}`);
    console.log(`[DEBUG] Prompt: "${prompt}"`);
    
    // Test the main playlist endpoint with mock token
    const playlistResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/playlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        target_tracks: 10 // Small number for testing
      })
    });
    
    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text();
      console.error(`[DEBUG] Playlist endpoint failed: ${playlistResponse.status}`, errorText);
      return NextResponse.json({
        ok: false,
        error: `Playlist endpoint failed: ${playlistResponse.status}`,
        details: errorText
      }, { status: 500 });
    }
    
    const playlistData = await playlistResponse.json();
    console.log(`[DEBUG] Playlist response received:`, {
      ok: playlistData.ok,
      tracks: playlistData.tracks?.length || 0,
      mode: playlistData.mode
    });
    
    return NextResponse.json({
      ok: true,
      message: 'Playlist generation test completed',
      result: playlistData
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Error in playlist generation test:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
