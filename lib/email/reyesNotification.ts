import { sendEmail } from './sendEmail';
import { pleiaTemplate } from './pleiaTemplate';

type ReyesEmailResult = {
  ok: boolean;
  error?: string;
};

/**
 * Envía el email de Reyes con Founder Pass
 */
export async function sendReyesEmail(
  userId: string,
  userEmail: string
): Promise<ReyesEmailResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://playlists.jeylabbb.com';
    const createPlaylistUrl = `${baseUrl}`;

    const subject = 'Playlists IA infinitas gratis para ti — regalo de Reyes 🎁';

    const html = pleiaTemplate(
      'Hoy es Reyes… y tenemos un regalo para ti 🎁',
      `
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
          Desde hoy tienes playlists infinitas activadas en PLEIA.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
          Es nuestro pase especial <strong>(Founder Pass)</strong>:<br>
          sin límites, para siempre.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
          Lo hacemos porque fuiste de las primeras personas en probar PLEIA<br>
          y porque estamos en un momento muy bonito del proyecto.
        </p>
        
        <div style="background: #f8f9fa; border-left: 4px solid #36E2B4; padding: 20px; margin: 30px 0; border-radius: 4px;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0;">
            <strong>Durante este mes vamos a destacar playlists creadas por usuarios en la home de PLEIA.</strong>
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #666; margin: 15px 0 0 0;">
            Cada semana seleccionaremos una playlist creada con la IA<br>
            y la mostraremos públicamente, junto al perfil de quien la haya creado.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #666; margin: 15px 0 0 0;">
            Si te apetece aparecer ahí, es muy sencillo:<br>
            entra, escribe un prompt que de verdad te represente<br>
            y crea tu playlist.
          </p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
          La IA está ahora en su mejor momento.<br>
          Es un buen momento para probar ideas nuevas, prompts más específicos<br>
          o playlists que antes no te habías atrevido a crear.
        </p>
      `,
      {
        label: 'Crear mi playlist ahora',
        url: createPlaylistUrl,
      },
      null,
      userEmail,
      baseUrl
    );

    const result = await sendEmail({
      to: userEmail,
      subject,
      html,
    });

    if (!result.ok) {
      console.error('[REYES_EMAIL] Error sending email:', result.error);
      return { ok: false, error: result.error };
    }

    console.log('[REYES_EMAIL] ✅ Email enviado a:', userEmail);
    return { ok: true };

  } catch (error: any) {
    console.error('[REYES_EMAIL] Exception:', error);
    return { ok: false, error: error.message || 'Error desconocido' };
  }
}

