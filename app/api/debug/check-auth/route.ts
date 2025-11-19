import { NextRequest, NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Checking authentication status...');
    
    const user = await getPleiaServerUser();
    
    if (!user) {
      return NextResponse.json({
        ok: false,
        error: 'No session found',
        authenticated: false
      }, { status: 401 });
    }
    
    console.log('[DEBUG] Session found:', {
      email: user.email,
      name: user.name,
      id: user.id
    });
    
    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        email: user.email,
        name: user.name,
        image: user.image,
        id: user.id
      }
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
