import { NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/config';

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get the current user session (NextAuth/Spotify)
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    console.log('[ASSOCIATE-PURCHASE] Associating purchase with user:', session.user.email);
    console.log('[ASSOCIATE-PURCHASE] Session ID:', sessionId);

    // Get session details from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!stripeSession) {
      return NextResponse.json({ error: 'Stripe session not found' }, { status: 404 });
    }

    console.log('[ASSOCIATE-PURCHASE] Stripe session details:', {
      id: stripeSession.id,
      stripe_email: stripeSession.customer_details?.email,
      user_email: session.user.email,
      amount_total: stripeSession.amount_total,
      payment_status: stripeSession.payment_status
    });

    // Get line items to check if it's a Founder Pass
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const isFounderPass = lineItems.data.some(item => 
      item.price?.id === process.env.STRIPE_PRICE_FOUNDER
    );

    console.log('[ASSOCIATE-PURCHASE] Is Founder Pass:', isFounderPass);

    if (isFounderPass) {
      // 🚨 CRITICAL: Actualizar Supabase primero (igual que el webhook)
      const userEmail = session.user.email.toLowerCase();
      const now = new Date().toISOString();
      
      try {
        // 🚨 CRITICAL: Actualizar plan en Supabase primero
        const { getSupabaseAdmin } = await import('@/lib/supabase/server');
        const supabaseAdmin = getSupabaseAdmin();
        
        // Verificar plan actual antes de actualizar
        const { data: beforeUpdate } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, max_uses, founder_source')
          .eq('email', userEmail)
          .maybeSingle();
        
        console.log('[ASSOCIATE-PURCHASE] Plan BEFORE update:', {
          email: userEmail,
          planBefore: beforeUpdate?.plan,
          needsUpdate: beforeUpdate?.plan !== 'founder'
        });
        
        // 🚨 CRITICAL: Actualizar plan en Supabase con founder_source = 'purchase'
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            plan: 'founder',
            max_uses: null, // Unlimited
            updated_at: now,
            founder_source: 'purchase' // 'purchase' o 'referral'
          })
          .eq('email', userEmail);
        
        if (updateError) {
          console.error('[ASSOCIATE-PURCHASE] ❌ Error updating plan in Supabase:', updateError);
          throw updateError;
        }
        
        // Verificar que se actualizó correctamente
        await new Promise(resolve => setTimeout(resolve, 200));
        const { data: afterUpdate } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, max_uses, founder_source')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null) {
          console.log('[ASSOCIATE-PURCHASE] ✅ Plan updated to founder in Supabase (verified):', {
            email: userEmail,
            plan: afterUpdate.plan,
            max_uses: afterUpdate.max_uses,
            founder_source: afterUpdate.founder_source || 'purchase'
          });
          
          // 🚨 CRITICAL: Registrar pago en Supabase
          try {
            function getBaseUrl() {
              return process.env.NEXT_PUBLIC_SITE_URL ||
                process.env.NEXTAUTH_URL ||
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://playlists.jeylabbb.com');
            }
            
            const baseUrl = getBaseUrl();
            const logResponse = await fetch(`${baseUrl}/api/telemetry/ingest`, {
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
            
            if (logResponse.ok) {
              const logResult = await logResponse.json();
              console.log('[ASSOCIATE-PURCHASE] ✅ Payment logged to Supabase:', logResult);
            } else {
              console.error('[ASSOCIATE-PURCHASE] ⚠️ Failed to log payment to Supabase:', await logResponse.text());
            }
          } catch (logError) {
            console.error('[ASSOCIATE-PURCHASE] ❌ Error logging payment to Supabase:', logError);
          }
          
          // 🚨 CRITICAL: Actualizar KV DESPUÉS de Supabase (KV es solo caché)
          const kv = await import('@vercel/kv');
          const profileKey = `jey_user_profile:${userEmail}`;
          const existingProfile = await kv.kv.get(profileKey) || {};
          const updatedProfile = {
            ...existingProfile,
            email: userEmail,
            plan: 'founder',
            founderSince: now,
            updatedAt: now
          };
          await kv.kv.set(profileKey, updatedProfile);
          console.log('[ASSOCIATE-PURCHASE] ✅ KV updated after Supabase update');
          
          // 🚨 CRITICAL: SOLO ENVIAR EMAIL DESPUÉS de verificar que Supabase se actualizó correctamente
          // Solo enviar si el plan cambió de free a founder
          if (beforeUpdate?.plan !== 'founder') {
            try {
              const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
              const emailSent = await sendFounderWelcomeEmail(userEmail, {
                origin: 'associate_purchase'
              });
              
              if (emailSent) {
                console.log('[ASSOCIATE-PURCHASE] ✅ Founder welcome email sent to:', userEmail);
              } else {
                console.warn('[ASSOCIATE-PURCHASE] ⚠️ Failed to send founder welcome email to:', userEmail);
              }
            } catch (emailError) {
              console.error('[ASSOCIATE-PURCHASE] ❌ Error sending founder welcome email:', emailError);
            }
          }
          
          // También enviar email de confirmación de pago
          try {
            const { sendConfirmationEmail } = await import('../../../lib/resend');
            const planName = 'Founder Pass';
            const amount = (stripeSession.amount_total / 100).toFixed(2);
            const date = new Date(stripeSession.created * 1000).toLocaleDateString('es-ES');
            
            const emailSent = await sendConfirmationEmail(userEmail, {
              planName,
              amount,
              date,
              sessionId: stripeSession.id
            });
            
            if (emailSent) {
              console.log('[ASSOCIATE-PURCHASE] ✅ Confirmation email sent to:', userEmail);
            } else {
              console.warn('[ASSOCIATE-PURCHASE] ⚠️ Failed to send confirmation email to:', userEmail);
            }
          } catch (emailError) {
            console.error('[ASSOCIATE-PURCHASE] ❌ Error sending confirmation email:', emailError);
          }
          
          return NextResponse.json({ 
            success: true, 
            message: 'Purchase associated with user account',
            isFounder: true,
            email: userEmail,
            stripe_email: stripeSession.customer_details?.email,
            profile: afterUpdate
          });
        } else {
          console.error('[ASSOCIATE-PURCHASE] ❌ Plan not updated correctly in Supabase! Still:', {
            plan: afterUpdate?.plan,
            max_uses: afterUpdate?.max_uses
          });
          throw new Error('Plan update verification failed');
        }
      } catch (error) {
        console.error('[ASSOCIATE-PURCHASE] ❌ Error marking user as Founder:', error);
        return NextResponse.json({ error: 'Failed to mark user as founder', details: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Not a Founder Pass purchase',
      email: session.user.email,
      stripe_email: stripeSession.customer_details?.email,
      isFounderPass
    });

  } catch (error) {
    console.error('[ASSOCIATE-PURCHASE] Error:', error);
    return NextResponse.json({ error: 'Failed to associate purchase', details: error.message }, { status: 500 });
  }
}
