import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000';
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    const expectedRedirectUri = `${baseUrl}/api/auth/callback/spotify`;
    const expectedAuthUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&scope=user-read-email%20user-read-private%20playlist-modify-public%20playlist-modify-private%20ugc-image-upload%20user-read-private&response_type=code&redirect_uri=${encodeURIComponent(expectedRedirectUri)}`;
    
    return NextResponse.json({
      ok: true,
      message: 'Spotify configuration check',
      configuration: {
        baseUrl,
        clientId: clientId ? `${clientId.substring(0, 10)}...` : 'MISSING',
        clientSecret: clientSecret ? 'SET' : 'MISSING',
        expectedRedirectUri,
        expectedAuthUrl
      },
      spotifyAppSettings: {
        redirectUri: expectedRedirectUri,
        clientId: clientId,
        scopes: [
          'user-read-email',
          'user-read-private', 
          'playlist-modify-public',
          'playlist-modify-private',
          'ugc-image-upload',
          'user-read-private'
        ]
      },
      instructions: {
        step1: 'Go to https://developer.spotify.com/dashboard',
        step2: 'Select your application',
        step3: 'Click "Edit Settings"',
        step4: `Add this exact Redirect URI: ${expectedRedirectUri}`,
        step5: 'Save changes',
        step6: 'Try logging in again'
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Error checking Spotify config:', error);
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
}
