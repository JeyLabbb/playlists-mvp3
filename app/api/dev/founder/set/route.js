import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

// TODO: eliminar este endpoint dev antes de deploy

export async function POST() {
  // Solo en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ ok: false, error: 'No session' }, { status: 401 });
    }

    const email = user.email;
    console.log('[DEV] Marking user as Founder:', email);

    // Usar el mismo store que ya existe para el perfil
    const kv = await import('@vercel/kv');
    const profileKey = `profile:${email}`;
    
    // Obtener perfil existente
    const existingProfile = await kv.kv.get(profileKey) || {};
    
    // Upsert del perfil con Founder status
    const updatedProfile = {
      ...existingProfile,
      plan: 'founder',
      founderSince: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.kv.set(profileKey, updatedProfile);
    
    console.log('[DEV] User marked as Founder successfully:', email);
    
    return NextResponse.json({ 
      ok: true, 
      email: email, 
      plan: 'founder' 
    });
  } catch (error) {
    console.error('[DEV] Error marking user as Founder:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}
