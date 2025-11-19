import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[AUTH] Error logging in:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}

