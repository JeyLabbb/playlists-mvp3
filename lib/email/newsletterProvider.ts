import { Resend } from 'resend';

export type NewsletterCTA = {
  label: string;
  url: string;
};

export type NewsletterSendOptions = {
  subject?: string;
  title?: string;
  message?: string;
  previewOnly?: boolean;
  cta?: NewsletterCTA;
  secondaryCta?: NewsletterCTA;
  primaryCta?: NewsletterCTA;
  templateMode?: 'custom' | 'pleia' | 'minimal';
  campaignContext?: {
    campaignId?: string;
    baseUrl?: string;
    recipientTokenMap?: Record<string, { recipientId?: string; contactId?: string }>;
  };
};

type RawRecipient = string | { email: string; contactId?: string | null; recipientId?: string | null };

type NormalizedRecipient = {
  email: string;
  contactId?: string | null;
  recipientId?: string | null;
};

const defaultSubject = 'Novedades de PLEIA';
const defaultMessage = `Hola 👋

Te enviamos las últimas novedades de PLEIA.

¡Gracias por crear playlists con nosotros!`;

const BRAND_BG = '#04070d';
const CARD_BG = '#0c101f';
const CARD_ACCENT = 'linear-gradient(135deg,#131b35 0%,#040811 100%)';
const TEXT_PRIMARY = '#eff4ff';
const TEXT_SECONDARY = 'rgba(239,244,255,0.78)';
const TEXT_MUTED = 'rgba(239,244,255,0.55)';
const ACCENT = '#22f6ce';
const ACCENT_ALT = '#8c6fff';

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function formatMessageBlocks(message?: string) {
  const trimmed = message?.trim();
  if (!trimmed) {
    return {
      html: defaultMessage
        .split('\n\n')
        .map((paragraph) => `<p>${paragraph}</p>`)
        .join(''),
      text: defaultMessage,
    };
  }

  const paragraphs = trimmed.split(/\n{2,}/);
  const html = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');

  return {
    html,
    text: trimmed,
  };
}

