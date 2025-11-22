import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { provider, redirectTo } = await request.json();

    if (!provider) {
      return NextResponse.json(
        { ok: false, error: 'Proveedor OAuth requerido' },
        { status: 400 }
      );
    }

    // 🚨 CRITICAL: Construir URL de redirección usando el origin de la request
    // Esto asegura que funcione tanto en desarrollo como en producción
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'https';
    
    // Si redirectTo ya viene del cliente, validarlo y corregirlo si es necesario
    let finalRedirectTo = redirectTo;
    
    // 🚨 CRITICAL: Si redirectTo contiene localhost, reemplazarlo por producción
    if (finalRedirectTo && (finalRedirectTo.includes('localhost') || finalRedirectTo.includes('127.0.0.1'))) {
      console.warn('[AUTH] RedirectTo contains localhost, replacing with production URL');
      finalRedirectTo = finalRedirectTo.replace(/https?:\/\/[^/]+/, 'https://playlists.jeylabbb.com');
    }
    
    if (!finalRedirectTo) {
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        // Usar el host de la request solo si no es localhost
        finalRedirectTo = `${protocol}://${host}/auth/callback`;
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        // Fallback a variable de entorno
        finalRedirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
      } else {
        // Último fallback a producción
        finalRedirectTo = 'https://playlists.jeylabbb.com/auth/callback';
      }
    }

    console.log('[AUTH] OAuth redirect URL:', {
      provider,
      redirectTo: finalRedirectTo,
      host,
      protocol,
      hasEnvUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
    });

    const supabase = await createSupabaseRouteClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: finalRedirectTo,
      },
    });

    if (error) {
      console.error('[AUTH] OAuth error:', error);
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

