import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../../../lib/auth/config';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Testing Spotify provider configuration...');
    
    // Test the Spotify provider directly
    const spotifyProvider = authOptions.providers.find(p => p.id === 'spotify');
    
    if (!spotifyProvider) {
      return NextResponse.json({
        ok: false,
        error: 'Spotify provider not found in authOptions'
      }, { status: 500 });
    }
    
    console.log('[DEBUG] Spotify provider found:', {
      id: spotifyProvider.id,
      name: spotifyProvider.name,
      hasClientId: !!spotifyProvider.clientId,
      hasClientSecret: !!spotifyProvider.clientSecret
    });
    
    // Test environment variables directly
    const envVars = {
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL
    };
    
    console.log('[DEBUG] Environment variables:', {
      SPOTIFY_CLIENT_ID: envVars.SPOTIFY_CLIENT_ID ? 'SET' : 'MISSING',
      SPOTIFY_CLIENT_SECRET: envVars.SPOTIFY_CLIENT_SECRET ? 'SET' : 'MISSING',
      NEXTAUTH_SECRET: envVars.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
      NEXTAUTH_URL: envVars.NEXTAUTH_URL || 'MISSING'
    });
    
    return NextResponse.json({
      ok: true,
      message: 'Spotify provider configuration check completed',
      provider: {
        id: spotifyProvider.id,
        name: spotifyProvider.name,
        hasClientId: !!spotifyProvider.clientId,
        hasClientSecret: !!spotifyProvider.clientSecret,
        clientIdPreview: spotifyProvider.clientId ? `${spotifyProvider.clientId.substring(0, 10)}...` : 'MISSING'
      },
      envVars: {
        SPOTIFY_CLIENT_ID: envVars.SPOTIFY_CLIENT_ID ? 'SET' : 'MISSING',
        SPOTIFY_CLIENT_SECRET: envVars.SPOTIFY_CLIENT_SECRET ? 'SET' : 'MISSING',
        NEXTAUTH_SECRET: envVars.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
        NEXTAUTH_URL: envVars.NEXTAUTH_URL || 'MISSING'
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Error checking Spotify provider:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
