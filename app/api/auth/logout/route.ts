import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

export async function POST() {
  try {
    const supabase = await createSupabaseRouteClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[AUTH] Error during logout:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}

