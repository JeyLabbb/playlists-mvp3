import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { CHECKOUT_ENABLED } from '../../../../lib/flags';
import { sendConfirmationEmail } from '../../../../lib/resend';

// Helper to get base URL for internal API calls
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://playlists.jeylabbb.com');
}

// Helper to log payments to Supabase via telemetry API
async function logPayment(userEmail, stripePaymentIntentId, stripeCustomerId, amount, plan, status = 'completed') {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'payment',
        payload: {
          email: userEmail,
          stripePaymentIntentId: stripePaymentIntentId,
          stripeCustomerId: stripeCustomerId,
          amount: amount,
          plan: plan,
          status: status
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PAYMENT] Error logging payment:', errorText);
      return { ok: false, error: errorText };
    } else {
      const result = await response.json();
      console.log(`[PAYMENT] logged payment for ${userEmail}`, result);
      return result;
    }
  } catch (error) {
    console.error('[PAYMENT] Error in logPayment:', error);
    return { ok: false, error: error.message };
  }
}

export const config = { api: { bodyParser: false } }; // si hiciera falta, en app router usa buffer

export async function POST(req) {
  const startTime = Date.now();
  console.log('[STRIPE WEBHOOK] ===== WEBHOOK RECIBIDO =====');
  console.log('[STRIPE WEBHOOK] Timestamp:', new Date().toISOString());
  
  if (!CHECKOUT_ENABLED) {
    console.log('[STRIPE WEBHOOK] ❌ Checkout disabled');
    return NextResponse.json({}, { status: 403 });
  }

  console.log('[STRIPE WEBHOOK] ✅ Checkout enabled, procesando webhook...');
  const sig = req.headers.get('stripe-signature');
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  console.log('[STRIPE WEBHOOK] 🔐 Verificando firma de webhook...');
  console.log('[STRIPE WEBHOOK] 🔐 Webhook secret configurado:', !!whsec);
  
  const buf = Buffer.from(await req.arrayBuffer());

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, whsec);
    console.log('[STRIPE WEBHOOK] ✅ Firma verificada correctamente');
    console.log('[STRIPE WEBHOOK] 📋 Tipo de evento:', event.type);
    console.log('[STRIPE WEBHOOK] 📋 ID del evento:', event.id);
  } catch (err) {
    console.error('[STRIPE WEBHOOK] ❌❌❌ ERROR: Firma de webhook inválida:', {
      error: err.message,
      hasSignature: !!sig,
      hasSecret: !!whsec
    });
    return new Response('Invalid signature', { status: 400 });
  }

  // Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    console.log('[STRIPE WEBHOOK] 🎯 Procesando evento: checkout.session.completed');
    const session = event.data.object;
    
    // 🚨 CRITICAL: Obtener email del usuario autenticado desde metadata (prioridad) o Stripe (fallback)
    const authenticatedUserEmail = session.metadata?.user_email?.toLowerCase();
    const stripeEmail = session.customer_details?.email?.toLowerCase() || session.customer_email?.toLowerCase();
    const userEmail = authenticatedUserEmail || stripeEmail;
    
    console.log('[STRIPE WEBHOOK] 📋 Detalles de la sesión:', {
      id: session.id,
      authenticatedUserEmail: authenticatedUserEmail || 'N/A',
      stripeEmail: stripeEmail || 'N/A',
      userEmail: userEmail || 'N/A',
      metadata: session.metadata,
      customer_email: session.customer_email,
      customer_details_email: session.customer_details?.email,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency
    });
    
    if (!userEmail) {
      console.error('[STRIPE WEBHOOK] ❌❌❌ NO HAY EMAIL DISPONIBLE (ni metadata ni Stripe)');
    } else if (authenticatedUserEmail) {
      console.log('[STRIPE WEBHOOK] ✅✅✅ Usando email del usuario autenticado (metadata):', authenticatedUserEmail);
    } else {
      console.log('[STRIPE WEBHOOK] ⚠️ Usando email de Stripe (fallback):', stripeEmail);
    }

    // Get line items once for both Founder marking and email
    console.log('[STRIPE WEBHOOK] 🛒 Obteniendo line items de Stripe...');
    let lineItems = null;
    let isFounderPass = false;
    let isMonthly = false;
    
    try {
      lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      console.log('[STRIPE WEBHOOK] 🛒 Line items obtenidos:', {
        count: lineItems.data.length,
        items: lineItems.data.map(item => ({
          price_id: item.price?.id,
          description: item.description,
          amount: item.amount_total
        }))
      });
      
      const founderPriceId = process.env.STRIPE_PRICE_FOUNDER;
      const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY;
      
      isFounderPass = lineItems.data.some(item => 
        item.price?.id === founderPriceId
      );
      isMonthly = lineItems.data.some(item => 
        item.price?.id === monthlyPriceId
      );
      
      console.log('[STRIPE WEBHOOK] 🎯 Verificación de plan:', {
        isFounderPass,
        isMonthly,
        founderPriceId,
        monthlyPriceId,
        foundPriceIds: lineItems.data.map(item => item.price?.id)
      });
    } catch (error) {
      console.error('[STRIPE WEBHOOK] ❌ Error al obtener line items:', {
        error: error.message,
        stack: error.stack
      });
    }

    // 🚨 CRITICAL: Log detallado antes de verificar Founder Pass
    console.log('[STRIPE WEBHOOK] 🔍🔍🔍 VERIFICACIÓN FINAL ANTES DE ACTUALIZAR:', {
      isFounderPass,
      userEmail: userEmail || 'NO EMAIL',
      hasUserEmail: !!userEmail,
      willUpdate: isFounderPass && userEmail,
      lineItemsCount: lineItems?.data?.length || 0,
      founderPriceId: process.env.STRIPE_PRICE_FOUNDER,
      foundPriceIds: lineItems?.data?.map(item => item.price?.id) || []
    });

    // Check if this is a Founder Pass and mark user accordingly
    if (isFounderPass && userEmail) {
      console.log('[STRIPE WEBHOOK] ✅✅✅ ES FOUNDER PASS - Iniciando actualización...');
      console.log('[STRIPE WEBHOOK] 📧 Email a usar para actualización:', userEmail);
      const now = new Date().toISOString();
      
      console.log('[STRIPE WEBHOOK] 📧 Email del usuario:', userEmail);
      console.log('[STRIPE WEBHOOK] ⏰ Timestamp:', now);
      
      try {
        // 🚨 CRITICAL: Actualizar plan en Supabase primero
        console.log('[STRIPE WEBHOOK] 🔄 Obteniendo cliente de Supabase Admin...');
        const { getSupabaseAdmin } = await import('@/lib/supabase/server');
        const supabaseAdmin = getSupabaseAdmin();
        console.log('[STRIPE WEBHOOK] ✅ Cliente de Supabase Admin obtenido');
        
        // Verificar plan actual antes de actualizar
        console.log('[STRIPE WEBHOOK] 🔍 Verificando plan actual en Supabase para:', userEmail);
        const { data: beforeUpdate, error: beforeError } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, max_uses, founder_source')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (beforeError) {
          console.error('[STRIPE WEBHOOK] ❌ Error al verificar plan actual:', beforeError);
        }
        
        console.log('[STRIPE WEBHOOK] 📊 ESTADO ANTES DE ACTUALIZAR:', {
          email: userEmail,
          userFound: !!beforeUpdate,
          userId: beforeUpdate?.id,
          planBefore: beforeUpdate?.plan || 'N/A',
          maxUsesBefore: beforeUpdate?.max_uses ?? 'N/A',
          founderSourceBefore: beforeUpdate?.founder_source || 'N/A',
          needsUpdate: beforeUpdate?.plan !== 'founder'
        });
        
        // 🚨 CRITICAL: Actualizar plan en Supabase con founder_source = 'purchase'
        console.log('[STRIPE WEBHOOK] 🔄 ACTUALIZANDO SUPABASE...');
        console.log('[STRIPE WEBHOOK] 📝 Datos a actualizar:', {
          email: userEmail,
          plan: 'founder',
          max_uses: null,
          founder_source: 'purchase'
        });
        
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            plan: 'founder',
            max_uses: null, // Unlimited
            // 🚨 NEW: Marcar que el founder se obtuvo mediante compra
            founder_source: 'purchase' // 'purchase' o 'referral'
          })
          .eq('email', userEmail)
          .select();
        
        if (updateError) {
          console.error('[STRIPE WEBHOOK] ❌❌❌ ERROR AL ACTUALIZAR SUPABASE:', {
            error: updateError,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
        } else {
          console.log('[STRIPE WEBHOOK] ✅ UPDATE EJECUTADO EN SUPABASE:', {
            rowsAffected: updateData?.length || 0,
            updatedRows: updateData
          });
          // Verificar que se actualizó correctamente
          console.log('[STRIPE WEBHOOK] ⏳ Esperando 200ms para que Supabase procese la actualización...');
          await new Promise(resolve => setTimeout(resolve, 200));
          
          console.log('[STRIPE WEBHOOK] 🔍 VERIFICANDO ACTUALIZACIÓN EN SUPABASE...');
          const { data: afterUpdate, error: afterError } = await supabaseAdmin
            .from('users')
            .select('id, email, plan, max_uses, founder_source')
            .eq('email', userEmail)
            .maybeSingle();
          
          if (afterError) {
            console.error('[STRIPE WEBHOOK] ❌ Error al verificar actualización:', afterError);
          }
          
          console.log('[STRIPE WEBHOOK] 📊 ESTADO DESPUÉS DE ACTUALIZAR:', {
            email: userEmail,
            userFound: !!afterUpdate,
            plan: afterUpdate?.plan || 'N/A',
            maxUses: afterUpdate?.max_uses ?? 'N/A',
            founderSource: afterUpdate?.founder_source || 'N/A',
            isValid: afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null
          });
          
          if (afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null) {
            console.log('[STRIPE WEBHOOK] ✅✅✅ PLAN ACTUALIZADO CORRECTAMENTE A FOUNDER:', {
              email: userEmail,
              plan: afterUpdate.plan,
              max_uses: afterUpdate.max_uses,
              founder_source: afterUpdate.founder_source || 'purchase'
            });
            
            // 🚨 CRITICAL: Registrar pago en Supabase DESPUÉS de actualizar el plan
            try {
              const baseUrl = getBaseUrl();
              const logResponse = await fetch(`${baseUrl}/api/telemetry/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'payment',
                  payload: {
                    email: userEmail,
                    stripePaymentIntentId: session.payment_intent || session.id,
                    stripeCustomerId: session.customer || null,
                    amount: session.amount_total || 500, // 5€ en centavos
                    plan: 'founder',
                    status: 'completed'
                  }
                })
              });
              
              if (logResponse.ok) {
                const logResult = await logResponse.json();
                console.log('[STRIPE WEBHOOK] ✅✅✅ PAGO REGISTRADO EN SUPABASE:', logResult);
              } else {
                const errorText = await logResponse.text();
                console.error('[STRIPE WEBHOOK] ⚠️ FALLO AL REGISTRAR PAGO:', {
                  status: logResponse.status,
                  statusText: logResponse.statusText,
                  error: errorText
                });
              }
            } catch (logError) {
              console.error('[STRIPE WEBHOOK] ❌ ERROR AL REGISTRAR PAGO:', {
                error: logError,
                message: logError.message,
                stack: logError.stack
              });
            }
            
            // 🚨 CRITICAL: Actualizar KV DESPUÉS de Supabase (KV es solo caché, Supabase es la fuente de verdad)
            console.log('[STRIPE WEBHOOK] 💾 Actualizando KV (caché)...');
            try {
              const kv = await import('@vercel/kv');
              const profileKey = `jey_user_profile:${userEmail}`;
              console.log('[STRIPE WEBHOOK] 💾 Profile key:', profileKey);
              
              const existingProfile = await kv.kv.get(profileKey) || {};
              console.log('[STRIPE WEBHOOK] 💾 Profile existente:', existingProfile);
              
              const updatedProfile = {
                ...existingProfile,
                email: userEmail,
                plan: 'founder',
                founderSince: now,
                updatedAt: now
              };
              
              await kv.kv.set(profileKey, updatedProfile);
              console.log('[STRIPE WEBHOOK] ✅✅✅ KV ACTUALIZADO:', updatedProfile);
            } catch (kvError) {
              console.error('[STRIPE WEBHOOK] ❌ ERROR AL ACTUALIZAR KV:', kvError);
              // No fallar si KV falla, es solo caché
            }
            
            // 🚨 CRITICAL: SOLO ENVIAR EMAIL DESPUÉS de verificar que Supabase se actualizó correctamente
            // Solo enviar si el plan cambió de free a founder
            const shouldSendWelcomeEmail = beforeUpdate?.plan !== 'founder';
            console.log('[STRIPE WEBHOOK] 📧 ¿Enviar email de bienvenida?', {
              shouldSend: shouldSendWelcomeEmail,
              planBefore: beforeUpdate?.plan
            });
            
            if (shouldSendWelcomeEmail) {
              console.log('[STRIPE WEBHOOK] 📧 Enviando email de bienvenida a founder...');
              try {
                const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
                console.log('[STRIPE WEBHOOK] 📧 Función sendFounderWelcomeEmail importada');
                
                const emailSent = await sendFounderWelcomeEmail(userEmail, {
                  origin: 'stripe_webhook'
                });
                
                if (emailSent) {
                  console.log('[STRIPE WEBHOOK] ✅✅✅ EMAIL DE BIENVENIDA ENVIADO A:', userEmail);
                } else {
                  console.warn('[STRIPE WEBHOOK] ⚠️ FALLO AL ENVIAR EMAIL DE BIENVENIDA A:', userEmail);
                }
              } catch (emailError) {
                console.error('[STRIPE WEBHOOK] ❌ ERROR AL ENVIAR EMAIL DE BIENVENIDA:', {
                  error: emailError,
                  message: emailError.message,
                  stack: emailError.stack
                });
                // No fallar el proceso si falla el email
              }
            } else {
              console.log('[STRIPE WEBHOOK] ⏭️ Saltando email de bienvenida (usuario ya era founder)');
            }
          } else {
            console.error('[STRIPE] ❌ Plan not updated correctly in Supabase! Still:', {
              plan: afterUpdate?.plan,
              max_uses: afterUpdate?.max_uses
            });
          }
        }
        
      } catch (error) {
        console.error('[STRIPE] ❌ Error marking user as Founder:', error);
      }
    }

    // 🚨 CRITICAL: Si no se actualizó el plan, log el motivo
    if (!isFounderPass) {
      console.log('[STRIPE WEBHOOK] ⚠️⚠️⚠️ NO ES FOUNDER PASS - No se actualizará el plan:', {
        isFounderPass,
        founderPriceId: process.env.STRIPE_PRICE_FOUNDER,
        foundPriceIds: lineItems?.data?.map(item => item.price?.id) || [],
        lineItemsCount: lineItems?.data?.length || 0
      });
    }
    if (!userEmail) {
      console.error('[STRIPE WEBHOOK] ❌❌❌ NO HAY EMAIL - No se actualizará el plan ni se enviará email');
    }

    // Send confirmation email
    if (userEmail) {
      console.log('[STRIPE WEBHOOK] 📧 Enviando email de confirmación de pago...');
      try {
        const planName = isFounderPass ? 'Founder Pass' : isMonthly ? 'PLEIA Monthly' : 'Plan';
        const amount = (session.amount_total / 100).toFixed(2);
        const date = new Date(session.created * 1000).toLocaleDateString('es-ES');
        
        console.log('[STRIPE WEBHOOK] 📧 Datos del email de confirmación:', {
          to: userEmail,
          planName,
          amount,
          date,
          sessionId: session.id,
          isAuthenticatedUserEmail: !!authenticatedUserEmail
        });
        
        const emailSent = await sendConfirmationEmail(userEmail, {
          planName,
          amount,
          date,
          sessionId: session.id
        });
        
        if (emailSent) {
          console.log('[STRIPE WEBHOOK] ✅✅✅ EMAIL DE CONFIRMACIÓN ENVIADO A:', userEmail);
          // 🚨 NOTE: El pago ya se registró en Supabase después de actualizar el plan (ver código anterior)
        } else {
          console.error('[STRIPE WEBHOOK] ⚠️ FALLO AL ENVIAR EMAIL DE CONFIRMACIÓN A:', userEmail);
        }
      } catch (emailError) {
        console.error('[STRIPE WEBHOOK] ❌ ERROR AL ENVIAR EMAIL DE CONFIRMACIÓN:', {
          error: emailError,
          message: emailError.message,
          stack: emailError.stack
        });
      }
    } else {
      console.log('[STRIPE WEBHOOK] ⚠️ No hay email en customer_details, saltando email de confirmación');
    }
  }
  
  if (event.type === 'invoice.payment_succeeded') {
    console.log('[STRIPE WEBHOOK] 📋 Evento: invoice.payment_succeeded', event.data.object['id']);
  }

  const elapsedTime = Date.now() - startTime;
  console.log('[STRIPE WEBHOOK] ===== WEBHOOK PROCESADO =====');
  console.log('[STRIPE WEBHOOK] ⏱️ Tiempo total:', `${elapsedTime}ms`);
  
  return NextResponse.json({ received: true });
}
