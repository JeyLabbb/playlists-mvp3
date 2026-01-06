import { sendEmail } from './sendEmail';
import { pleiaTemplate } from './pleiaTemplate';

type FeaturedPlaylistEmailResult = {
  ok: boolean;
  error?: string;
};

type FeaturedPlaylistData = {
  playlistName: string;
  playlistUrl: string;
};

/**
 * Envía email al usuario cuando su playlist es destacada
 */
export async function sendFeaturedPlaylistEmail(
  userId: string,
  userEmail: string,
  data: FeaturedPlaylistData
): Promise<FeaturedPlaylistEmailResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://playlists.jeylabbb.com';
    const createPlaylistUrl = `${baseUrl}`;
    const playlistUrl = data.playlistUrl;

    const subject = '🎉 Tu playlist ha sido la destacada de la semana';

    const html = pleiaTemplate(
      '¡Enhorabuena! 🎉',
      `
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
          Tu playlist <strong>"${data.playlistName}"</strong> ha sido seleccionada como la <strong>Playlist Destacada de la Semana</strong> en PLEIA.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
          Está siendo mostrada en la home de PLEIA para que todos los usuarios puedan descubrirla.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
          Gracias por crear con PLEIA 💚
        </p>
      `,
      {
        label: 'Abrir mi playlist en Spotify',
        url: playlistUrl,
      },
      {
        label: 'Crear otra playlist',
        url: createPlaylistUrl,
      },
      userEmail,
      baseUrl
    );

    const result = await sendEmail({
      to: userEmail,
      subject,
      html,
    });

    if (!result.ok) {
      console.error('[FEATURED_EMAIL] Error sending email:', result.error);
      return { ok: false, error: result.error };
    }

    console.log('[FEATURED_EMAIL] ✅ Email enviado a:', userEmail);
    return { ok: true };

  } catch (error: any) {
    console.error('[FEATURED_EMAIL] Exception:', error);
    return { ok: false, error: error.message || 'Error desconocido' };
  }
}

