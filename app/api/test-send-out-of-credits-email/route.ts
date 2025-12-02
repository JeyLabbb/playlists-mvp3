/**
 * ENDPOINT TEMPORAL DE PRUEBA
 * Para enviar email de "out of credits" manualmente
 * 
 * Usar: GET /api/test-send-out-of-credits-email
 * O con email específico: GET /api/test-send-out-of-credits-email?email=test@example.com
 * 
 * ELIMINAR DESPUÉS DE PROBAR
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendOutOfCreditsEmailWithTracking } from '@/lib/email/outOfCreditsWithTracking';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const emailParam = searchParams.get('email');
    const testEmail = emailParam || 'jeylabbb@gmail.com';

    console.log('[TEST-OUT-OF-CREDITS] ===== INICIANDO TEST =====');
    console.log('[TEST-OUT-OF-CREDITS] Email objetivo:', testEmail);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase not configured',
        details: 'SUPABASE_SERVICE_ROLE_KEY missing'
      }, { status: 500 });
    }

    // 1. Buscar o crear usuario
    console.log('[TEST-OUT-OF-CREDITS] Step 1: Buscando usuario...');
    let { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .maybeSingle();

    if (findError) {
      console.error('[TEST-OUT-OF-CREDITS] Error buscando usuario:', findError);
      return NextResponse.json({ 
        error: 'Error finding user',
        details: findError.message
      }, { status: 500 });
    }

    if (!user) {
      console.log('[TEST-OUT-OF-CREDITS] Usuario no existe, creando...');
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: testEmail,
          plan: 'free',
          usage_count: 5,
          max_uses: 5,
          out_of_credits_email_sent: false,
        })
        .select()
        .single();

      if (createError) {
        console.error('[TEST-OUT-OF-CREDITS] Error creando usuario:', createError);
        return NextResponse.json({ 
          error: 'Error creating user',
          details: createError.message
        }, { status: 500 });
      }

      user = newUser;
      console.log('[TEST-OUT-OF-CREDITS] ✅ Usuario creado');
    } else {
      console.log('[TEST-OUT-OF-CREDITS] ✅ Usuario encontrado');
    }

    // 2. Resetear flag si ya fue enviado
    if (user.out_of_credits_email_sent) {
      console.log('[TEST-OUT-OF-CREDITS] Step 2: Reseteando flag para re-enviar...');
      const { error: resetError } = await supabase
        .from('users')
        .update({
          out_of_credits_email_sent: false,
          out_of_credits_email_sent_at: null,
        })
        .eq('id', user.id);

      if (resetError) {
        console.error('[TEST-OUT-OF-CREDITS] Error reseteando flag:', resetError);
      } else {
        console.log('[TEST-OUT-OF-CREDITS] ✅ Flag reseteado');
      }
    }

    // 3. Enviar email
    console.log('[TEST-OUT-OF-CREDITS] Step 3: Enviando email...');
    console.log('[TEST-OUT-OF-CREDITS] User ID:', user.id);
    console.log('[TEST-OUT-OF-CREDITS] Email:', testEmail);

    const result = await sendOutOfCreditsEmailWithTracking(user.id, testEmail);

    // 4. Verificar resultado
    if (result.ok && result.emailSent) {
      console.log('[TEST-OUT-OF-CREDITS] ✅✅✅ EMAIL ENVIADO EXITOSAMENTE!');
      console.log('[TEST-OUT-OF-CREDITS] 📊 Campaign ID:', result.campaignId);
      console.log('[TEST-OUT-OF-CREDITS] 📊 Recipient ID:', result.recipientId);
      
      // Verificar en DB
      const { data: updatedUser } = await supabase
        .from('users')
        .select('out_of_credits_email_sent, out_of_credits_email_sent_at')
        .eq('id', user.id)
        .single();

      return NextResponse.json({
        success: true,
        message: '✅ Email enviado exitosamente con tracking completo',
        email: testEmail,
        userId: user.id,
        campaignId: result.campaignId,
        recipientId: result.recipientId,
        emailSentAt: updatedUser?.out_of_credits_email_sent_at,
        newsletterHQ: `https://playlists.jeylabbb.com/admin/newsletter`,
        details: {
          flagInDB: updatedUser?.out_of_credits_email_sent,
          timestamp: updatedUser?.out_of_credits_email_sent_at,
        }
      });
    } else if (result.ok && !result.emailSent) {
      console.log('[TEST-OUT-OF-CREDITS] ℹ️ Email no enviado:', result.reason);
      return NextResponse.json({
        success: false,
        message: 'Email no enviado',
        reason: result.reason,
        email: testEmail,
      });
    } else {
      console.error('[TEST-OUT-OF-CREDITS] ❌ Error enviando email:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        email: testEmail,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[TEST-OUT-OF-CREDITS] ❌ Error inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

