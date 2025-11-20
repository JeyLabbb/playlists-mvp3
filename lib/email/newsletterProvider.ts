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

const htmlWrapper = (
  labelText: string,
  body: string,
  primaryCta?: NewsletterCTA | null,
  secondaryCta?: NewsletterCTA | null,
) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(labelText)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 0 !important;
      }
      .block {
        padding: 24px !important;
      }
      .stack {
        display: block !important;
        width: 100% !important;
        padding: 0 !important;
      }
      .hero-title {
        font-size: 26px !important;
        line-height: 1.25 !important;
      }
      .cta-primary,
      .cta-secondary {
        width: 100% !important;
        text-align: center !important;
        display: block !important;
        box-sizing: border-box;
      }
    }
    body {
      background-color: #f4f6fb;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #04070d !important;
      }
    }
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
                      ${escapeHtml(labelText)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:20px;">
                    <div style="font-size:15px;line-height:1.75;color:${TEXT_SECONDARY};">
                      ${body}
                    </div>
                  </td>
                </tr>
                ${
                  primaryCta || secondaryCta
                    ? `
                <tr>
                  <td style="padding-top:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        ${
                          primaryCta
                            ? `<td class="stack" style="padding:0 12px 12px 0;">
                          <a href="${primaryCta.url}" class="cta-primary" style="display:inline-block;padding:14px 32px;background:${ACCENT};color:#07131d;border-radius:999px;font-weight:600;text-decoration:none;font-size:15px;">
                            ${escapeHtml(primaryCta.label)}
                          </a>
                        </td>`
                            : ''
                        }
                        ${
                          secondaryCta
                            ? `<td class="stack" style="padding:0 0 12px 12px;">
                          <a href="${secondaryCta.url}" class="cta-secondary" style="display:inline-block;padding:12px 20px;border-radius:14px;border:1px solid rgba(134,111,255,0.4);color:${ACCENT_ALT};font-weight:500;text-decoration:none;font-size:14px;">
                            ${escapeHtml(secondaryCta.label)} ↗
                          </a>
                        </td>`
                            : ''
                        }
                      </tr>
                    </table>
                  </td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="padding-top:24px;">
                    <div style="font-size:12px;color:${TEXT_MUTED};">
                      Novedades de PLEIA · próximos lanzamientos · accesos rápidos para volver al estudio.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px;">
                    <div style="font-size:12px;color:${TEXT_SECONDARY};line-height:1.6;">
                      ¿Quieres pausar estas comunicaciones? Gestiona tus preferencias desde la app de PLEIA.<br />
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
    .filter((item) => item !== null && typeof item === 'object' && 'email' in item && Boolean(item.email)) as NormalizedRecipient[];
}

function resolveBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.APP_URL) return process.env.APP_URL;
  return '';
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
}) {
  const baseHtml = htmlWrapper(params.labelText, params.body, params.primaryCta, params.secondaryCta);
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
  const fromAddress =
    process.env.RESEND_NEWSLETTER_FROM ||
    process.env.RESEND_FROM ||
    'PLEIA <pleia@jeylabbb.com>';

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
