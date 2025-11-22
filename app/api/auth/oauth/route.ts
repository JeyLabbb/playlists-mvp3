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

    // 🚨 CRITICAL: SIEMPRE usar URL de producción en producción
    // Solo usar localhost si estamos explícitamente en desarrollo local
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'https';
    
    // Detectar si estamos en desarrollo local
    const isLocalDev = process.env.NODE_ENV === 'development' && 
                       host && (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('192.168.'));
    
    // Si redirectTo ya viene del cliente, validarlo y corregirlo si es necesario
    let finalRedirectTo = redirectTo;
    
    // 🚨 CRITICAL: Si redirectTo contiene localhost y NO estamos en desarrollo local, forzar producción
    if (finalRedirectTo && (finalRedirectTo.includes('localhost') || finalRedirectTo.includes('127.0.0.1'))) {
      if (!isLocalDev) {
        console.warn('[AUTH] RedirectTo contains localhost in production, forcing production URL');
        finalRedirectTo = finalRedirectTo.replace(/https?:\/\/[^/]+/, 'https://playlists.jeylabbb.com');
      }
    }
    
    if (!finalRedirectTo) {
      if (isLocalDev && host) {
        // Solo en desarrollo local explícito, usar el host de la request
        finalRedirectTo = `${protocol}://${host}/auth/callback`;
      } else {
        // En producción o cualquier otro caso, usar producción
        finalRedirectTo = process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : 'https://playlists.jeylabbb.com/auth/callback';
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

