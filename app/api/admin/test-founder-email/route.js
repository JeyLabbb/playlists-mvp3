import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendFounderWelcomeEmail } from '@/lib/newsletter/workflows';

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    console.log('[TEST-FOUNDER-EMAIL] Testing founder email for:', normalizedEmail);

    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Cambiar plan a 'free' (max_uses debe ser un número, no null, cuando plan es 'free')
    // 🚨 CRITICAL: Primero actualizar max_uses, luego el plan, para evitar el constraint check
    console.log('[TEST-FOUNDER-EMAIL] Step 1: Setting plan to free...');
    
    // Primero actualizar max_uses a 5
    const { error: maxUsesError } = await supabaseAdmin
      .from('users')
      .update({
        max_uses: 5
      })
      .or(`email.eq.${normalizedEmail}`);
    
    if (maxUsesError) {
      console.error('[TEST-FOUNDER-EMAIL] ❌ Failed to set max_uses:', maxUsesError);
      return NextResponse.json({ error: 'Failed to set max_uses', details: maxUsesError.message }, { status: 500 });
    }
    
    // Luego actualizar el plan a 'free'
    const { error: freeError } = await supabaseAdmin
      .from('users')
      .update({
        plan: 'free'
      })
      .or(`email.eq.${normalizedEmail}`);
    
    if (freeError) {
      console.error('[TEST-FOUNDER-EMAIL] ❌ Failed to set plan to free:', freeError);
      return NextResponse.json({ error: 'Failed to set plan to free', details: freeError.message }, { status: 500 });
    }
    
    console.log('[TEST-FOUNDER-EMAIL] ✅ Plan set to free');
    
    // Esperar un poco
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. Cambiar plan a 'founder'
    console.log('[TEST-FOUNDER-EMAIL] Step 2: Setting plan to founder...');
    const { error: founderError } = await supabaseAdmin
      .from('users')
      .update({
        plan: 'founder',
        max_uses: null
      })
      .or(`email.eq.${normalizedEmail}`);
    
    if (founderError) {
      console.error('[TEST-FOUNDER-EMAIL] ❌ Failed to set plan to founder:', founderError);
      return NextResponse.json({ error: 'Failed to set plan to founder', details: founderError.message }, { status: 500 });
    }
    
    console.log('[TEST-FOUNDER-EMAIL] ✅ Plan set to founder');
    
    // 3. Verificar que se actualizó
    await new Promise(resolve => setTimeout(resolve, 200));
    const { data: afterUpdate } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, max_uses')
      .or(`email.eq.${normalizedEmail}`)
      .maybeSingle();
    
    if (afterUpdate?.plan !== 'founder') {
      console.error('[TEST-FOUNDER-EMAIL] ❌ Plan not updated! Still:', afterUpdate?.plan);
      return NextResponse.json({ error: 'Plan not updated correctly', currentPlan: afterUpdate?.plan }, { status: 500 });
    }
    
    console.log('[TEST-FOUNDER-EMAIL] ✅ Plan verified as founder');
    
    // 4. Enviar email de bienvenida a founder
    console.log('[TEST-FOUNDER-EMAIL] Step 3: Sending founder welcome email...');
    const emailSent = await sendFounderWelcomeEmail(normalizedEmail, {
      origin: 'test_founder_email'
    });
    
    if (!emailSent) {
      console.warn('[TEST-FOUNDER-EMAIL] ⚠️ Failed to send founder welcome email, but plan was updated');
    } else {
      console.log('[TEST-FOUNDER-EMAIL] ✅ Founder welcome email sent successfully');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Plan changed from free to founder and welcome email triggered',
      email: normalizedEmail,
      plan: afterUpdate.plan,
      max_uses: afterUpdate.max_uses
    });

  } catch (error) {
    console.error('[TEST-FOUNDER-EMAIL] Error:', error);
    return NextResponse.json({ error: 'Failed to test founder email', details: error.message }, { status: 500 });
  }
}

