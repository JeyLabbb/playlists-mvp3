// FIXPACK: Endpoint de status para verificar configuración sin llamadas reales a Spotify
// Permite validar que la sesión y configuración están correctas antes de generar playlists

import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth/config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    const status = {
      canCreateOnSpotify: false,
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      spotifyUserIdDetected: !!session?.user?.id,
      strategies: ["normal", "festival", "current"],
      featurePresetsLoaded: true,
      timestamp: new Date().toISOString()
    };

    // FIXPACK: Determina si puede crear playlists basado en sesión válida
    if (session?.accessToken && session?.user?.id) {
      status.canCreateOnSpotify = true;
    }

    return Response.json(status);
  } catch (error) {
    console.error('[STATUS] Error checking status:', error);
    return Response.json({
      canCreateOnSpotify: false,
      hasSession: false,
      hasAccessToken: false,
      spotifyUserIdDetected: false,
      strategies: ["normal", "festival", "current"],
      featurePresetsLoaded: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}