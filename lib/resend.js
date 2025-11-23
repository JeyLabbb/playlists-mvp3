import { Resend } from 'resend';
import nodemailer from 'nodemailer';

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

// Send confirmation email with SMTP (Resend has issues)
export async function sendConfirmationEmail(email, planDetails) {
  const { planName, amount, date, sessionId } = planDetails;
  
  const subject = '¡Bienvenido al grupo FOUNDERS de PLEIA! 🎵';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .highlight { background: linear-gradient(135deg, #36E2B4, #5B8CFF); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #36E2B4, #5B8CFF); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 10px; }
    .benefits { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .benefits ul { list-style: none; padding: 0; }
    .benefits li { padding: 8px 0; border-bottom: 1px solid #eee; }
    .benefits li:before { content: "✨ "; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>¡Bienvenido al grupo FOUNDERS! 🎵</h1>
  </div>

  <div class="highlight">
    <h2>¡Gracias por tu compra del Founder Pass!</h2>
    <p><strong>Plan:</strong> Founder Pass<br>
    <strong>Estado:</strong> Completado ✅<br>
    <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
  </div>

  <p>Hola,</p>
  
  <p>¡Qué emoción tenerte con nosotros desde el principio! 🚀</p>
  
  <p>Al formar parte del grupo <strong>FOUNDERS</strong>, no solo tienes acceso a <strong>playlists ilimitadas</strong>, sino que también disfrutarás de:</p>

  <div class="benefits">
    <h3>🎯 Beneficios exclusivos de FOUNDERS:</h3>
    <ul>
      <li><strong>Playlists ilimitadas</strong> - Genera todas las que quieras</li>
      <li><strong>Trato cercano</strong> - Feedback directo con nuestro equipo</li>
      <li><strong>Actualizaciones exclusivas</strong> - Sé el primero en probar nuevas funciones</li>
      <li><strong>Pruebas privadas</strong> - Acceso anticipado a features</li>
      <li><strong>Sistema de puntos</strong> - Gana puntos por uso y feedback</li>
      <li><strong>Jerarquías especiales</strong> - Preferencias según tu apoyo</li>
      <li><strong>Regalos exclusivos</strong> - Merchandising y sorpresas</li>
    </ul>
  </div>

  <p>Tu apoyo y feedback son fundamentales para hacer de PLEIA la mejor plataforma de música con IA. ¡Juntos vamos a revolucionar cómo descubrimos música! 🎶</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://playlists.jeylabbb.com/me" class="cta-button">Ver mi perfil</a>
    <a href="https://playlists.jeylabbb.com/crear-playlists" class="cta-button">Crear playlist</a>
  </div>

  <div class="footer">
    <p>¿Tienes alguna pregunta? Responde a este email y te ayudaremos personalmente.</p>
    <p>¡Gracias por ser parte de esta aventura musical! 🎵</p>
    <p><strong>El equipo de PLEIA</strong></p>
  </div>
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
  const from = process.env.RESEND_FROM || process.env.RESEND_NEWSLETTER_FROM || 'PLEIA <pleia@jeylabbb.com>';
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