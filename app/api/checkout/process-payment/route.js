import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

/**
 * 🚨 CRITICAL: Este endpoint procesa el pago desde el session_id de Stripe
 * PRIORIDAD: Usa el email del usuario autenticado (si existe), sino usa el email de Stripe
 * Se llama desde la página de success cuando el usuario completa el pago
 */
export async function POST(request) {
  const startTime = Date.now();
  console.log('[PROCESS-PAYMENT] ===== INICIO PROCESAMIENTO DE PAGO =====');
  console.log('[PROCESS-PAYMENT] Timestamp:', new Date().toISOString());
  
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      console.error('[PROCESS-PAYMENT] ❌ ERROR: Session ID is required');
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log('[PROCESS-PAYMENT] 📋 Session ID recibido:', sessionId);
    console.log('[PROCESS-PAYMENT] 🔍 Verificando sesión en Stripe...');

    // Get session details from Stripe
    console.log('[PROCESS-PAYMENT] 🔄 Llamando a Stripe API para obtener sesión...');
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!stripeSession) {
      console.error('[PROCESS-PAYMENT] ❌ ERROR: Stripe session not found');
      return NextResponse.json({ error: 'Stripe session not found' }, { status: 404 });
    }
    
    console.log('[PROCESS-PAYMENT] ✅ Sesión de Stripe obtenida:', {
      id: stripeSession.id,
      status: stripeSession.status,
      payment_status: stripeSession.payment_status,
      customer_email: stripeSession.customer_email,
      customer_details_email: stripeSession.customer_details?.email,
      amount_total: stripeSession.amount_total,
      currency: stripeSession.currency
    });

    // 🚨 CRITICAL: PRIORIDAD 1 - Intentar obtener el usuario autenticado
    console.log('[PROCESS-PAYMENT] 🔐 Intentando obtener sesión de usuario autenticado...');
    let userEmail = null;
    let isAuthenticatedUser = false;
    
    try {
      const session = await getServerSession(authOptions);
      console.log('[PROCESS-PAYMENT] 🔐 Resultado de getServerSession:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasEmail: !!session?.user?.email,
        email: session?.user?.email
      });
      
      if (session?.user?.email) {
        userEmail = session.user.email.toLowerCase();
        isAuthenticatedUser = true;
        console.log('[PROCESS-PAYMENT] ✅ USUARIO AUTENTICADO ENCONTRADO - Usando email del usuario:', userEmail);
      } else {
        console.log('[PROCESS-PAYMENT] ⚠️ No hay usuario autenticado en la sesión');
      }
    } catch (authError) {
      console.error('[PROCESS-PAYMENT] ❌ Error al obtener sesión de usuario:', authError);
      console.log('[PROCESS-PAYMENT] ⚠️ Continuando sin sesión de usuario, usaremos email de Stripe');
    }
    
    // 🚨 CRITICAL: PRIORIDAD 2 - Si no hay usuario autenticado, usar email de Stripe como fallback
    if (!userEmail) {
      const stripeEmail = stripeSession.customer_details?.email || stripeSession.customer_email;
      console.log('[PROCESS-PAYMENT] 📧 Email de Stripe disponible:', stripeEmail);
      
      if (stripeEmail) {
        userEmail = stripeEmail.toLowerCase();
        console.log('[PROCESS-PAYMENT] ⚠️ USANDO EMAIL DE STRIPE (no hay usuario autenticado):', userEmail);
      } else {
        console.error('[PROCESS-PAYMENT] ❌ ERROR: No hay email disponible ni de usuario autenticado ni de Stripe');
        return NextResponse.json({ 
          error: 'No email found in Stripe session and user not authenticated' 
        }, { status: 400 });
      }
    }

    const normalizedEmail = userEmail;
    console.log('[PROCESS-PAYMENT] 📧 EMAIL FINAL SELECCIONADO:', {
      email: normalizedEmail,
      source: isAuthenticatedUser ? 'authenticated_user' : 'stripe',
      stripeEmail: stripeSession.customer_details?.email || stripeSession.customer_email
    });

    console.log('[PROCESS-PAYMENT] Payment details:', {
      id: stripeSession.id,
      email: normalizedEmail,
      isAuthenticatedUser: isAuthenticatedUser,
      stripeEmail: stripeSession.customer_details?.email || stripeSession.customer_email,
      amount_total: stripeSession.amount_total,
      payment_status: stripeSession.payment_status
    });

    // Get line items to check if it's a Founder Pass
    console.log('[PROCESS-PAYMENT] 🛒 Obteniendo line items de Stripe...');
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    console.log('[PROCESS-PAYMENT] 🛒 Line items obtenidos:', {
      count: lineItems.data.length,
      items: lineItems.data.map(item => ({
        price_id: item.price?.id,
        description: item.description,
        amount: item.amount_total
      }))
    });
    
    const founderPriceId = process.env.STRIPE_PRICE_FOUNDER;
    console.log('[PROCESS-PAYMENT] 🔑 Founder Price ID configurado:', founderPriceId);
    
    const isFounderPass = lineItems.data.some(item => 
      item.price?.id === founderPriceId
    );

    console.log('[PROCESS-PAYMENT] 🎯 ¿Es Founder Pass?', {
      isFounderPass,
      founderPriceId,
      foundPriceIds: lineItems.data.map(item => item.price?.id)
    });

    if (isFounderPass) {
      // 🚨 CRITICAL: Actualizar Supabase directamente usando el email de Stripe
      const now = new Date().toISOString();
      
      try {
        // 🚨 CRITICAL: Actualizar plan en Supabase primero
        const { getSupabaseAdmin } = await import('@/lib/supabase/server');
        const supabaseAdmin = getSupabaseAdmin();
        
        // Verificar plan actual antes de actualizar
        console.log('[PROCESS-PAYMENT] 🔍 Verificando plan actual en Supabase para:', normalizedEmail);
        const { data: beforeUpdate, error: beforeError } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, max_uses, founder_source')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (beforeError) {
          console.error('[PROCESS-PAYMENT] ❌ Error al verificar plan actual:', beforeError);
        }
        
        console.log('[PROCESS-PAYMENT] 📊 ESTADO ANTES DE ACTUALIZAR:', {
          email: normalizedEmail,
          userFound: !!beforeUpdate,
          userId: beforeUpdate?.id,
          planBefore: beforeUpdate?.plan || 'N/A',
          maxUsesBefore: beforeUpdate?.max_uses ?? 'N/A',
          founderSourceBefore: beforeUpdate?.founder_source || 'N/A',
          needsUpdate: beforeUpdate?.plan !== 'founder'
        });
        
        // 🚨 CRITICAL: Actualizar plan en Supabase con founder_source = 'purchase'
        console.log('[PROCESS-PAYMENT] 🔄 ACTUALIZANDO SUPABASE...');
        console.log('[PROCESS-PAYMENT] 📝 Datos a actualizar:', {
          email: normalizedEmail,
          plan: 'founder',
          max_uses: null,
          updated_at: now,
          founder_source: 'purchase'
        });
        
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            plan: 'founder',
            max_uses: null, // Unlimited
            updated_at: now,
            founder_source: 'purchase' // 'purchase' o 'referral'
          })
          .eq('email', normalizedEmail)
          .select();
        
        if (updateError) {
          console.error('[PROCESS-PAYMENT] ❌ ERROR AL ACTUALIZAR SUPABASE:', {
            error: updateError,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
          throw updateError;
        }
        
        console.log('[PROCESS-PAYMENT] ✅ UPDATE EJECUTADO EN SUPABASE:', {
          rowsAffected: updateData?.length || 0,
          updatedRows: updateData
        });
        
        // Verificar que se actualizó correctamente
        console.log('[PROCESS-PAYMENT] ⏳ Esperando 200ms para que Supabase procese la actualización...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('[PROCESS-PAYMENT] 🔍 VERIFICANDO ACTUALIZACIÓN EN SUPABASE...');
        const { data: afterUpdate, error: afterError } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, max_uses, founder_source')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (afterError) {
          console.error('[PROCESS-PAYMENT] ❌ Error al verificar actualización:', afterError);
        }
        
        console.log('[PROCESS-PAYMENT] 📊 ESTADO DESPUÉS DE ACTUALIZAR:', {
          email: normalizedEmail,
          userFound: !!afterUpdate,
          plan: afterUpdate?.plan || 'N/A',
          maxUses: afterUpdate?.max_uses ?? 'N/A',
          founderSource: afterUpdate?.founder_source || 'N/A',
          isValid: afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null
        });
        
        if (afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null) {
          console.log('[PROCESS-PAYMENT] ✅✅✅ PLAN ACTUALIZADO CORRECTAMENTE A FOUNDER:', {
            email: normalizedEmail,
            plan: afterUpdate.plan,
            max_uses: afterUpdate.max_uses,
            founder_source: afterUpdate.founder_source || 'purchase'
          });
          
          // 🚨 CRITICAL: Registrar pago en Supabase
          console.log('[PROCESS-PAYMENT] 💰 Registrando pago en Supabase vía telemetry...');
          try {
            function getBaseUrl() {
              const url = process.env.NEXT_PUBLIC_SITE_URL ||
                process.env.NEXTAUTH_URL ||
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://playlists.jeylabbb.com');
              console.log('[PROCESS-PAYMENT] 🌐 Base URL para telemetry:', url);
              return url;
            }
            
            const baseUrl = getBaseUrl();
            const paymentPayload = {
              email: normalizedEmail,
              stripePaymentIntentId: stripeSession.payment_intent || stripeSession.id,
              stripeCustomerId: stripeSession.customer || null,
              amount: stripeSession.amount_total || 500,
              plan: 'founder',
              status: 'completed'
            };
            
            console.log('[PROCESS-PAYMENT] 💰 Payload para registrar pago:', paymentPayload);
            console.log('[PROCESS-PAYMENT] 🔄 Llamando a:', `${baseUrl}/api/telemetry/ingest`);
            
            const logResponse = await fetch(`${baseUrl}/api/telemetry/ingest`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'payment',
                payload: {
                  email: normalizedEmail,
                  stripePaymentIntentId: stripeSession.payment_intent || stripeSession.id,
                  stripeCustomerId: stripeSession.customer || null,
                  amount: stripeSession.amount_total || 500,
                  plan: 'founder',
                  status: 'completed'
                }
              })
            });
            
            if (logResponse.ok) {
              const logResult = await logResponse.json();
              console.log('[PROCESS-PAYMENT] ✅✅✅ PAGO REGISTRADO EN SUPABASE:', logResult);
            } else {
              const errorText = await logResponse.text();
              console.error('[PROCESS-PAYMENT] ⚠️ FALLO AL REGISTRAR PAGO:', {
                status: logResponse.status,
                statusText: logResponse.statusText,
                error: errorText
              });
            }
          } catch (logError) {
            console.error('[PROCESS-PAYMENT] ❌ ERROR AL REGISTRAR PAGO:', {
              error: logError,
              message: logError.message,
              stack: logError.stack
            });
          }
          
          // 🚨 CRITICAL: Actualizar KV DESPUÉS de Supabase (KV es solo caché)
          console.log('[PROCESS-PAYMENT] 💾 Actualizando KV (caché)...');
          try {
            const kv = await import('@vercel/kv');
            const profileKey = `jey_user_profile:${normalizedEmail}`;
            console.log('[PROCESS-PAYMENT] 💾 Profile key:', profileKey);
            
            const existingProfile = await kv.kv.get(profileKey) || {};
            console.log('[PROCESS-PAYMENT] 💾 Profile existente:', existingProfile);
            
            const updatedProfile = {
              ...existingProfile,
              email: normalizedEmail,
              plan: 'founder',
              founderSince: now,
              updatedAt: now
            };
            
            await kv.kv.set(profileKey, updatedProfile);
            console.log('[PROCESS-PAYMENT] ✅✅✅ KV ACTUALIZADO:', updatedProfile);
          } catch (kvError) {
            console.error('[PROCESS-PAYMENT] ❌ ERROR AL ACTUALIZAR KV:', kvError);
            // No fallar si KV falla, es solo caché
          }
          
          // 🚨 CRITICAL: SOLO ENVIAR EMAIL DESPUÉS de verificar que Supabase se actualizó correctamente
          // Solo enviar si el plan cambió de free a founder
          const shouldSendWelcomeEmail = beforeUpdate?.plan !== 'founder';
          console.log('[PROCESS-PAYMENT] 📧 ¿Enviar email de bienvenida?', {
            shouldSend: shouldSendWelcomeEmail,
            planBefore: beforeUpdate?.plan
          });
          
          if (shouldSendWelcomeEmail) {
            console.log('[PROCESS-PAYMENT] 📧 Enviando email de bienvenida a founder...');
            try {
              const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
              console.log('[PROCESS-PAYMENT] 📧 Función sendFounderWelcomeEmail importada');
              
              const emailSent = await sendFounderWelcomeEmail(normalizedEmail, {
                origin: 'checkout_success_page'
              });
              
              if (emailSent) {
                console.log('[PROCESS-PAYMENT] ✅✅✅ EMAIL DE BIENVENIDA ENVIADO A:', normalizedEmail);
              } else {
                console.warn('[PROCESS-PAYMENT] ⚠️ FALLO AL ENVIAR EMAIL DE BIENVENIDA A:', normalizedEmail);
              }
            } catch (emailError) {
              console.error('[PROCESS-PAYMENT] ❌ ERROR AL ENVIAR EMAIL DE BIENVENIDA:', {
                error: emailError,
                message: emailError.message,
                stack: emailError.stack
              });
            }
          } else {
            console.log('[PROCESS-PAYMENT] ⏭️ Saltando email de bienvenida (usuario ya era founder)');
          }
          
          // También enviar email de confirmación de pago
          console.log('[PROCESS-PAYMENT] 📧 Enviando email de confirmación de pago...');
          try {
            const { sendConfirmationEmail } = await import('../../../../lib/resend');
            console.log('[PROCESS-PAYMENT] 📧 Función sendConfirmationEmail importada');
            
            const planName = 'Founder Pass';
            const amount = (stripeSession.amount_total / 100).toFixed(2);
            const date = new Date(stripeSession.created * 1000).toLocaleDateString('es-ES');
            
            console.log('[PROCESS-PAYMENT] 📧 Datos del email de confirmación:', {
              to: normalizedEmail,
              planName,
              amount,
              date,
              sessionId: stripeSession.id
            });
            
            const emailSent = await sendConfirmationEmail(normalizedEmail, {
              planName,
              amount,
              date,
              sessionId: stripeSession.id
            });
            
            if (emailSent) {
              console.log('[PROCESS-PAYMENT] ✅✅✅ EMAIL DE CONFIRMACIÓN ENVIADO A:', normalizedEmail);
            } else {
              console.warn('[PROCESS-PAYMENT] ⚠️ FALLO AL ENVIAR EMAIL DE CONFIRMACIÓN A:', normalizedEmail);
            }
          } catch (emailError) {
            console.error('[PROCESS-PAYMENT] ❌ ERROR AL ENVIAR EMAIL DE CONFIRMACIÓN:', {
              error: emailError,
              message: emailError.message,
              stack: emailError.stack
            });
          }
          
          const elapsedTime = Date.now() - startTime;
          console.log('[PROCESS-PAYMENT] ===== PROCESAMIENTO COMPLETADO EXITOSAMENTE =====');
          console.log('[PROCESS-PAYMENT] ⏱️ Tiempo total:', `${elapsedTime}ms`);
          console.log('[PROCESS-PAYMENT] ✅ RESULTADO FINAL:', {
            success: true,
            email: normalizedEmail,
            plan: afterUpdate.plan,
            max_uses: afterUpdate.max_uses,
            founder_source: afterUpdate.founder_source
          });
          
          return NextResponse.json({ 
            success: true, 
            message: 'Payment processed and account updated',
            isFounder: true,
            email: normalizedEmail,
            profile: afterUpdate
          });
        } else {
          console.error('[PROCESS-PAYMENT] ❌❌❌ ERROR CRÍTICO: Plan no se actualizó correctamente!', {
            plan: afterUpdate?.plan,
            max_uses: afterUpdate?.max_uses,
            expectedPlan: 'founder',
            expectedMaxUses: null
          });
          throw new Error('Plan update verification failed');
        }
      } catch (error) {
        const elapsedTime = Date.now() - startTime;
        console.error('[PROCESS-PAYMENT] ❌❌❌ ERROR AL PROCESAR PAGO:', {
          error: error,
          message: error.message,
          stack: error.stack,
          elapsedTime: `${elapsedTime}ms`
        });
        return NextResponse.json({ 
          error: 'Failed to process payment', 
          details: error.message 
        }, { status: 500 });
      }
    }

    console.log('[PROCESS-PAYMENT] ⚠️ No es un Founder Pass purchase');
    return NextResponse.json({ 
      success: false, 
      message: 'Not a Founder Pass purchase',
      email: normalizedEmail,
      isFounderPass
    });

  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error('[PROCESS-PAYMENT] ❌❌❌ ERROR GENERAL:', {
      error: error,
      message: error.message,
      stack: error.stack,
      elapsedTime: `${elapsedTime}ms`
    });
    return NextResponse.json({ 
      error: 'Failed to process payment', 
      details: error.message 
    }, { status: 500 });
  }
}

