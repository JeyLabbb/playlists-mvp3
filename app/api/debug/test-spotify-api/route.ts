import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

export async function POST(request: NextRequest) {
  try {
    const { testType = 'search' } = await request.json();
    
    console.log(`[DEBUG] Testing Spotify API: ${testType}`);
    
    const session = await getServerSession(authOptions as any);
    if (!session?.accessToken) {
      return NextResponse.json({
        ok: false,
        error: 'No Spotify access token found'
      }, { status: 401 });
    }
    
    const accessToken = session.accessToken;
    console.log(`[DEBUG] Access token found: ${accessToken.substring(0, 20)}...`);
    
    let testResult;
    
    if (testType === 'search') {
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
          details: errorText
        }, { status: 500 });
      }
      
      testResult = await searchResponse.json();
      console.log(`[DEBUG] Search successful: ${testResult.tracks?.items?.length || 0} tracks found`);
      
    } else if (testType === 'profile') {
      // Test user profile
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
          details: errorText
        }, { status: 500 });
      }
      
      testResult = await profileResponse.json();
      console.log(`[DEBUG] Profile successful: ${testResult.display_name || testResult.id}`);
      
    } else if (testType === 'playlist') {
      // Test playlist creation
      console.log('[DEBUG] Testing playlist creation...');
      const createResponse = await fetch('https://api.spotify.com/v1/me/playlists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Playlist Debug',
          description: 'Test playlist for debugging',
          public: false
        })
      });
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(`[DEBUG] Playlist creation failed: ${createResponse.status}`, errorText);
        return NextResponse.json({
          ok: false,
          error: `Playlist creation failed: ${createResponse.status}`,
          details: errorText
        }, { status: 500 });
      }
      
      testResult = await createResponse.json();
      console.log(`[DEBUG] Playlist creation successful: ${testResult.id}`);
    }
    
    return NextResponse.json({
      ok: true,
      message: `Spotify API test (${testType}) completed successfully`,
      result: testResult
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
