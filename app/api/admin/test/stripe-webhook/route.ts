import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUsageLimit } from '@/lib/billing/usageV2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 🧪 TEST ENDPOINT: Simula un webhook de Stripe para alacidpablo@gmail.com
 * 
 * Este endpoint:
 * 1. Crea el usuario en Supabase si no existe (con todo aceptado)
 * 2. Simula el webhook de Stripe como si hubiera comprado el Founder Pass
 * 3. Verifica que todo se actualice correctamente
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Supabase admin not configured' 
      }, { status: 500 });
    }

    const testEmail = 'alacidpablo@gmail.com';
    const normalizedEmail = testEmail.toLowerCase();
    const now = new Date().toISOString();

    console.log('[TEST-STRIPE] ===== STARTING STRIPE WEBHOOK TEST =====');
    console.log('[TEST-STRIPE] Email:', normalizedEmail);

    // PASO 1: Crear usuario en Supabase si no existe
    console.log('[TEST-STRIPE] Step 1: Checking if user exists...');
    
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, max_uses, marketing_opt_in, terms_accepted_at, username, founder_source')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[TEST-STRIPE] Error checking user:', checkError);
      return NextResponse.json({ 
        ok: false, 
        error: 'Error checking user', 
        details: checkError.message 
      }, { status: 500 });
    }

    let userId: string | null = null;

    if (existingUser) {
      console.log('[TEST-STRIPE] User exists:', {
        id: existingUser.id,
        plan: existingUser.plan,
        max_uses: existingUser.max_uses,
        marketing_opt_in: existingUser.marketing_opt_in,
        terms_accepted_at: existingUser.terms_accepted_at
      });
      userId = existingUser.id;

      // Actualizar usuario para asegurar que tiene todo aceptado
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          marketing_opt_in: true,
          terms_accepted_at: existingUser.terms_accepted_at || now
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[TEST-STRIPE] Error updating existing user:', updateError);
      } else {
        console.log('[TEST-STRIPE] ✅ Existing user updated with marketing_opt_in=true');
      }
    } else {
      console.log('[TEST-STRIPE] User does not exist, creating...');
      
      // Generar username
      const emailLocal = normalizedEmail.split('@')[0];
      const suffix = Math.random().toString(36).substring(2, 8);
      const username = `${emailLocal}-${suffix}`.substring(0, 30);

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email: normalizedEmail,
          username: username,
          plan: 'free',
          usage_count: 0,
          max_uses: getUsageLimit(),
          marketing_opt_in: true,
          terms_accepted_at: now,
          created_at: now
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[TEST-STRIPE] Error creating user:', createError);
        return NextResponse.json({ 
          ok: false, 
          error: 'Error creating user', 
          details: createError.message 
        }, { status: 500 });
      }

      userId = newUser.id;
      console.log('[TEST-STRIPE] ✅ User created:', { id: userId, username });
    }

    // PASO 2: Verificar estado ANTES del webhook
    console.log('[TEST-STRIPE] Step 2: Checking state BEFORE webhook...');
    
    const { data: beforeState } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, max_uses, founder_source')
      .eq('id', userId)
      .single();

    console.log('[TEST-STRIPE] State BEFORE webhook:', {
      plan: beforeState?.plan,
      max_uses: beforeState?.max_uses,
      founder_source: beforeState?.founder_source
    });

    // PASO 3: Simular webhook de Stripe (exactamente como lo haría Stripe)
    console.log('[TEST-STRIPE] Step 3: Simulating Stripe webhook...');

    // Simular el objeto session que Stripe enviaría
    const mockSession = {
      id: `cs_test_${Date.now()}`,
      customer_details: {
        email: normalizedEmail
      },
      customer: `cus_test_${Date.now()}`,
      payment_intent: `pi_test_${Date.now()}`,
      amount_total: 500, // 5€ en centavos
      currency: 'eur',
      created: Math.floor(Date.now() / 1000)
    };

    // Actualizar plan en Supabase (exactamente como lo hace el webhook real)
    const { error: updatePlanError } = await supabaseAdmin
      .from('users')
      .update({
        plan: 'founder',
        max_uses: null, // Unlimited
        founder_source: 'purchase' // 'purchase' o 'referral'
      })
      .eq('id', userId);

    if (updatePlanError) {
      console.error('[TEST-STRIPE] ❌ Error updating plan:', updatePlanError);
      return NextResponse.json({ 
        ok: false, 
        error: 'Error updating plan', 
        details: updatePlanError.message 
      }, { status: 500 });
    }

    console.log('[TEST-STRIPE] ✅ Plan updated in Supabase');

    // Esperar un poco para que Supabase procese
    await new Promise(resolve => setTimeout(resolve, 200));

    // PASO 4: Verificar estado DESPUÉS del webhook
    console.log('[TEST-STRIPE] Step 4: Verifying state AFTER webhook...');
    
    const { data: afterState, error: afterError } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, max_uses, founder_source, marketing_opt_in, terms_accepted_at')
      .eq('id', userId)
      .single();

    if (afterError) {
      console.error('[TEST-STRIPE] Error fetching after state:', afterError);
      return NextResponse.json({ 
        ok: false, 
        error: 'Error verifying state', 
        details: afterError.message 
      }, { status: 500 });
    }

    console.log('[TEST-STRIPE] State AFTER webhook:', {
      plan: afterState?.plan,
      max_uses: afterState?.max_uses,
      founder_source: afterState?.founder_source
    });

    // PASO 5: Enviar emails (exactamente como lo hace el webhook real)
    console.log('[TEST-STRIPE] Step 5: Sending emails...');
    
    let founderEmailSent = false;
    let confirmationEmailSent = false;

    // Solo enviar si el plan cambió de free a founder (como en el webhook real)
    if (beforeState?.plan !== 'founder') {
      try {
        const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
        founderEmailSent = await sendFounderWelcomeEmail(normalizedEmail, {
          origin: 'stripe_payment_completed'
        });
        
        if (founderEmailSent) {
          console.log('[TEST-STRIPE] ✅ Founder welcome email sent to:', normalizedEmail);
        } else {
          console.warn('[TEST-STRIPE] ⚠️ Failed to send founder welcome email to:', normalizedEmail);
        }
      } catch (emailError) {
        console.error('[TEST-STRIPE] ❌ Error sending founder welcome email:', emailError);
      }
    } else {
      console.log('[TEST-STRIPE] ℹ️ User already had founder plan, skipping welcome email');
    }

    // Enviar email de confirmación de pago (como en el webhook real)
    try {
      const { sendConfirmationEmail } = await import('@/lib/resend');
      const planName = 'Founder Pass';
      const amount = (mockSession.amount_total / 100).toFixed(2);
      const date = new Date(mockSession.created * 1000).toLocaleDateString('es-ES');
      
      confirmationEmailSent = await sendConfirmationEmail(normalizedEmail, {
        planName,
        amount,
        date,
        sessionId: mockSession.id
      });
      
      if (confirmationEmailSent) {
        console.log('[TEST-STRIPE] ✅ Payment confirmation email sent to:', normalizedEmail);
      } else {
        console.warn('[TEST-STRIPE] ⚠️ Failed to send confirmation email to:', normalizedEmail);
      }
    } catch (emailError) {
      console.error('[TEST-STRIPE] ❌ Error sending confirmation email:', emailError);
    }

    // PASO 6: Registrar pago en Supabase (simulando el telemetry/ingest)
    console.log('[TEST-STRIPE] Step 6: Logging payment to Supabase...');

    try {
      const logResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/telemetry/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          payload: {
            email: normalizedEmail,
            stripePaymentIntentId: mockSession.payment_intent,
            stripeCustomerId: mockSession.customer,
            amount: mockSession.amount_total,
            plan: 'founder',
            status: 'completed'
          }
        })
      });

      if (logResponse.ok) {
        const logResult = await logResponse.json();
        console.log('[TEST-STRIPE] ✅ Payment logged to Supabase:', logResult);
      } else {
        const errorText = await logResponse.text();
        console.error('[TEST-STRIPE] ⚠️ Failed to log payment:', errorText);
      }
    } catch (logError) {
      console.error('[TEST-STRIPE] ❌ Error logging payment:', logError);
    }

    // PASO 7: Verificar pago en la tabla payments
    console.log('[TEST-STRIPE] Step 7: Verifying payment in payments table...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('id, user_email, amount, plan, status, created_at')
      .eq('user_email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1);

    if (paymentsError) {
      console.error('[TEST-STRIPE] Error fetching payments:', paymentsError);
    } else {
      console.log('[TEST-STRIPE] Recent payment:', payments?.[0]);
    }

    // PASO 8: Verificar en admin panel
    console.log('[TEST-STRIPE] Step 8: Final verification...');

    const verification = {
      userExists: !!afterState,
      planIsFounder: afterState?.plan === 'founder',
      maxUsesIsNull: afterState?.max_uses === null,
      founderSourceIsPurchase: afterState?.founder_source === 'purchase',
      marketingOptIn: afterState?.marketing_opt_in === true,
      termsAccepted: !!afterState?.terms_accepted_at,
      paymentLogged: payments && payments.length > 0,
      founderEmailSent: founderEmailSent,
      confirmationEmailSent: confirmationEmailSent
    };

    const allPassed = Object.values(verification).every(v => v === true);

    console.log('[TEST-STRIPE] ===== VERIFICATION RESULTS =====');
    console.log('[TEST-STRIPE]', JSON.stringify(verification, null, 2));
    console.log('[TEST-STRIPE] All checks passed:', allPassed);

    return NextResponse.json({
      ok: true,
      message: allPassed 
        ? '✅ All checks passed! User successfully upgraded to founder via Stripe webhook simulation.'
        : '⚠️ Some checks failed. See verification details.',
      user: {
        id: userId,
        email: normalizedEmail,
        plan: afterState?.plan,
        max_uses: afterState?.max_uses,
        founder_source: afterState?.founder_source,
        marketing_opt_in: afterState?.marketing_opt_in,
        terms_accepted_at: afterState?.terms_accepted_at
      },
      before: {
        plan: beforeState?.plan,
        max_uses: beforeState?.max_uses,
        founder_source: beforeState?.founder_source
      },
      after: {
        plan: afterState?.plan,
        max_uses: afterState?.max_uses,
        founder_source: afterState?.founder_source
      },
      payment: payments?.[0] || null,
      verification
    }, { status: 200 });

  } catch (error: any) {
    console.error('[TEST-STRIPE] ❌ Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Unexpected error',
      stack: error.stack
    }, { status: 500 });
  }
}

