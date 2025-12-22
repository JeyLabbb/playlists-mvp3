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
      const forwardedProto = headersList?.get('x-forwarded-proto');
      
      // Si el host es localhost, forzar http (no https)
      if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
        protocol = 'http';
      } else {
        protocol = forwardedProto || 'https';
      }
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
    // Debe ser: NO Vercel, Y host localhost (NODE_ENV puede no estar en development en algunos casos)
    const isLocalDev = !isVercel && 
                       host && (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('192.168.'));
    
    // Forzar local dev si estamos en puerto 3000, 3001, 3002 (puertos comunes de desarrollo)
    const isLocalPort = host && /^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/.test(host);
    const finalIsLocalDev = isLocalDev || (isLocalPort && !isVercel);
    
    // Logs detallados para debugging (visibles en Vercel dashboard y local)
    console.log('[AUTH] 🔍 OAuth environment detection:', {
      host,
      protocol,
      NODE_ENV: process.env.NODE_ENV,
      isVercel,
      isVercelPreview,
      isProduction,
      isLocalDev,
      isLocalPort,
      finalIsLocalDev,
      VERCEL_URL: vercelUrl,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      redirectToFromClient: redirectTo
    });
    
    // Si redirectTo ya viene del cliente, validarlo y corregirlo si es necesario
    let finalRedirectTo = redirectTo;
    
    // 🚨 CRITICAL: Validar y corregir redirectTo según el entorno
    if (finalRedirectTo && (finalRedirectTo.includes('localhost') || finalRedirectTo.includes('127.0.0.1'))) {
      if (!finalIsLocalDev) {
        // Estamos en producción pero el cliente envió localhost → corregir
        console.warn('[AUTH] ⚠️ RedirectTo contains localhost but NOT in local dev, forcing production URL');
        finalRedirectTo = finalRedirectTo.replace(/https?:\/\/[^/]+/, 'https://playlists.jeylabbb.com');
        console.log('[AUTH] ✅ Corrected redirectTo to production:', finalRedirectTo);
      } else {
        // Estamos en local y el cliente envió localhost → está bien
        console.log('[AUTH] ✅ Using localhost redirect (local development):', finalRedirectTo);
      }
    } else if (finalRedirectTo && !finalIsLocalDev && (finalRedirectTo.includes('localhost') || finalRedirectTo.includes('127.0.0.1'))) {
      // Caso edge: redirectTo tiene localhost pero no detectamos local dev
      console.warn('[AUTH] ⚠️ Edge case: redirectTo has localhost but isLocalDev=false, forcing production');
      finalRedirectTo = finalRedirectTo.replace(/https?:\/\/[^/]+/, 'https://playlists.jeylabbb.com');
    }
    
    // Si no hay redirectTo, construir uno según el entorno
    if (!finalRedirectTo) {
      if (finalIsLocalDev && host) {
        // Desarrollo local: usar el host de la request (forzar http en local)
        const localProtocol = 'http'; // Siempre http en local
        finalRedirectTo = `${localProtocol}://${host}/auth/callback`;
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
      finalIsLocalDev,
    });

    const supabase = await createSupabaseRouteClient();
    
    // 🚨 CRITICAL: En local, forzar que Supabase use la URL de localhost
    // Aunque Supabase tenga configurada la URL de producción, podemos forzar la redirección
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: finalRedirectTo,
        // En local, también especificar queryParams para asegurar que Google use la URL correcta
        queryParams: finalIsLocalDev ? {
          redirect_to: finalRedirectTo,
        } : undefined,
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

