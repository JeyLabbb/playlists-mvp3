import { NextResponse } from 'next/server';
import { sendFeedbackEmail } from '../../../lib/resend';
import { getPleiaServerUser } from '../../../lib/auth/serverUser';
import { getSupabaseAdmin } from '../../../lib/supabase/server';

export async function POST(req) {
  try {
    const { rating, positives, negatives, comments, prompt, playlistId, userEmail, model } = await req.json();

    // Resolver email del usuario: primero body, luego sesión
    let sessionEmail = userEmail;
    try {
      const pleiaUser = await getPleiaServerUser();
      if (!sessionEmail && pleiaUser?.email) {
        sessionEmail = pleiaUser.email;
      }
    } catch (e) {
      console.warn('[FEEDBACK] No se pudo obtener pleiaUser para feedback:', e?.message || e);
    }

    const payload = {
      rating,
      positives: positives ? [positives] : [],
      negatives: negatives ? [negatives] : [],
      comments,
      playlistId,
      playlistUrl: undefined,
      sessionEmail,
      intentText: prompt,
      model: model || 'agent',
    };

    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await sendFeedbackEmail(payload);
      emailSent = true;
      console.log('[FEEDBACK-API] ✅ Email enviado exitosamente:', emailResult?.id || 'OK');
      console.log('[FEEDBACK-API] ✅ Email enviado a:', process.env.FEEDBACK_TO || process.env.ALLOWLIST_TO || process.env.CONTACT_EMAIL);
    } catch (err) {
      emailError = err;
      console.error('[FEEDBACK-API] ❌ Error al enviar email:', emailError);
      console.error('[FEEDBACK-API] ❌ Detalles del error:', {
        message: emailError?.message,
        name: emailError?.name,
        stack: emailError?.stack
      });
      // IMPORTANTE: Loguear las variables de entorno para debugging
      console.error('[FEEDBACK-API] ❌ Variables de entorno:', {
        FEEDBACK_TO: process.env.FEEDBACK_TO || 'NO CONFIGURADO',
        ALLOWLIST_TO: process.env.ALLOWLIST_TO || 'NO CONFIGURADO',
        CONTACT_EMAIL: process.env.CONTACT_EMAIL || 'NO CONFIGURADO',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'CONFIGURADO' : 'NO CONFIGURADO',
        RESEND_FROM: process.env.RESEND_FROM || 'NO CONFIGURADO',
      });
    }

    // Intentar adjuntar feedback a un análisis de agente existente (si hay playlistId)
    if (playlistId) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const feedbackPayload = {
            rating,
            positives,
            negatives,
            comments,
          };
          await supabase
            .from('pleia_agent_analyses')
            .update({ feedback: feedbackPayload })
            .eq('playlist_id', playlistId);
        }
      } catch (linkError) {
        console.warn('[FEEDBACK] No se pudo enlazar feedback con pleia_agent_analyses:', linkError);
      }
    }
    return NextResponse.json({ 
      ok: true, 
      emailSent,
      emailError: emailError ? emailError.message : null
    });
  } catch (e) {
    console.error('[FEEDBACK] Error:', e);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}