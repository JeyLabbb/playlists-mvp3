// Script simple para enviar email de prueba
// Ejecutar: node scripts/send-test-email-simple.js

require('dotenv').config({ path: '.env.local' });

async function sendTestEmail() {
  console.log('🧪 Enviando email de prueba a jeylabbb@gmail.com\n');

  const testEmail = 'jeylabbb@gmail.com';
  const apiKey = process.env.RESEND_API_KEY;
  const rawFrom = process.env.RESEND_FROM || process.env.RESEND_NEWSLETTER_FROM || 'PLEIA <pleia@jeylabbb.com>';
  const from = rawFrom.replace(/^["']|["']$/g, '').trim();
  const pricingUrl = 'https://playlists.jeylabbb.com/pricing';

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY no configurada en .env.local');
    return;
  }

  console.log('📧 From:', from);
  console.log('📨 To:', testEmail);
  console.log('🔑 API Key:', apiKey.substring(0, 10) + '...\n');

  // HTML del email (versión simplificada para test)
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Te has quedado sin playlists IA</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Inter',system-ui,sans-serif;color:#eff4ff;">
  <div style="padding:40px;max-width:600px;margin:0 auto;">
    <div style="background:#0c101f;padding:40px;border-radius:24px;">
      <h1 style="color:#22f6ce;font-size:24px;">PLEIA</h1>
      <p style="font-size:18px;color:#eff4ff;">Hey,</p>
      <p>he visto que te has quedado sin usos en PLEIA.</p>
      <p>Y antes de que cierres la pestaña pensando "bueno, ya está", te cuento algo rápido.</p>
      <p style="font-weight:500;color:#eff4ff;">Hay un motivo por el que PLEIA te ha enganchado:</p>
      <p><strong>te ahorra tiempo, te inspira, y te crea playlists que tú no podrías hacer ni en media hora.</strong></p>
      <p>Por eso tienes dos caminos desde aquí:</p>
      <div style="background:rgba(34,246,206,0.08);border:1px solid rgba(34,246,206,0.2);border-radius:16px;padding:20px;margin:16px 0;">
        <p style="margin:0;font-size:18px;font-weight:600;color:#22f6ce;">👉 Opción 1 – Rápida</p>
        <p style="margin:8px 0 0 0;">Invita a 3 amigos con tu enlace y listo. Acceso ilimitado de por vida.</p>
      </div>
      <div style="background:rgba(34,246,206,0.08);border:1px solid rgba(34,246,206,0.2);border-radius:16px;padding:20px;margin:16px 0;">
        <p style="margin:0;font-size:18px;font-weight:600;color:#22f6ce;">👉 Opción 2 – Directa</p>
        <p style="margin:8px 0 0 0;">Hazte founder por 5€ y accede para siempre. Sin límites. Sin mensualidades.</p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${pricingUrl}" style="display:inline-block;padding:16px 40px;background:#22f6ce;color:#07131d;border-radius:999px;font-weight:600;text-decoration:none;font-size:17px;">
          Quiero playlists ilimitadas
        </a>
      </div>
      <p>Nos vemos dentro.</p>
      <p style="color:rgba(239,244,255,0.65);">— MTRYX, fundadores de PLEIA</p>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:32px 0;">
      <p style="font-size:13px;color:rgba(239,244,255,0.55);">© 2025 PLEIA · Madrid, España</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hey,

he visto que te has quedado sin usos en PLEIA.

Y antes de que cierres la pestaña pensando "bueno, ya está", te cuento algo rápido.

Hay un motivo por el que PLEIA te ha enganchado:

te ahorra tiempo, te inspira, y te crea playlists que tú no podrías hacer ni en media hora.

Por eso tienes dos caminos desde aquí:

👉 Opción 1 – Rápida
Invita a 3 amigos con tu enlace y listo. Acceso ilimitado de por vida.

👉 Opción 2 – Directa
Hazte founder por 5€ y accede para siempre. Sin límites. Sin mensualidades.

👉 ${pricingUrl}

Nos vemos dentro.

— MTRYX, fundadores de PLEIA
  `;

  const payload = {
    from,
    to: [testEmail],
    subject: 'Te has quedado sin playlists IA… pero tengo algo para ti.',
    html,
    text,
  };

  console.log('📤 Enviando email...\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data?.error) {
      console.error('❌ Error:', data?.error || data);
      return;
    }

    console.log('✅✅✅ EMAIL ENVIADO EXITOSAMENTE!');
    console.log('📧 MessageId:', data.id);
    console.log('\n📬 Revisa el inbox de jeylabbb@gmail.com en 1-2 minutos');
    console.log('⚠️  Si no aparece, revisar carpeta de SPAM\n');

  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
  }
}

sendTestEmail();

