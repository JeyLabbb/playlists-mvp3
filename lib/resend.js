import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export function ensureMailEnv() {
  const apiKey = process.env.RESEND_API_KEY;
  // Usar exactamente la misma lógica de FROM que el welcome mail / founders
  const rawFrom = process.env.RESEND_FROM || process.env.RESEND_NEWSLETTER_FROM || 'PLEIA <pleia@jeylabbb.com>';
  const from = rawFrom.replace(/^["']|["']$/g, '').trim();
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

// SMTP fallback configuration
function getSMTPTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials not configured');
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Send confirmation email with PLEIA template (tarjeta azul)
export async function sendConfirmationEmail(email, planDetails) {
  const { planName, amount, date, sessionId } = planDetails;
  
  const subject = '¡Bienvenido al grupo FOUNDERS de PLEIA! 🎵';
  
  // PLEIA Template - Tarjeta azul con gradientes
  const CARD_BG = '#0c101f';
  const TEXT_PRIMARY = '#eff4ff';
  const TEXT_SECONDARY = 'rgba(239,244,255,0.85)';
  const TEXT_MUTED = 'rgba(239,244,255,0.65)';
  const ACCENT = '#22f6ce';
  const ACCENT_ALT = '#8c6fff';
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 !important; }
      .block { padding: 24px !important; }
      .stack { display: block !important; width: 100% !important; padding: 0 !important; }
      .hero-title { font-size: 26px !important; line-height: 1.25 !important; }
      .cta-primary, .cta-secondary { width: 100% !important; text-align: center !important; display: block !important; box-sizing: border-box; }
    }
    body { background-color: #f4f6fb; }
    @media (prefers-color-scheme: dark) { body { background-color: #04070d !important; } }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${TEXT_PRIMARY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:transparent;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" class="container" style="max-width:620px;width:100%;">
          <tr>
            <td class="block" style="padding:32px;background:${CARD_BG};border-radius:32px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 25px 60px rgba(3,9,18,0.65);background-image:radial-gradient(circle at 0% 0%,rgba(140,111,255,0.25),transparent 55%),radial-gradient(circle at 80% 0%,rgba(34,246,206,0.25),transparent 60%);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="text-transform:uppercase;letter-spacing:0.32em;font-size:11px;color:${ACCENT};margin-bottom:12px;">
                      FOUNDER PASS · CONFIRMACIÓN
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:8px;">
                    <div class="hero-title" style="font-size:28px;font-weight:700;line-height:1.2;color:${TEXT_PRIMARY};letter-spacing:-0.02em;">
                      ¡Gracias por tu compra del Founder Pass!
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <div style="background:rgba(34,246,206,0.1);border:1px solid rgba(34,246,206,0.2);border-radius:12px;padding:16px;">
                      <div style="font-size:14px;color:${TEXT_SECONDARY};">
                        <strong style="color:${TEXT_PRIMARY};">Plan:</strong> Founder Pass<br/>
                        <strong style="color:${TEXT_PRIMARY};">Estado:</strong> Completado ✅<br/>
                        <strong style="color:${TEXT_PRIMARY};">Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;">
                    <div style="font-size:15px;line-height:1.75;color:${TEXT_SECONDARY};">
                      <p style="margin:0 0 16px 0;">Hola,</p>
                      <p style="margin:0 0 16px 0;">¡Qué emoción tenerte con nosotros desde el principio! 🚀</p>
                      <p style="margin:0 0 16px 0;">Al formar parte del grupo <strong style="color:${TEXT_PRIMARY};">FOUNDERS</strong>, no solo tienes acceso a <strong style="color:${ACCENT};">playlists ilimitadas</strong>, sino que también disfrutarás de:</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <div style="background:rgba(140,111,255,0.1);border:1px solid rgba(140,111,255,0.2);border-radius:12px;padding:20px;">
                      <div style="font-size:14px;font-weight:600;color:${ACCENT_ALT};margin-bottom:12px;">🎯 Beneficios exclusivos de FOUNDERS:</div>
                      <div style="font-size:14px;line-height:1.8;color:${TEXT_SECONDARY};">
                        ✨ <strong style="color:${TEXT_PRIMARY};">Playlists ilimitadas</strong> - Genera todas las que quieras<br/>
                        ✨ <strong style="color:${TEXT_PRIMARY};">Trato cercano</strong> - Feedback directo con nuestro equipo<br/>
                        ✨ <strong style="color:${TEXT_PRIMARY};">Actualizaciones exclusivas</strong> - Sé el primero en probar nuevas funciones<br/>
                        ✨ <strong style="color:${TEXT_PRIMARY};">Pruebas privadas</strong> - Acceso anticipado a features<br/>
                        ✨ <strong style="color:${TEXT_PRIMARY};">Sistema de puntos</strong> - Gana puntos por uso y feedback<br/>
                        ✨ <strong style="color:${TEXT_PRIMARY};">Regalos exclusivos</strong> - Merchandising y sorpresas
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;">
                    <div style="font-size:15px;line-height:1.75;color:${TEXT_SECONDARY};">
                      Tu apoyo y feedback son fundamentales para hacer de PLEIA la mejor plataforma de música con IA. ¡Juntos vamos a revolucionar cómo descubrimos música! 🎶
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="stack" style="padding:0 12px 12px 0;">
                          <a href="https://playlists.jeylabbb.com" class="cta-primary" style="display:inline-block;padding:14px 32px;background:${ACCENT};color:#07131d;border-radius:999px;font-weight:600;text-decoration:none;font-size:15px;">
                            Crear playlist con IA
                          </a>
                        </td>
                        <td class="stack" style="padding:0 0 12px 12px;">
                          <a href="https://playlists.jeylabbb.com/me" class="cta-secondary" style="display:inline-block;padding:12px 20px;border-radius:14px;border:1px solid rgba(134,111,255,0.4);color:${ACCENT_ALT};font-weight:500;text-decoration:none;font-size:14px;">
                            Ver mi perfil ↗
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:12px;color:${TEXT_MUTED};line-height:1.6;">
                      ¿Tienes alguna pregunta? Responde a este email y te ayudaremos personalmente.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <div style="font-size:11px;color:${TEXT_MUTED};text-align:center;">
                      © ${new Date().getFullYear()} PLEIA · Madrid, España
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `¡Bienvenido al grupo FOUNDERS de PLEIA! 🎵

¡Gracias por tu compra del Founder Pass!

Plan: Founder Pass
Estado: Completado ✅
Fecha: ${new Date().toLocaleDateString('es-ES')}

Hola,

¡Qué emoción tenerte con nosotros desde el principio! 🚀

Al formar parte del grupo FOUNDERS, no solo tienes acceso a playlists ilimitadas, sino que también disfrutarás de:

🎯 Beneficios exclusivos de FOUNDERS:
✨ Playlists ilimitadas - Genera todas las que quieras
✨ Trato cercano - Feedback directo con nuestro equipo
✨ Actualizaciones exclusivas - Sé el primero en probar nuevas funciones
✨ Pruebas privadas - Acceso anticipado a features
✨ Sistema de puntos - Gana puntos por uso y feedback
✨ Jerarquías especiales - Preferencias según tu apoyo
✨ Regalos exclusivos - Merchandising y sorpresas

Tu apoyo y feedback son fundamentales para hacer de PLEIA la mejor plataforma de música con IA. ¡Juntos vamos a revolucionar cómo descubrimos música! 🎶

Enlaces importantes:
- Ver mi perfil: https://playlists.jeylabbb.com/me
- Crear playlist: https://playlists.jeylabbb.com/crear-playlists

¿Tienes alguna pregunta? Responde a este email y te ayudaremos personalmente.

¡Gracias por ser parte de esta aventura musical! 🎵

El equipo de PLEIA`;

  // Use Resend API (same as sendFounderWelcomeEmail)
  const apiKey = process.env.RESEND_API_KEY;
  // 🚨 CRITICAL: Limpiar comillas dobles del from (pueden venir de variables de entorno)
  const rawFrom = process.env.RESEND_FROM || process.env.RESEND_NEWSLETTER_FROM || 'PLEIA <pleia@jeylabbb.com>';
  const from = rawFrom.replace(/^["']|["']$/g, '').trim(); // Eliminar comillas al inicio y final
  const replyTo = process.env.CONTACT_EMAIL || undefined;

  console.log('[EMAIL] ===== ENVIANDO EMAIL DE CONFIRMACIÓN =====');
  console.log('[EMAIL] To:', email);
  console.log('[EMAIL] From:', from);
  console.log('[EMAIL] Subject:', subject);
  console.log('[EMAIL] Has API Key:', !!apiKey);
  console.log('[EMAIL] API Key prefix:', apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A');

  if (!apiKey) {
    console.error('[EMAIL] ❌ RESEND_API_KEY missing, cannot send confirmation email');
    return false;
  }

  try {
    const payload = {
      from,
      to: [email],
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' '),
      ...(replyTo ? { reply_to: replyTo } : {}),
    };

    console.log('[EMAIL] Payload (sin API key):', {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      hasHtml: !!payload.html,
      hasText: !!payload.text,
      replyTo: payload.reply_to
    });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[EMAIL] Response status:', response.status);
    console.log('[EMAIL] Response ok:', response.ok);

    let data = null;
    try {
      data = await response.json();
      console.log('[EMAIL] Response data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      const textResponse = await response.text();
      console.error('[EMAIL] Failed to parse JSON response:', textResponse);
      data = null;
    }

    if (!response.ok || data?.error) {
      const message =
        data?.error?.message ||
        data?.message ||
        (typeof data === 'string' ? data : null) ||
        `HTTP ${response.status}`;
      console.error('[EMAIL] ❌ Resend API failed:', {
        status: response.status,
        message,
        error: data?.error,
        fullResponse: data
      });
      return false;
    }

    console.log('[EMAIL] ✅✅✅ Confirmation email sent via Resend successfully!');
    console.log('[EMAIL] MessageId:', data?.id);
    console.log('[EMAIL] Full response:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('[EMAIL] ❌❌❌ Resend API error:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    return false;
  }
}

export async function sendFeedbackEmail(payload) {
  const { from, to } = ensureMailEnv();
  const resend = getResendClient();

  const subject = `Feedback PLEIA - ${payload.sessionEmail || 'anónimo'} (${payload.rating ?? 's/r'})`;
  const lines = [
    `Usuario: ${payload.sessionEmail || 'anónimo'}`,
    `Rating: ${payload.rating ?? '—'}`,
    '',
    '✅ ACIERTOS',
    (payload.positives?.join(' | ') || '—'),
    '',
    '🛠️ A MEJORAR',
    (payload.negatives?.join(' | ') || '—'),
    '',
    '💬 COMENTARIOS',
    (payload.comments || '—'),
    '',
    '🎧 Playlist:',
    (payload.playlistUrl || payload.playlistId || '—'),
    '',
    '🧠 Prompt / Intent:',
    (payload.intentText || '—'),
    '',
    `Modelo: ${payload.model || '—'}`,
    `Fecha: ${new Date().toISOString()}`,
  ].join('\n');

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      text: lines,
    });
    console.log('[FEEDBACK] ✅ Email enviado correctamente', result);
  } catch (error) {
    console.error('[FEEDBACK] ❌ Error enviando feedback', error);
    throw error;
  }
}