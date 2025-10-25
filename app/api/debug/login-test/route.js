import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    console.log('[LOGIN-TEST] Received:', { email, password: password ? '***' : 'missing' });
    
    // Simular login exitoso
    if (email === 'jeylabbb@gmail.com' && password === 'FuturosMillonarios') {
      const cookieStore = await cookies();
      
      // Crear token simple para testing
      const testToken = Buffer.from(`test:${Date.now()}:test`).toString('base64');
      
      cookieStore.set('admin-session', testToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/'
      });
      
      console.log('[LOGIN-TEST] Cookie set successfully');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Login test successful',
        redirect: '/admin/debug/db'
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid credentials' 
    }, { status: 401 });
    
  } catch (error) {
    console.error('[LOGIN-TEST] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin-session')?.value;
    
    return NextResponse.json({
      hasToken: !!sessionToken,
      token: sessionToken ? sessionToken.substring(0, 20) + '...' : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error.message });
  }
}
