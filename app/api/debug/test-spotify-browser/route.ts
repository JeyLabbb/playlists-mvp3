import { NextRequest, NextResponse } from 'next/server';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Testing Spotify API from browser...');
    
    const accessToken = await getHubAccessToken();
    if (!accessToken) {
      return NextResponse.json({
        ok: false,
        error: 'No Spotify access token found',
        authenticated: false
      }, { status: 401 });
    }
    console.log(`[DEBUG] Access token found: ${accessToken.substring(0, 20)}...`);
    
    // Test user profile first
    console.log('[DEBUG] Testing user profile...');
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error(`[DEBUG] Profile failed: ${profileResponse.status}`, errorText);
      return NextResponse.json({
        ok: false,
        error: `Profile failed: ${profileResponse.status}`,
        details: errorText,
        authenticated: true
      }, { status: 500 });
    }
    
    const profile = await profileResponse.json();
    console.log(`[DEBUG] Profile successful: ${profile.display_name || profile.id}`);
    
    // Test track search
    console.log('[DEBUG] Testing track search...');
    const searchResponse = await fetch('https://api.spotify.com/v1/search?q=weightless&type=track&limit=5', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[DEBUG] Search failed: ${searchResponse.status}`, errorText);
      return NextResponse.json({
        ok: false,
        error: `Search failed: ${searchResponse.status}`,
        details: errorText,
        authenticated: true,
        profile: profile
      }, { status: 500 });
    }
    
    const searchResult = await searchResponse.json();
    console.log(`[DEBUG] Search successful: ${searchResult.tracks?.items?.length || 0} tracks found`);
    
    return NextResponse.json({
      ok: true,
      message: 'Spotify API test completed successfully',
      authenticated: true,
      profile: {
        id: profile.id,
        display_name: profile.display_name,
        email: profile.email
      },
      searchResult: {
        tracksFound: searchResult.tracks?.items?.length || 0,
        firstTrack: searchResult.tracks?.items?.[0]?.name || 'None'
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Error in Spotify API test:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