// Plantilla Minimal - Enfocada en legibilidad del texto
const htmlWrapperMinimal = (
  labelText: string,
  body: string,
  primaryCta?: NewsletterCTA | null,
  recipientEmail?: string | null,
) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(labelText)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 16px !important; }
      .content { padding: 32px 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#fafbfc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafbfc;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="max-width:600px;width:100%;">
          <tr>
            <td class="content" style="padding:48px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
              
              <!-- Header sutil -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-bottom:1px solid rgba(34,246,206,0.15);padding-bottom:16px;">
                    <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(34,246,206,0.8);font-weight:500;">
                      ${escapeHtml(labelText)}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Contenido del mensaje -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:16px;line-height:1.75;color:#1f2937;">
                    ${body}
                  </td>
                </tr>
              </table>

              ${
                primaryCta
                  ? `
              <!-- CTA Principal -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;">
                <tr>
                  <td align="center">
                    <a href="${primaryCta.url}" style="display:inline-block;padding:14px 32px;background:rgba(34,246,206,0.1);border:1.5px solid rgba(34,246,206,0.3);color:#059669;border-radius:6px;font-weight:500;text-decoration:none;font-size:15px;transition:all 0.2s;">
                      ${escapeHtml(primaryCta.label)} →
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:48px;">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding-top:24px;">
                    <div style="font-size:12px;color:#9ca3af;line-height:1.6;text-align:center;">
                      Este mensaje fue enviado por PLEIA<br />
                      Creando las mejores experiencias musicales con IA
                    </div>
                    ${
                      recipientEmail
                        ? `<div style="margin-top:16px;text-align:center;">
                          <a href="${resolveBaseUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="color:#9ca3af;text-decoration:underline;font-size:11px;">
                            Cancelar suscripción
                          </a>
                        </div>`
                        : ''
                    }
                    <div style="margin-top:12px;font-size:11px;color:#d1d5db;text-align:center;">
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
</html>
`;

// Plantilla PLEIA - Diseño del mail de Founders (tarjeta azul)
const htmlWrapper = (
  labelText: string,
  body: string,
  primaryCta?: NewsletterCTA | null,
  secondaryCta?: NewsletterCTA | null,
  recipientEmail?: string | null,
) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background: #f4f6fb; 
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
    }
    .highlight { 
      background: linear-gradient(135deg, #36E2B4, #5B8CFF); 
      color: white; 
      padding: 20px; 
      border-radius: 10px; 
      margin: 20px 0; 
      text-align: center; 
    }
    .highlight h2 { 
      margin: 0 0 10px 0; 
      font-size: 20px; 
    }
    .highlight p { 
      margin: 5px 0; 
    }
    .cta-button { 
      display: inline-block; 
      background: linear-gradient(135deg, #36E2B4, #5B8CFF); 
      color: white; 
      padding: 15px 30px; 
      text-decoration: none; 
      border-radius: 25px; 
      font-weight: bold; 
      margin: 10px; 
    }
    .benefits { 
      background: #f8f9fa; 
      padding: 20px; 
      border-radius: 10px; 
      margin: 20px 0; 
    }
    .benefits h3 { 
      margin-top: 0; 
      color: #333; 
    }
    .benefits ul { 
      list-style: none; 
      padding: 0; 
    }
    .benefits li { 
      padding: 8px 0; 
      border-bottom: 1px solid #eee; 
    }
    .benefits li:before { 
      content: "✨ "; 
    }
    .benefits li:last-child { 
      border-bottom: none; 
    }
    .footer { 
      text-align: center; 
      margin-top: 30px; 
      padding-top: 20px; 
      border-top: 1px solid #ddd; 
      color: #666; 
      font-size: 14px; 
    }
    @media only screen and (max-width: 600px) {
      body { 
        padding: 10px; 
      }
      .highlight { 
        padding: 15px; 
      }
      .cta-button { 
        display: block; 
        margin: 10px 0; 
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: #333; font-size: 24px; margin: 0;">PLEIA 🎵</h1>
  </div>

  <div class="highlight">
    <h2>${escapeHtml(labelText)}</h2>
  </div>

  <div style="font-size: 15px; line-height: 1.7; color: #333;">
    ${body}
  </div>

  ${
    primaryCta || secondaryCta
      ? `<div style="text-align: center; margin: 30px 0;">
          ${primaryCta ? `<a href="${primaryCta.url}" class="cta-button">${escapeHtml(primaryCta.label)}</a>` : ''}
          ${secondaryCta ? `<a href="${secondaryCta.url}" class="cta-button">${escapeHtml(secondaryCta.label)}</a>` : ''}
        </div>`
      : ''
  }

  <div class="footer">
    <p>¿Tienes alguna pregunta? Responde a este email y te ayudaremos personalmente.</p>
    <p>¡Gracias por ser parte de esta aventura musical! 🎵</p>
    <p><strong>El equipo de PLEIA</strong></p>
    ${
      recipientEmail
        ? `<p style="margin-top: 20px; font-size: 11px; color: #999;">
            ¿Ya no quieres recibir información valiosa sobre nuevas funciones y actualizaciones exclusivas?
            <br /><span style="opacity:0.7;">(Otras personas estarán encantadas de descubrir lo que tú te pierdes 🤷)</span>
            <br /><a href="${resolveBaseUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="color: #999; text-decoration: underline; font-size: 10px;">
              Darme de baja (aunque lo lamentaré)
            </a>
          </p>`
        : ''
    }
    <p style="font-size: 11px; color: #999; margin-top: 10px;">© ${new Date().getFullYear()} PLEIA · Madrid, España</p>
  </div>
</body>
</html>
`;

function normalizeRecipients(entries: RawRecipient[]): NormalizedRecipient[] {
  return (entries || [])
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        const email = entry.trim().toLowerCase();
        return email ? { email } : null;
      }
      const email = entry.email?.trim().toLowerCase();
      if (!email) return null;
      return {
        email,
        contactId: entry.contactId ?? null,
        recipientId: entry.recipientId ?? null,
      };
    })
    .filter((item) => {
      return item !== null && typeof item === 'object' && 'email' in item && typeof item.email === 'string' && item.email.length > 0;
    }) as NormalizedRecipient[];
}

function resolveBaseUrl() {
  // Prefer production domain to avoid spam filters
  // URLs must match the sending domain (Resend requirement)
  if (process.env.PRODUCTION_URL) return process.env.PRODUCTION_URL;
  
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    // Don't use Vercel preview URLs in emails (they trigger spam filters)
    if (url.includes('vercel.app')) {
      return process.env.PRODUCTION_URL || 'https://playlists.jeylabbb.com';
    }
    return url;
  }
  
  // Default to production domain
  return 'https://playlists.jeylabbb.com';
}

function buildClickUrl(baseUrl: string, campaignId: string | undefined, recipientId: string | undefined, targetUrl: string, label: string) {
  if (!baseUrl || !campaignId || !recipientId) return targetUrl;
  const url = new URL('/api/newsletter/track/click', baseUrl);
  url.searchParams.set('c', campaignId);
  url.searchParams.set('r', recipientId);
  url.searchParams.set('u', targetUrl);
  url.searchParams.set('l', label);
  return url.toString();
}

function injectPixel(html: string, pixelUrl: string) {
  if (!pixelUrl) return html;
  const pixelTag = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;max-height:0px;max-width:0px;" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelTag}</body>`);
  }
  return `${html}${pixelTag}`;
}

function buildRecipientHtml(params: {
  labelText: string;
  body: string;
  primaryCta?: NewsletterCTA | null;
  secondaryCta?: NewsletterCTA | null;
  campaignId?: string;
  recipientId?: string | null;
  baseUrl?: string;
  recipientEmail?: string | null;
  templateMode?: 'custom' | 'pleia' | 'minimal';
}) {
  // Elegir wrapper según templateMode
  let baseHtml: string;
  if (params.templateMode === 'minimal') {
    baseHtml = htmlWrapperMinimal(params.labelText, params.body, params.primaryCta, params.recipientEmail);
  } else if (params.templateMode === 'pleia') {
    // Plantilla PLEIA: diseño del mail de Founders (tarjeta azul)
    baseHtml = htmlWrapper(params.labelText, params.body, params.primaryCta, params.secondaryCta, params.recipientEmail);
  } else {
    // Custom: diseño básico sin mucho estilo
    baseHtml = htmlWrapperMinimal(params.labelText, params.body, params.primaryCta, params.recipientEmail);
  }
  
  if (!params.baseUrl || !params.campaignId || !params.recipientId) {
    return baseHtml;
  }
  const url = new URL('/api/newsletter/track/open', params.baseUrl);
  url.searchParams.set('c', params.campaignId);
  url.searchParams.set('r', params.recipientId);
  return injectPixel(baseHtml, url.toString());
}

export async function sendNewsletterEmail(
  recipientsInput: RawRecipient[] | string,
  options: NewsletterSendOptions = {},
) {
  const recipientArray = Array.isArray(recipientsInput) ? recipientsInput : [recipientsInput];
  const normalizedRecipients = normalizeRecipients(recipientArray);

  if (!normalizedRecipients.length) {
    return {
      ok: false,
      queued: 0,
      provider: 'resend',
      reason: 'empty-recipients',
      previewOnly: options.previewOnly ?? false,
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  // 🚨 CRITICAL: Limpiar comillas dobles del from (pueden venir de variables de entorno)
  const rawFrom =
    process.env.RESEND_NEWSLETTER_FROM ||
    process.env.RESEND_FROM ||
    'PLEIA <pleia@jeylabbb.com>';
  const fromAddress = rawFrom.replace(/^["']|["']$/g, '').trim(); // Eliminar comillas al inicio y final

  const subject = options.subject?.trim() || defaultSubject;
  const { html, text } = formatMessageBlocks(options.message);
  const labelText = (options.title?.trim() || 'PLEIA Update').toUpperCase();
  const baseUrl = options.campaignContext?.baseUrl || resolveBaseUrl();
  const campaignId = options.campaignContext?.campaignId;
  const recipientTokenMap = options.campaignContext?.recipientTokenMap || {};

  const defaultPrimaryCta =
    options.primaryCta ||
    options.cta || { label: 'Crear playlist con IA', url: 'https://playlists.jeylabbb.com' };
  const defaultSecondaryCta =
    options.secondaryCta ?? { label: 'Explorar trending', url: 'https://playlists.jeylabbb.com/trending' };

  if (!resendApiKey) {
    console.warn('[Newsletter] RESEND_API_KEY not configured. Skipping real send.');
    return {
      ok: false,
      queued: 0,
      provider: 'resend',
      reason: 'missing-api-key',
      previewOnly: options.previewOnly ?? false,
    };
  }

  console.log('[Newsletter] Sending via Resend', {
    recipients: normalizedRecipients.length,
    previewOnly: options.previewOnly ?? false,
    subject,
  });

  const resend = new Resend(resendApiKey);
  let sent = 0;

  for (const recipient of normalizedRecipients) {
    const tokenInfo = recipientTokenMap[recipient.email] || {};
    const recipientId = recipient.recipientId || tokenInfo.recipientId || undefined;

    const trackedPrimary =
      defaultPrimaryCta?.url && campaignId && recipientId
        ? {
            label: defaultPrimaryCta.label,
            url: buildClickUrl(baseUrl, campaignId, recipientId, defaultPrimaryCta.url, 'primary'),
          }
        : defaultPrimaryCta;

    const trackedSecondary =
      defaultSecondaryCta?.url && campaignId && recipientId
        ? {
            label: defaultSecondaryCta.label,
            url: buildClickUrl(baseUrl, campaignId, recipientId, defaultSecondaryCta.url, 'secondary'),
          }
        : defaultSecondaryCta;

    const htmlContent = buildRecipientHtml({
      labelText,
      body: html,
      primaryCta: trackedPrimary,
      secondaryCta: trackedSecondary,
      campaignId,
      recipientId,
      baseUrl,
      recipientEmail: recipient.email,
      templateMode: options.templateMode || 'pleia',
    });

    try {
      await resend.emails.send({
        from: fromAddress,
        to: recipient.email,
        subject,
        html: htmlContent,
        text,
      });
      sent += 1;
    } catch (error) {
      console.error('[Newsletter] Error sending email to', recipient.email, error);
      throw error;
    }
  }

  return {
    ok: true,
    queued: sent,
    provider: 'resend',
    previewOnly: options.previewOnly ?? false,
  };
}
