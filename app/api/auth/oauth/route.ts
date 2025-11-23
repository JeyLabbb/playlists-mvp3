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

    // 🚨 CRITICAL: Detectar entorno de forma robusta para redirección correcta
    let headersList;
    let host: string | null = null;
    let protocol = 'https';
    
    try {
      headersList = await headers();
      host = headersList?.get('host') || null;
      protocol = headersList?.get('x-forwarded-proto') || 'https';
    } catch (headersError) {
      console.error('[AUTH] Error getting headers:', headersError);
      // Fallback: usar variables de entorno
      host = null;
      protocol = 'https';
    }
    
    // Detección robusta de entorno
    const vercelUrl = process.env.VERCEL_URL;
    const isVercel = !!vercelUrl;
    const isVercelPreview = vercelUrl && !vercelUrl.includes('playlists.jeylabbb.com');
    const isProduction = process.env.NODE_ENV === 'production' || (isVercel && !isVercelPreview);
    
    // Detectar si estamos en desarrollo local REAL
    // Debe ser: NO Vercel, NODE_ENV=development, Y host localhost
    const isLocalDev = !isVercel && 
                       process.env.NODE_ENV === 'development' && 
                       host && (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('192.168.'));
    
    // Logs detallados para debugging (visibles en Vercel dashboard y local)
    console.log('[AUTH] 🔍 OAuth environment detection:', {
      host,
      protocol,
      NODE_ENV: process.env.NODE_ENV,
      isVercel,
      isVercelPreview,
      isProduction,
      isLocalDev,
      VERCEL_URL: vercelUrl,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      redirectToFromClient: redirectTo
    });
    
    // Si redirectTo ya viene del cliente, validarlo y corregirlo si es necesario
    let finalRedirectTo = redirectTo;
    
    // 🚨 CRITICAL: Validar y corregir redirectTo según el entorno
    if (finalRedirectTo && (finalRedirectTo.includes('localhost') || finalRedirectTo.includes('127.0.0.1'))) {
      if (!isLocalDev) {
        // Estamos en producción pero el cliente envió localhost → corregir
        console.warn('[AUTH] ⚠️ RedirectTo contains localhost but NOT in local dev, forcing production URL');
        finalRedirectTo = finalRedirectTo.replace(/https?:\/\/[^/]+/, 'https://playlists.jeylabbb.com');
        console.log('[AUTH] ✅ Corrected redirectTo to production:', finalRedirectTo);
      } else {
        // Estamos en local y el cliente envió localhost → está bien
        console.log('[AUTH] ✅ Using localhost redirect (local development):', finalRedirectTo);
      }
    } else if (finalRedirectTo && !isLocalDev && (finalRedirectTo.includes('localhost') || finalRedirectTo.includes('127.0.0.1'))) {
      // Caso edge: redirectTo tiene localhost pero no detectamos local dev
      console.warn('[AUTH] ⚠️ Edge case: redirectTo has localhost but isLocalDev=false, forcing production');
      finalRedirectTo = finalRedirectTo.replace(/https?:\/\/[^/]+/, 'https://playlists.jeylabbb.com');
    }
    
    // Si no hay redirectTo, construir uno según el entorno
    if (!finalRedirectTo) {
      if (isLocalDev && host) {
        // Desarrollo local: usar el host de la request
        finalRedirectTo = `${protocol}://${host}/auth/callback`;
        console.log('[AUTH] ✅ Constructed localhost redirect for local development:', finalRedirectTo);
      } else {
        // Producción: usar URL de producción
        finalRedirectTo = process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : 'https://playlists.jeylabbb.com/auth/callback';
        console.log('[AUTH] ✅ Constructed production redirect:', finalRedirectTo);
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

