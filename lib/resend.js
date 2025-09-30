import { Resend } from 'resend';

export function ensureMailEnv() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.ALLOWLIST_TO || process.env.FEEDBACK_TO || process.env.CONTACT_EMAIL;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  if (!from) throw new Error('Missing RESEND_FROM');
  if (!to) throw new Error('Missing FEEDBACK_TO/ALLOWLIST_TO/CONTACT_EMAIL');
  return { apiKey, from, to };
}

export function ensureAllowlistEnv() {
  return ensureMailEnv();
}

export function getResendClient() {
  const { apiKey } = ensureMailEnv();
  return new Resend(apiKey);
}

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendFeedbackEmail(payload) {
  const { from, to } = ensureMailEnv();
  const resend = getResendClient();

  const subject = `Nuevo feedback (${payload.rating ?? 's/r'})`;
  const lines = [
    `Rating: ${payload.rating ?? '—'}`,
    `Positivos: ${(payload.positives?.join(' | ')) || '—'}`,
    `A mejorar: ${(payload.negatives?.join(' | ')) || '—'}`,
    `Comentarios: ${payload.comments || '—'}`,
    `Playlist: ${payload.playlistUrl || payload.playlistId || '—'}`,
    `Usuario: ${payload.sessionEmail || 'anónimo'}`,
    `Prompt/Intent: ${payload.intentText || '—'}`,
    `Modelo: ${payload.model || '—'}`,
    `Fecha: ${new Date().toISOString()}`
  ].join('\n');

  await resend.emails.send({
    from,
    to,
    subject,
    text: lines,
  });
}