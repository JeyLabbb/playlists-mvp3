import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const FEEDBACK_TO = process.env.FEEDBACK_TO || process.env.ALLOWLIST_TO || 'jeylabbb@gmail.com';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function POST(req) {
  try {
    const { rating, positives, negatives, comments, prompt, playlistId, userEmail } = await req.json();

    if (!resend) {
      console.error('[FEEDBACK] Missing RESEND_API_KEY');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const lines = [
      `Rating: ${rating ?? '-'}`,
      `Prompt/Intent: ${prompt?.trim() || '-'}`,
      `Playlist: ${playlistId || '-'}`,
      `Usuario: ${userEmail || 'anónimo'}`,
      `Fecha: ${new Date().toISOString()}`,
      '',
      '✅ Aciertos',
      (positives?.trim() || '—'),
      '',
      '🛠️ A mejorar',
      (negatives?.trim() || '—'),
      '',
      '💬 Comentarios',
      (comments?.trim() || '—'),
    ];

    // Crear estrellitas para el asunto
    const stars = '⭐'.repeat(rating || 0) + '☆'.repeat(5 - (rating || 0));
    
    await resend.emails.send({
      from: RESEND_FROM,
      to: FEEDBACK_TO,
      subject: `${stars} Feedback playlist (${playlistId || '-'})`,
      text: lines.join('\n'),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[FEEDBACK] Error:', e);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}