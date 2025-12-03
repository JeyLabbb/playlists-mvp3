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

    await sendFeedbackEmail(payload);

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
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[FEEDBACK] Error:', e);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}