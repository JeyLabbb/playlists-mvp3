import { redirect } from 'next/navigation';
import Link from 'next/link';
import { stripe } from '@/lib/stripe';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { trackPayment } from '@/lib/mtryxClient';

// 🚨 CRITICAL: Forzar renderizado dinámico porque usamos searchParams y procesamos pagos
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🚨 CRITICAL: Esta página procesa el pago EN EL SERVIDOR antes de renderizar
 * Se ejecuta ANTES de que el usuario vea cualquier contenido
 */
async function processPaymentOnServer(sessionId: string) {
  const startTime = Date.now();
  console.log('[SUCCESS-PAGE-SERVER] ===== PROCESAMIENTO EN SERVIDOR (ANTES DE RENDER) =====');
  console.log('[SUCCESS-PAGE-SERVER] Session ID:', sessionId);
  
  try {
    // 1. Obtener sesión de Stripe
    console.log('[SUCCESS-PAGE-SERVER] 🔄 Obteniendo sesión de Stripe...');
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!stripeSession) {
      console.error('[SUCCESS-PAGE-SERVER] ❌ Stripe session not found');
      return { success: false, error: 'Stripe session not found' };
    }
    
    console.log('[SUCCESS-PAGE-SERVER] ✅ Sesión de Stripe obtenida:', {
      id: stripeSession.id,
      payment_status: stripeSession.payment_status,
      customer_email: stripeSession.customer_details?.email || stripeSession.customer_email
    });
    
    // 2. Obtener email del usuario (prioridad: autenticado Supabase > Stripe)
    let userEmail = null;
    let isAuthenticatedUser = false;
    
    try {
      const pleiaUser = await getPleiaServerUser();
      if (pleiaUser?.email) {
        userEmail = pleiaUser.email.toLowerCase();
        isAuthenticatedUser = true;
        console.log('[SUCCESS-PAGE-SERVER] ✅ Usuario autenticado (Supabase):', userEmail);
      }
    } catch (authError) {
      console.error('[SUCCESS-PAGE-SERVER] ⚠️ Error obteniendo sesión de Supabase:', authError);
    }
    
    if (!userEmail) {
      const stripeEmail = stripeSession.customer_details?.email || stripeSession.customer_email;
      if (stripeEmail) {
        userEmail = stripeEmail.toLowerCase();
        console.log('[SUCCESS-PAGE-SERVER] ⚠️ Usando email de Stripe:', userEmail);
      } else {
        console.error('[SUCCESS-PAGE-SERVER] ❌ No hay email disponible');
        return { success: false, error: 'No email found' };
      }
    }
    
    // 3. Verificar si es Founder Pass
    console.log('[SUCCESS-PAGE-SERVER] 🔍 Verificando si es Founder Pass...');
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const founderPriceId = process.env.STRIPE_PRICE_FOUNDER;
    
    console.log('[SUCCESS-PAGE-SERVER] 🔍 Datos de verificación:', {
      founderPriceId: founderPriceId,
      lineItemsCount: lineItems.data.length,
      priceIds: lineItems.data.map(item => item.price?.id),
      descriptions: lineItems.data.map(item => item.description)
    });
    
    const isFounderPass = lineItems.data.some(item => item.price?.id === founderPriceId);
    
    console.log('[SUCCESS-PAGE-SERVER] 🔍 ¿Es Founder Pass?', {
      isFounderPass,
      founderPriceId,
      foundPriceIds: lineItems.data.map(item => item.price?.id)
    });
    
    if (!isFounderPass) {
      console.log('[SUCCESS-PAGE-SERVER] ⚠️ No es Founder Pass - Price IDs no coinciden');
      return { success: false, error: 'Not a Founder Pass purchase' };
    }
    
    // 4. Actualizar Supabase
    console.log('[SUCCESS-PAGE-SERVER] 🔄 Actualizando Supabase...');
    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();
    
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        plan: 'founder',
        max_uses: null,
        founder_source: 'purchase'
      })
      .eq('email', userEmail)
      .select();
    
    if (updateError) {
      console.error('[SUCCESS-PAGE-SERVER] ❌ Error actualizando Supabase:', updateError);
      return { success: false, error: updateError.message };
    }
    
    if (!updateData || updateData.length === 0) {
      console.error('[SUCCESS-PAGE-SERVER] ❌❌❌ NO SE ACTUALIZÓ NINGÚN REGISTRO EN SUPABASE');
      console.error('[SUCCESS-PAGE-SERVER] Email usado:', userEmail);
      console.error('[SUCCESS-PAGE-SERVER] Datos de actualización:', {
        plan: 'founder',
        max_uses: null,
        founder_source: 'purchase'
      });
      return { success: false, error: 'No se encontró usuario para actualizar' };
    }
    
    console.log('[SUCCESS-PAGE-SERVER] ✅✅✅ Supabase actualizado EXITOSAMENTE:', {
      rowsAffected: updateData.length,
      plan: updateData[0]?.plan,
      max_uses: updateData[0]?.max_uses,
      founder_source: updateData[0]?.founder_source,
      email: updateData[0]?.email
    });
    
    // 🚨 MTRYX: Track payment event to MTRYX
    try {
      await trackPayment({
        email: userEmail,
        amount: (stripeSession.amount_total || 500) / 100, // Convertir de centavos a euros
        currency: stripeSession.currency?.toUpperCase() || 'EUR',
        plan: 'founder',
        stripeSessionId: stripeSession.id,
        stripeCustomerId: typeof stripeSession.customer === 'string' ? stripeSession.customer : undefined,
      });
    } catch (mtryxError) {
      // No fallar el procesamiento de pago si falla el tracking a MTRYX
      console.error('[SUCCESS-PAGE-SERVER] ❌ Error tracking payment to MTRYX:', mtryxError);
    }
    
    // 5. Registrar pago en telemetry
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                     process.env.NEXTAUTH_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://playlists.jeylabbb.com');
      
      await fetch(`${baseUrl}/api/telemetry/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          payload: {
            email: userEmail,
            stripePaymentIntentId: stripeSession.payment_intent || stripeSession.id,
            stripeCustomerId: stripeSession.customer || null,
            amount: stripeSession.amount_total || 500,
            plan: 'founder',
            status: 'completed'
          }
        })
      });
      console.log('[SUCCESS-PAGE-SERVER] ✅ Pago registrado en telemetry');
    } catch (telemetryError) {
      console.error('[SUCCESS-PAGE-SERVER] ⚠️ Error registrando pago:', telemetryError);
    }
    
    // 6. Actualizar KV
    try {
      const kv = await import('@vercel/kv');
      const profileKey = `jey_user_profile:${userEmail}`;
      const existingProfile = (await kv.kv.get(profileKey)) as Record<string, any> || {};
      await kv.kv.set(profileKey, {
        ...(existingProfile && typeof existingProfile === 'object' ? existingProfile : {}),
        email: userEmail,
        plan: 'founder',
        founderSince: now,
        updatedAt: now
      });
      console.log('[SUCCESS-PAGE-SERVER] ✅ KV actualizado');
    } catch (kvError) {
      console.error('[SUCCESS-PAGE-SERVER] ⚠️ Error actualizando KV:', kvError);
    }
    
    // 7. Enviar emails
    try {
      const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
      await sendFounderWelcomeEmail(userEmail, { origin: 'checkout_success_page_server' });
      console.log('[SUCCESS-PAGE-SERVER] ✅ Email de bienvenida enviado');
    } catch (emailError) {
      console.error('[SUCCESS-PAGE-SERVER] ⚠️ Error enviando email de bienvenida:', emailError);
    }
    
    try {
      const { sendConfirmationEmail } = await import('@/lib/resend');
      const planName = 'Founder Pass';
      const amount = ((stripeSession.amount_total || 500) / 100).toFixed(2);
      const date = new Date(stripeSession.created * 1000).toLocaleDateString('es-ES');
      await sendConfirmationEmail(userEmail, { planName, amount, date, sessionId: stripeSession.id });
      console.log('[SUCCESS-PAGE-SERVER] ✅ Email de confirmación enviado');
    } catch (emailError) {
      console.error('[SUCCESS-PAGE-SERVER] ⚠️ Error enviando email de confirmación:', emailError);
    }
    
    const elapsedTime = Date.now() - startTime;
    console.log('[SUCCESS-PAGE-SERVER] ===== PROCESAMIENTO COMPLETADO EN SERVIDOR =====');
    console.log('[SUCCESS-PAGE-SERVER] ⏱️ Tiempo:', `${elapsedTime}ms`);
    
    return { 
      success: true, 
      email: userEmail,
      sessionId: stripeSession.id
    };
    
  } catch (error: any) {
    console.error('[SUCCESS-PAGE-SERVER] ❌❌❌ ERROR:', {
      error: error,
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message || 'Unknown error' };
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;
  
  if (!sessionId) {
    console.error('[SUCCESS-PAGE-SERVER] ❌ No session_id in URL');
    redirect('/?error=no_session_id');
  }
  
  // 🚨 CRITICAL: Procesar pago EN EL SERVIDOR antes de renderizar
  console.log('[SUCCESS-PAGE-SERVER] ===== INICIANDO PROCESAMIENTO =====');
  console.log('[SUCCESS-PAGE-SERVER] Session ID recibido:', sessionId);
  let result;
  
  try {
    result = await processPaymentOnServer(sessionId);
    console.log('[SUCCESS-PAGE-SERVER] Resultado del procesamiento:', {
      success: result.success,
      error: result.error,
      email: result.email,
      sessionId: result.sessionId
    });
  } catch (error: any) {
    // Si es un NEXT_REDIRECT, re-lanzarlo (es una excepción especial de Next.js)
    if (error?.digest === 'NEXT_REDIRECT' || error?.message?.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('[SUCCESS-PAGE-SERVER] ❌❌❌ ERROR AL PROCESAR:', {
      error: error,
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    // En caso de error, mostrar la página de todas formas (puede que ya se procesó)
    result = { success: false, error: error.message || 'Unknown error' };
  }
  
  if (!result || !result.success) {
    const errorMsg = result?.error || 'Unknown error';
    console.error('[SUCCESS-PAGE-SERVER] ❌❌❌ PROCESAMIENTO FALLÓ:', {
      success: result?.success,
      error: errorMsg,
      errorType: typeof errorMsg,
      isFounderPassError: errorMsg === 'Not a Founder Pass purchase',
      isNoEmailError: errorMsg === 'No email found',
      isStripeError: errorMsg === 'Stripe session not found'
    });
    
    // Si el error es que no es Founder Pass o no hay email, mostrar página de éxito igual
    if (errorMsg === 'Not a Founder Pass purchase' || errorMsg === 'No email found') {
      console.log('[SUCCESS-PAGE-SERVER] ⚠️ Error no crítico, mostrando página de éxito de todas formas');
    } else {
      // Error crítico - log detallado
      console.error('[SUCCESS-PAGE-SERVER] ❌❌❌ ERROR CRÍTICO DETECTADO:', {
        error: errorMsg,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
      console.error('[SUCCESS-PAGE-SERVER] ⚠️ Mostrando página con advertencia (no redirigiendo para evitar NEXT_REDIRECT)');
    }
  }
  
  // Solo después de procesar, mostrar la página (incluso si hay error no crítico)
  if (result && result.success) {
    console.log('[SUCCESS-PAGE-SERVER] ✅ Procesamiento exitoso, renderizando página...');
  } else if (result) {
    console.log('[SUCCESS-PAGE-SERVER] ⚠️ Procesamiento con error no crítico, mostrando página:', result.error);
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0B0F14' }}
    >
      <div className="max-w-md mx-auto text-center px-4">
        <div 
          className="rounded-2xl shadow-2xl p-8"
          style={{ 
            backgroundColor: '#0F141B',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Success Icon */}
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(54, 226, 180, 0.1)' }}
          >
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: '#36E2B4' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 
            className="text-3xl font-bold mb-4"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            ¡Pago completado!
          </h1>
          
          <p 
            className="mb-6"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              opacity: 0.8
            }}
          >
            ✅ Pago completado. Tu cuenta se ha actualizado automáticamente.
          </p>
          
          {result && !result.success && (
            <div 
              className="rounded-lg p-4 mb-6"
              style={{ 
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)'
              }}
            >
              <p 
                className="text-sm font-semibold mb-2"
                style={{ 
                  color: '#FFC107',
                  fontFamily: 'Inter, sans-serif',
                  opacity: 0.9
                }}
              >
                ⚠️ Error en el procesamiento
              </p>
              <p 
                className="text-xs font-mono break-all mb-2"
                style={{ 
                  color: '#FFC107',
                  fontFamily: 'monospace',
                  opacity: 0.8
                }}
              >
                {result.error || 'Unknown error'}
              </p>
              <p 
                className="text-sm"
                style={{ 
                  color: '#FFC107',
                  fontFamily: 'Inter, sans-serif',
                  opacity: 0.9
                }}
              >
                {result.error === 'Not a Founder Pass purchase' 
                  ? 'Este pago no es un Founder Pass.' 
                  : result.error === 'No email found'
                  ? 'No se encontró email en la sesión.'
                  : result.error === 'Stripe session not found'
                  ? 'No se encontró la sesión de Stripe.'
                  : 'Tu pago fue exitoso, pero hubo un problema al procesarlo. Revisa los logs o contacta con soporte.'}
              </p>
            </div>
          )}

          {sessionId && (
            <div 
              className="rounded-lg p-4 mb-6"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <p 
                className="text-sm mb-1"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                ID de Sesión:
              </p>
              <p 
                className="text-xs font-mono break-all"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'monospace',
                  opacity: 0.8
                }}
              >
                {sessionId}
              </p>
              <p 
                className="text-sm mt-2"
                style={{ 
                  color: '#36E2B4',
                  fontFamily: 'Inter, sans-serif',
                  opacity: 0.8
                }}
              >
                ✅ Pago procesado correctamente
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/me?checkout=success"
              className="w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02] inline-block text-center"
              style={{
                backgroundColor: '#5B8CFF',
                color: '#0B0F14',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                border: 'none',
                textDecoration: 'none'
              }}
            >
              Ir a mi perfil
            </Link>
            
            <Link
              href="/?checkout=success"
              className="w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02] inline-block text-center"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#EAF2FF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textDecoration: 'none'
              }}
            >
              Volver al Inicio
            </Link>
          </div>

          {/* Additional Info */}
          <div 
            className="mt-8 pt-6"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <p 
              className="text-sm"
              style={{ 
                color: '#EAF2FF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                opacity: 0.7
              }}
            >
              Recibirás un email de confirmación en breve. ¡Bienvenido al grupo FOUNDERS!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

