import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Checking session details...');
    
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({
        ok: false,
        error: 'No session found',
        authenticated: false,
        message: 'Please log in with Spotify'
      }, { status: 401 });
    }
    
    console.log('[DEBUG] Session found:', {
      user: session.user,
      hasAccessToken: !!session.accessToken,
      hasSpotify: !!session.spotify,
      error: session.error
    });
    
    return NextResponse.json({
      ok: true,
      authenticated: true,
      session: {
        user: session.user,
        hasAccessToken: !!session.accessToken,
        accessTokenPreview: session.accessToken ? `${session.accessToken.substring(0, 20)}...` : null,
        hasSpotify: !!session.spotify,
        spotify: session.spotify,
        error: session.error
      },
      message: session.error ? 'Session has error, may need refresh' : 'Session is valid'
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Error checking session:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      authenticated: false
    }, { status: 500 });
  }
}
