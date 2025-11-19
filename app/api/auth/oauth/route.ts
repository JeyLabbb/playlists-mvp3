import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

export async function POST(request: Request) {
  try {
    const { provider, redirectTo } = await request.json();

    if (!provider) {
      return NextResponse.json(
        { ok: false, error: 'Proveedor OAuth requerido' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          redirectTo ||
          (process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : undefined),
      },
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, url: data?.url });
  } catch (error) {
    console.error('[AUTH] Error starting OAuth flow:', error);
    return NextResponse.json(
      { ok: false, error: 'Error iniciando autenticación externa' },
      { status: 500 }
    );
  }
}

