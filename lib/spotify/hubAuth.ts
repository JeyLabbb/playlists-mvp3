let cachedToken: {
  accessToken: string | null;
  expiresAt: number;
} = {
  accessToken: null,
  expiresAt: 0,
};

function ensureHubEnv() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.PLEIA_HUB_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Spotify hub environment variables. Ensure SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y PLEIA_HUB_REFRESH_TOKEN están configurados.'
    );
  }

  return { clientId, clientSecret, refreshToken };
}

export async function getHubAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();

  if (!forceRefresh && cachedToken.accessToken && now < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret, refreshToken } = ensureHubEnv();

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[SPOTIFY-HUB] Failed to refresh token:', data);
    throw new Error(data.error_description || 'No se pudo refrescar el token de Spotify Hub');
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return cachedToken.accessToken!;
}

