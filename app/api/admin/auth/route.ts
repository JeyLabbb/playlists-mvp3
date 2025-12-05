import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configuración de admin (en producción, usar variables de entorno)
const ADMIN_EMAIL = 'jeylabbb@gmail.com';
const ADMIN_PASSWORD = 'FuturosMillonarios'; // Cambiar por una contraseña segura
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-session-secret-key';

console.log(`[ADMIN_AUTH] SESSION_SECRET: ${SESSION_SECRET}`);
console.log(`[ADMIN_AUTH] ADMIN_EMAIL: ${ADMIN_EMAIL}`);

function createSessionToken(email: string): string {
  const timestamp = Date.now();
  const data = `${email}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('hex');
  return Buffer.from(`${data}:${signature}`).toString('base64');
}

function verifySessionToken(token: string): { email: string; valid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, timestamp, signature] = decoded.split(':');
    
    if (!email || !timestamp || !signature) {
      return { email: '', valid: false };
    }

    // Verificar que el token no sea muy antiguo (24 horas)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return { email: '', valid: false };
    }

    // Verificar firma
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(`${email}:${timestamp}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { email: '', valid: false };
    }

    return { email, valid: true };
  } catch (error) {
    return { email: '', valid: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Verificar credenciales
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }

    // Crear sesión
    const sessionToken = createSessionToken(email);
    
    // Configurar cookie
    const cookieStore = await cookies();
    cookieStore.set('admin-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 horas
      path: '/'
    });

    console.log(`[ADMIN] Login successful for ${email}`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[ADMIN] Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin-session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false });
    }

    const { email, valid } = verifySessionToken(sessionToken);

    if (!valid || email !== ADMIN_EMAIL) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ authenticated: true, email });

  } catch (error: any) {
    console.error('[ADMIN] Session check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin-session');

    console.log('[ADMIN] Logout successful');

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[ADMIN] Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
