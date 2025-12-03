/**
 * Plantilla PLEIA - Diseño del mail de Founders (tarjeta azul)
 * Este es el diseño que se usa cuando template_mode = 'pleia'
 */

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type CTA = {
  label: string;
  url: string;
};

export function pleiaTemplate(
  title: string,
  body: string,
  primaryCta?: CTA | null,
  secondaryCta?: CTA | null,
  recipientEmail?: string | null,
  baseUrl?: string,
): string {
  return `
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
    <h2>${escapeHtml(title)}</h2>
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
      recipientEmail && baseUrl
        ? `<p style="margin-top: 20px; font-size: 11px; color: #999;">
            ¿Ya no quieres recibir información valiosa sobre nuevas funciones y actualizaciones exclusivas?
            <br /><span style="opacity:0.7;">(Otras personas estarán encantadas de descubrir lo que tú te pierdes 🤷)</span>
            <br /><a href="${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="color: #999; text-decoration: underline; font-size: 10px;">
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
}


