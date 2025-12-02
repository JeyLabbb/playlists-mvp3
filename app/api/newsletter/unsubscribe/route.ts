import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email es requerido' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const supabase = getSupabaseAdmin() ?? (await createSupabaseRouteClient());

    // Actualizar marketing_opt_in a false en la tabla users
    const { error: updateError } = await supabase
      .from('users')
      .update({ marketing_opt_in: false })
      .eq('email', normalizedEmail);

    if (updateError) {
      console.error('[UNSUBSCRIBE] Error updating user:', updateError);
      // No lanzamos error porque el usuario podría no estar en users
    }

    console.log(`[UNSUBSCRIBE] Usuario ${normalizedEmail} ha cancelado la suscripción`);

    return NextResponse.json({
      success: true,
      message: 'Te hemos dado de baja del newsletter. Esperamos que vuelvas pronto 🥺'
    });

  } catch (error: any) {
    console.error('[UNSUBSCRIBE] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

// GET endpoint para unsubscribe desde link de email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return new Response(
        `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - PLEIA Newsletter</title>
  <style>
    body { 
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0c101f 0%, #04070d 100%);
      color: #eff4ff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: rgba(12,16,31,0.8);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 48px 32px;
      text-align: center;
      max-width: 500px;
    }
    h1 { color: #22f6ce; margin-bottom: 16px; }
    p { color: rgba(239,244,255,0.78); line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>❌ Error</h1>
    <p>No se pudo procesar tu solicitud. Email no válido.</p>
  </div>
</body>
</html>`,
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = getSupabaseAdmin() ?? (await createSupabaseRouteClient());

    // Actualizar marketing_opt_in a false
    const { error: updateError } = await supabase
      .from('users')
      .update({ marketing_opt_in: false })
      .eq('email', normalizedEmail);

    if (updateError) {
      console.error('[UNSUBSCRIBE] Error updating user:', updateError);
    }

    console.log(`[UNSUBSCRIBE] Usuario ${normalizedEmail} canceló suscripción desde email`);

    // Página de confirmación con la pullita
    return new Response(
      `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adiós 😢 - PLEIA Newsletter</title>
  <style>
    body { 
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0c101f 0%, #04070d 100%);
      color: #eff4ff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: rgba(12,16,31,0.8);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 48px 32px;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 25px 60px rgba(3,9,18,0.65);
    }
    h1 { 
      font-size: 2.5rem;
      margin-bottom: 16px; 
      background: linear-gradient(135deg, #8c6fff, #22f6ce);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .emoji { font-size: 4rem; margin-bottom: 24px; }
    p { color: rgba(239,244,255,0.78); line-height: 1.6; margin-bottom: 16px; }
    .highlight { color: #22f6ce; font-weight: 600; }
    .cta {
      display: inline-block;
      margin-top: 24px;
      padding: 14px 32px;
      background: #22f6ce;
      color: #07131d;
      border-radius: 999px;
      font-weight: 600;
      text-decoration: none;
      transition: transform 0.2s;
    }
    .cta:hover { transform: translateY(-2px); }
    .pullita {
      margin-top: 32px;
      padding: 20px;
      background: rgba(255,107,107,0.1);
      border: 1px solid rgba(255,107,107,0.3);
      border-radius: 16px;
      font-size: 0.9rem;
      color: rgba(239,244,255,0.65);
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">😢💔</div>
    <h1>Nos has dejado...</h1>
    <p>Has sido dado de baja del newsletter de PLEIA.</p>
    <p>No recibirás más notificaciones sobre <span class="highlight">nuevas funciones mágicas</span>, <span class="highlight">actualizaciones exclusivas</span> ni <span class="highlight">tips secretos</span> para crear las mejores playlists.</p>
    
    <div class="pullita">
      💭 Mientras otros descubren funciones increíbles y trucos exclusivos, tú... bueno, tú seguirás creando playlists sin saber qué te estás perdiendo. Pero hey, respetamos tu decisión. 
      <br><br>
      <strong>Puedes reactivar la suscripción cuando quieras desde tu perfil.</strong>
    </div>

    <a href="https://playlists.jeylabbb.com" class="cta">
      Volver a PLEIA
    </a>
  </div>
</body>
</html>`,
      { 
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );

  } catch (error: any) {
    console.error('[UNSUBSCRIBE] GET Error:', error);
    return new Response(
      `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Error - PLEIA</title>
  <style>
    body { 
      font-family: system-ui; 
      background: #0c101f; 
      color: #fff; 
      text-align: center; 
      padding: 50px; 
    }
  </style>
</head>
<body>
  <h1>Error</h1>
  <p>Hubo un problema al procesar tu solicitud.</p>
</body>
</html>`,
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

