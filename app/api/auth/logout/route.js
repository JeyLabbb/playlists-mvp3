import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

export async function POST() {
  try {
    const user = await getPleiaServerUser();
    
    // Crear respuesta
    const res = NextResponse.json({ ok: true });
    
    // Snooze del Early Access tras cerrar sesión (24h)
    res.headers.set('Set-Cookie', 'ea_snooze=1; Path=/; Max-Age=86400; SameSite=Lax; Secure');
    
    // Cookie para forzar re-consent (1h)
    res.headers.set('Set-Cookie', 'force_reconsent=1; Path=/; Max-Age=3600; SameSite=Lax; Secure');
    
    console.log('[LOGOUT] User logout requested:', user?.email || 'anonymous');
    
    // La UI hará window.location.href = '/api/auth/signout?callbackUrl=/'
    return res;
  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    return NextResponse.json({ ok: false, error: 'Logout failed' }, { status: 500 });
  }
}
