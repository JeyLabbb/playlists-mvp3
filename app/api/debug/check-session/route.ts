import { NextRequest, NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Checking session details...');
    
    const user = await getPleiaServerUser();
    
    if (!user) {
      return NextResponse.json({
        ok: false,
        error: 'No session found',
        authenticated: false,
        message: 'Please log in'
      }, { status: 401 });
    }
    
    console.log('[DEBUG] Session found:', {
      user: user,
      email: user.email,
      name: user.name
    });
    
    return NextResponse.json({
      ok: true,
      authenticated: true,
      session: {
        user: {
          email: user.email,
          name: user.name,
          image: user.image,
          id: user.id
        }
      },
      message: 'Session is valid'
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
