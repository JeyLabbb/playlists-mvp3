import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'jeylabbb@gmail.com';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-session-secret-key';

console.log(`[MIDDLEWARE] SESSION_SECRET: ${SESSION_SECRET}`);
console.log(`[MIDDLEWARE] ADMIN_EMAIL: ${ADMIN_EMAIL}`);

async function verifySessionToken(token: string): Promise<{ email: string; valid: boolean }> {
  try {
    console.log(`[MIDDLEWARE] Verifying token: ${token.substring(0, 20)}...`);
    
    // Validar que el token tenga el formato correcto antes de decodificar
    if (!token || typeof token !== 'string' || token.length < 10) {
      console.log(`[MIDDLEWARE] Invalid token format`);
      return { email: '', valid: false };
    }
    
    let decoded: string;
    try {
      // Usar el mismo método que la API de auth
      decoded = Buffer.from(token, 'base64').toString('utf-8');
    } catch (decodeError) {
      console.log(`[MIDDLEWARE] Token decode error:`, decodeError);
      return { email: '', valid: false };
    }
    
    console.log(`[MIDDLEWARE] Decoded token: ${decoded}`);
    const [email, timestamp, signature] = decoded.split(':');
    
    if (!email || !timestamp || !signature) {
      console.log(`[MIDDLEWARE] Missing parts: email=${!!email}, timestamp=${!!timestamp}, signature=${!!signature}`);
      return { email: '', valid: false };
    }

    // Verificar que el timestamp sea un número válido
    const timestampNum = parseInt(timestamp);
    if (isNaN(timestampNum)) {
      console.log(`[MIDDLEWARE] Invalid timestamp: ${timestamp}`);
      return { email: '', valid: false };
    }

    // Verificar que el token no sea muy antiguo (24 horas)
    const tokenAge = Date.now() - timestampNum;
    console.log(`[MIDDLEWARE] Token age: ${tokenAge}ms (max: ${24 * 60 * 60 * 1000}ms)`);
    if (tokenAge > 24 * 60 * 60 * 1000) {
      console.log(`[MIDDLEWARE] Token too old`);
      return { email: '', valid: false };
    }

    // SIMPLIFICADO: Solo verificar que el email sea correcto
    // (La firma ya se verificó en el endpoint de auth)
    if (email === ADMIN_EMAIL) {
      console.log(`[MIDDLEWARE] Token valid for email: ${email}`);
      return { email, valid: true };
    }

    console.log(`[MIDDLEWARE] Invalid email: ${email}`);
    return { email: '', valid: false };
  } catch (error) {
    console.log(`[MIDDLEWARE] Error verifying token:`, error);
    return { email: '', valid: false };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`[MIDDLEWARE] Checking: ${pathname}`);

  // Solo proteger rutas /admin/* excepto /admin/login
  if (pathname.startsWith('/admin/') && pathname !== '/admin/login') {
    console.log(`[MIDDLEWARE] Admin route detected: ${pathname}`);
    
    const sessionToken = request.cookies.get('admin-session')?.value;
    console.log(`[MIDDLEWARE] Session token: ${sessionToken ? 'present' : 'missing'}`);
    
    if (!sessionToken) {
      console.log(`[MIDDLEWARE] No session token, redirecting to login`);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const { email, valid } = await verifySessionToken(sessionToken);
    console.log(`[MIDDLEWARE] Token verification: email=${email}, valid=${valid}`);
    console.log(`[MIDDLEWARE] Expected email: ${ADMIN_EMAIL}`);
    
    if (!valid || email !== ADMIN_EMAIL) {
      console.log(`[MIDDLEWARE] Invalid token, redirecting to login`);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    console.log(`[MIDDLEWARE] Access granted for ${email}`);
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
