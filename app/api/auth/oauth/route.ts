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
    // Detectar entorno de forma más robusta
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'https';
    const vercelUrl = process.env.VERCEL_URL;
    const isVercel = !!vercelUrl;
    const isProduction = process.env.NODE_ENV === 'production' || isVercel;
    
    // Detectar si estamos en desarrollo local REAL (no Vercel preview)
    const isLocalDev = !isVercel && 
                       process.env.NODE_ENV === 'development' && 
                       host && (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('192.168.'));
    
    console.log('[AUTH] OAuth environment detection:', {
      host,
      protocol,
      NODE_ENV: process.env.NODE_ENV,
      isVercel,
      isProduction,
      isLocalDev,
      VERCEL_URL: vercelUrl,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
    });
    
    // Si redirectTo ya viene del cliente, validarlo y corregirlo si es necesario
    let finalRedirectTo = redirectTo;
    
    // 🚨 CRITICAL: Si redirectTo contiene localhost y NO estamos en desarrollo local, forzar producción
    if (finalRedirectTo && (finalRedirectTo.includes('localhost') || finalRedirectTo.includes('127.0.0.1'))) {
      if (!isLocalDev) {
        console.warn('[AUTH] ⚠️ RedirectTo contains localhost but NOT in local dev, forcing production URL');
        finalRedirectTo = finalRedirectTo.replace(/https?:\/\/[^/]+/, 'https://playlists.jeylabbb.com');
      } else {
        console.log('[AUTH] ✅ Using localhost redirect (local development)');
      }
    }
    
    if (!finalRedirectTo) {
      if (isLocalDev && host) {
        // Solo en desarrollo local REAL, usar el host de la request
        finalRedirectTo = `${protocol}://${host}/auth/callback`;
        console.log('[AUTH] ✅ Using localhost for local development:', finalRedirectTo);
      } else {
        // En producción o cualquier otro caso, usar producción
        finalRedirectTo = process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : 'https://playlists.jeylabbb.com/auth/callback';
        console.log('[AUTH] ✅ Using production URL:', finalRedirectTo);
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

