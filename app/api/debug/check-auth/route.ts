import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Checking authentication status...');
    
    const session = await getServerSession(authOptions as any);
    
    if (!session) {
      return NextResponse.json({
        ok: false,
        error: 'No session found',
        authenticated: false
      }, { status: 401 });
    }
    
    console.log('[DEBUG] Session found:', {
      email: session.user?.email,
      hasAccessToken: !!session.accessToken,
      tokenLength: session.accessToken?.length || 0
    });
    
    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        email: session.user?.email,
        name: session.user?.name,
        image: session.user?.image
      },
      hasAccessToken: !!session.accessToken,
      tokenPreview: session.accessToken ? `${session.accessToken.substring(0, 20)}...` : null
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Error checking auth:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      authenticated: false
    }, { status: 500 });
  }
}
