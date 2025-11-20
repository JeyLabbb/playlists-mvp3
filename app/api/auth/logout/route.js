import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

export async function POST() {
  try {
    const user = await getPleiaServerUser();
    
    console.log('[LOGOUT] User logout requested:', user?.email || 'anonymous');
    
    // La UI redirigirá al home
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    return NextResponse.json({ ok: false, error: 'Logout failed' }, { status: 500 });
  }
}
