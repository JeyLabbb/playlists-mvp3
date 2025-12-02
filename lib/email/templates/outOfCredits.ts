/**
 * Email template for users who run out of credits
 * This email is sent only once when a user first attempts to generate a playlist with 0 remaining uses
 */

const BRAND_BG = '#04070d';
const CARD_BG = '#0c101f';
const TEXT_PRIMARY = '#eff4ff';
const TEXT_SECONDARY = 'rgba(239,244,255,0.85)';
const TEXT_MUTED = 'rgba(239,244,255,0.65)';
const ACCENT = '#22f6ce';

export function generateOutOfCreditsEmailHTML(pricingUrl: string = 'https://playlists.jeylabbb.com/pricing'): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Te has quedado sin playlists IA</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 0 !important;
      }
      .block {
        padding: 24px !important;
      }
      .text-large {
        font-size: 16px !important;
      }
      .cta-button {
        width: 100% !important;
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
            <td class="block" style="padding:40px;background:${CARD_BG};border-radius:24px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 25px 60px rgba(3,9,18,0.65);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- Logo/Brand -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="color:${ACCENT};font-size:24px;font-weight:700;letter-spacing:-0.02em;">
                      PLEIA
                    </div>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td>
                    <div style="font-size:17px;line-height:1.7;color:${TEXT_SECONDARY};">
                      <p style="margin:0 0 20px 0;font-size:18px;color:${TEXT_PRIMARY};font-weight:500;">
                        Hey,
                      </p>
                      
                      <p style="margin:0 0 20px 0;">
                        he visto que te has quedado sin usos en PLEIA.
                      </p>
                      
                      <p style="margin:0 0 20px 0;">
                        Y antes de que cierres la pestaña pensando "bueno, ya está", te cuento algo rápido.
                      </p>
                      
                      <p style="margin:0 0 20px 0;font-weight:500;color:${TEXT_PRIMARY};">
                        Hay un motivo por el que PLEIA te ha enganchado:
                      </p>
                      
                      <p style="margin:0 0 20px 0;">
                        <strong style="color:${TEXT_PRIMARY};">te ahorra tiempo, te inspira, y te crea playlists que tú no podrías hacer ni en media hora.</strong>
                      </p>
                      
                      <div style="height:20px;"></div>
                      
                      <p style="margin:0 0 20px 0;">
                        Y sé que jode quedarse justo en lo mejor.
                      </p>
                      
                      <p style="margin:0 0 20px 0;">
                        Ese momento de escribir un prompt y que <strong style="color:${TEXT_PRIMARY};">bam</strong>, aparece una playlist que encaja contigo.
                      </p>
                      
                      <p style="margin:0 0 20px 0;">
                        Esa sensación de: <em style="color:${TEXT_MUTED};">¿por qué ninguna plataforma había hecho esto antes?</em>
                      </p>
                      
                      <div style="height:20px;"></div>
                      
                      <p style="margin:0 0 20px 0;color:${TEXT_PRIMARY};">
                        Lo entiendo.
                      </p>
                      
                      <p style="margin:0 0 20px 0;">
                        Porque tú no estás buscando "más playlists".
                      </p>
                      
                      <p style="margin:0 0 20px 0;font-weight:500;color:${TEXT_PRIMARY};">
                        Estás buscando no perder tiempo, descubrir música nueva automáticamente y tener algo tuyo, sin comerte la cabeza.
                      </p>
                      
                      <p style="margin:0 0 20px 0;">
                        Por eso tienes dos caminos desde aquí (y ambos te desbloquean acceso ilimitado para siempre):
                      </p>
                      
                      <div style="height:12px;"></div>
                      
                      <!-- Option 1 -->
                      <div style="background:rgba(34,246,206,0.08);border:1px solid rgba(34,246,206,0.2);border-radius:16px;padding:20px;margin:0 0 16px 0;">
                        <p style="margin:0 0 12px 0;font-size:18px;font-weight:600;color:${ACCENT};">
                          👉 Opción 1 – Rápida
                        </p>
                        <p style="margin:0;color:${TEXT_SECONDARY};">
                          Invita a 3 amigos con tu enlace y listo. Acceso ilimitado de por vida.
                        </p>
                        <p style="margin:8px 0 0 0;color:${TEXT_MUTED};font-size:15px;">
                          (No pagas nada. Literal.)
                        </p>
                      </div>
                      
                      <!-- Option 2 -->
                      <div style="background:rgba(34,246,206,0.08);border:1px solid rgba(34,246,206,0.2);border-radius:16px;padding:20px;margin:0 0 24px 0;">
                        <p style="margin:0 0 12px 0;font-size:18px;font-weight:600;color:${ACCENT};">
                          👉 Opción 2 – Directa
                        </p>
                        <p style="margin:0;color:${TEXT_SECONDARY};">
                          Hazte founder por 5€ y accede para siempre. Sin límites. Sin mensualidades.
                        </p>
                        <p style="margin:8px 0 0 0;color:${TEXT_MUTED};font-size:15px;">
                          (Estás a un clic.)
                        </p>
                      </div>
                      
                      <!-- CTA -->
                      <div style="text-align:center;margin:32px 0;">
                        <a href="${pricingUrl}" class="cta-button" style="display:inline-block;padding:16px 40px;background:${ACCENT};color:#07131d;border-radius:999px;font-weight:600;text-decoration:none;font-size:17px;box-shadow:0 8px 24px rgba(34,246,206,0.35);">
                          Quiero playlists ilimitadas
                        </a>
                      </div>
                      
                      <div style="height:12px;"></div>
                      
                      <p style="margin:0 0 20px 0;color:${TEXT_MUTED};font-size:15px;">
                        📌 Elijas la opción que elijas, aquí continúas tu acceso.
                      </p>
                      
                      <p style="margin:0 0 20px 0;">
                        Y sí, esto es real: <strong style="color:${TEXT_PRIMARY};">solo los primeros miles tendrán acceso ilimitado.</strong>
                      </p>
                      
                      <p style="margin:0 0 20px 0;">
                        Después esto cambiará.
                      </p>
                      
                      <div style="height:20px;"></div>
                      
                      <p style="margin:0 0 20px 0;">
                        Así que, si PLEIA te ha gustado… aprovecha mientras sigue siendo tu ventaja.
                      </p>
                      
                      <p style="margin:0;font-weight:500;color:${TEXT_PRIMARY};">
                        Nos vemos dentro.
                      </p>
                      
                      <div style="height:32px;"></div>
                      
                      <p style="margin:0;color:${TEXT_MUTED};font-size:15px;">
                        — MTRYX, fundadores de PLEIA
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding-top:40px;border-top:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:13px;color:${TEXT_MUTED};line-height:1.6;">
                      © ${new Date().getFullYear()} PLEIA · Madrid, España<br />
                      Creando el futuro de las playlists con IA
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
  `.trim();
}

export function generateOutOfCreditsEmailText(): string {
  return `
Hey,

he visto que te has quedado sin usos en PLEIA.

Y antes de que cierres la pestaña pensando "bueno, ya está", te cuento algo rápido.

Hay un motivo por el que PLEIA te ha enganchado:

te ahorra tiempo, te inspira, y te crea playlists que tú no podrías hacer ni en media hora.



Y sé que jode quedarse justo en lo mejor.

Ese momento de escribir un prompt y que bam, aparece una playlist que encaja contigo.

Esa sensación de: ¿por qué ninguna plataforma había hecho esto antes?



Lo entiendo.

Porque tú no estás buscando "más playlists".

Estás buscando no perder tiempo, descubrir música nueva automáticamente y tener algo tuyo, sin comerte la cabeza.

Por eso tienes dos caminos desde aquí (y ambos te desbloquean acceso ilimitado para siempre):



👉 Opción 1 – Rápida

Invita a 3 amigos con tu enlace y listo. Acceso ilimitado de por vida.

(No pagas nada. Literal.)



👉 Opción 2 – Directa

Hazte founder por 5€ y accede para siempre. Sin límites. Sin mensualidades.

(Estás a un clic.)



📌 Elijas la opción que elijas, aquí continúas tu acceso:

👉 https://playlists.jeylabbb.com/pricing

Y sí, esto es real: solo los primeros miles tendrán acceso ilimitado.

Después esto cambiará.



Así que, si PLEIA te ha gustado… aprovecha mientras sigue siendo tu ventaja.

Nos vemos dentro.



— MTRYX, fundadores de PLEIA
  `.trim();
}

